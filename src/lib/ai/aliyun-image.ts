/**
 * 阿里云百炼 通义万象 图片生成 API 封装
 * 用于调用 wanx 模型进行图片生成
 *
 * 文档: https://help.aliyun.com/document_detail/2712453.html
 */

import { retry } from "@/lib/utils";
import {
  type VolcImageGenerationRequest,
  type VolcImageGenerationResponse,
  AIGenerationError,
} from "@/types/ai";

// ==================== 配置 ====================

// 阿里云 DashScope 图片生成 API 地址
const ALIYUN_IMAGE_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
// 阿里云 DashScope 任务状态查询 API 地址
const ALIYUN_TASK_API_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 120000; // 120 seconds (图片生成可能较慢)

// 默认图片尺寸
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;

// ==================== 核心函数 ====================

/**
 * 获取阿里云 API Key
 */
function getApiKey(): string {
  const apiKey = process.env.ALIYUN_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "ALIYUN_API_KEY 环境变量未配置",
      "aliyun-image"
    );
  }
  return apiKey;
}

/**
 * 风格映射 - 将应用风格转换为通义万象风格参数
 */
const STYLE_MAPPING: Record<string, string> = {
  "realistic": "<photograph>", // 写实
  "anime": "<anime>", // 动漫
  "3d-cartoon": "<3d cartoon>", // 3D卡通
  "watercolor": "<watercolor>", // 水彩
  "oil_painting": "<oil painting>", // 油画
  "sketch": "<sketch>", // 素描
  "cyberpunk": "<cyberpunk>", // 赛博朋克
  "fantasy": "<fantasy art>", // 奇幻
};

/**
 * 图片生成请求接口（内部使用）
 * V2 版本 API 格式
 */
interface AliyunImageGenerationRequest {
  model: string;
  input: {
    prompt: string;
    negative_prompt?: string;
  };
  parameters?: {
    size?: string;
    n?: number;
    seed?: number;
    prompt_extend?: boolean;
    watermark?: boolean;
  };
}

/**
 * 图片生成响应接口（内部使用）
 */
interface AliyunImageGenerationResponse {
  request_id: string;
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
    results?: Array<{
      url: string;
    }>;
    message?: string;
  };
}

/**
 * 任务状态查询响应
 */
interface AliyunTaskStatusResponse {
  request_id: string;
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
    results?: Array<{
      url: string;
    }>;
    message?: string;
  };
}

/**
 * 图片生成错误响应
 */
interface ImageGenerationErrorResponse {
  code?: string;
  message?: string;
  request_id?: string;
}

/**
 * 发送图片生成请求（异步任务模式）
 */
async function submitImageGenerationTask(
  request: AliyunImageGenerationRequest
): Promise<string> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(ALIYUN_IMAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable", // 启用异步模式
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `API 请求失败: ${response.status}`;
      try {
        const errorData = (await response.json()) as ImageGenerationErrorResponse;
        errorMessage = errorData.message || errorMessage;
      } catch {
        // 忽略解析错误
      }
      throw new AIGenerationError(errorMessage, "aliyun-image", {
        status: response.status,
      });
    }

    const result = (await response.json()) as AliyunImageGenerationResponse;

    // 返回任务ID用于后续查询
    return result.output.task_id;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new AIGenerationError("图片生成请求超时", "aliyun-image", error);
      }
      throw new AIGenerationError(
        `图片生成请求失败: ${error.message}`,
        "aliyun-image",
        error
      );
    }

    throw new AIGenerationError(
      "图片生成请求发生未知错误",
      "aliyun-image",
      error
    );
  }
}

/**
 * 查询任务状态
 */
async function queryTaskStatus(taskId: string): Promise<AliyunTaskStatusResponse> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${ALIYUN_TASK_API_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `查询任务状态失败: ${response.status}`;
      try {
        const errorData = (await response.json()) as ImageGenerationErrorResponse;
        errorMessage = errorData.message || errorMessage;
      } catch {
        // 忽略解析错误
      }
      throw new AIGenerationError(errorMessage, "aliyun-image", {
        status: response.status,
        taskId,
      });
    }

    return (await response.json()) as AliyunTaskStatusResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AIGenerationError("查询任务状态超时", "aliyun-image", error);
    }

    throw new AIGenerationError(
      `查询任务状态失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "aliyun-image",
      error
    );
  }
}

/**
 * 等待任务完成
 */
async function waitForTaskCompletion(
  taskId: string,
  maxWaitTime: number = 120000 // 2分钟
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 3000; // 3秒轮询一次

  while (Date.now() - startTime < maxWaitTime) {
    const status = await queryTaskStatus(taskId);

    if (status.output.task_status === "SUCCEEDED") {
      const imageUrl = status.output.results?.[0]?.url;
      if (!imageUrl) {
        throw new AIGenerationError(
          "图片生成成功但未返回图片URL",
          "aliyun-image",
          status
        );
      }
      return imageUrl;
    }

    if (status.output.task_status === "FAILED") {
      throw new AIGenerationError(
        `图片生成失败: ${status.output.message || "未知错误"}`,
        "aliyun-image",
        status
      );
    }

    // 等待下一次轮询
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new AIGenerationError(
    `图片生成超时: 等待超过 ${maxWaitTime / 1000} 秒`,
    "aliyun-image",
    { taskId, elapsed: Date.now() - startTime }
  );
}

/**
 * 构建图片生成 Prompt
 * 将场景描述和风格组合成适合图片生成的 prompt
 */
function buildImagePrompt(description: string, style?: string): string {
  if (!style) {
    return description;
  }

  // 获取风格标签
  const styleTag = STYLE_MAPPING[style] || "";

  // 将风格标签融入 prompt
  if (styleTag) {
    return `${styleTag}, ${description}, high quality, detailed, 4k`;
  }

  return `${description}, ${style} style, high quality, detailed`;
}

/**
 * 生成图片
 *
 * @param request - 图片生成请求参数
 * @returns 图片生成响应，包含图片 URL 和任务 ID
 */
export async function generateImage(
  request: VolcImageGenerationRequest
): Promise<VolcImageGenerationResponse> {
  // 构建 prompt
  const prompt = buildImagePrompt(request.prompt, request.style);

  // 构建尺寸字符串 (通义万象支持: 720*1280, 1280*720, 1024*1024)
  const width = request.width || DEFAULT_WIDTH;
  const height = request.height || DEFAULT_HEIGHT;

  // 转换尺寸格式
  let size = "1024*1024";
  if (width > height) {
    size = "1280*720";
  } else if (height > width) {
    size = "720*1280";
  }

  // 获取模型名称
  const model = process.env.ALIYUN_IMAGE_MODEL || "wanx-v1";

  const apiRequest: AliyunImageGenerationRequest = {
    model,
    input: {
      prompt,
      negative_prompt: "low quality, blurry, distorted, ugly, bad anatomy",
    },
    parameters: {
      size,
      n: 1,
      prompt_extend: true, // V2 版本支持智能改写
      watermark: false,
      seed: Math.floor(Math.random() * 1000000),
    },
  };

  try {
    // 提交任务
    const taskId = await retry(
      () => submitImageGenerationTask(apiRequest),
      MAX_RETRIES,
      RETRY_DELAY
    );

    // 等待任务完成
    const imageUrl = await waitForTaskCompletion(taskId);

    return {
      image_url: imageUrl,
      task_id: taskId,
    };
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `图片生成失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "aliyun-image",
      error
    );
  }
}

/**
 * 重新生成图片
 * 使用相同的参数重新生成图片（结果会不同）
 *
 * @param request - 图片生成请求参数
 * @returns 图片生成响应
 */
export async function regenerateImage(
  request: VolcImageGenerationRequest
): Promise<VolcImageGenerationResponse> {
  // 使用不同的 seed 重新生成
  return generateImage(request);
}

/**
 * 根据分镜描述生成图片
 *
 * @param description - 分镜描述
 * @param visualPrompt - 视觉提示（可选，如果提供则优先使用）
 * @param style - 风格（可选）
 * @param options - 其他选项
 * @returns 图片生成响应
 */
export async function generateSceneImage(
  description: string,
  visualPrompt?: string,
  style?: string,
  options?: {
    width?: number;
    height?: number;
  }
): Promise<VolcImageGenerationResponse> {
  // 优先使用视觉提示，否则使用描述
  const prompt = visualPrompt || description;

  return generateImage({
    prompt,
    style,
    width: options?.width,
    height: options?.height,
  });
}

/**
 * 批量生成图片
 *
 * @param requests - 图片生成请求列表
 * @param options - 批量选项
 * @returns 图片生成响应列表
 */
export async function generateImages(
  requests: VolcImageGenerationRequest[],
  options?: {
    concurrency?: number; // 并发数，默认为 1（阿里云建议顺序调用）
  }
): Promise<VolcImageGenerationResponse[]> {
  const concurrency = options?.concurrency || 1;
  const results: VolcImageGenerationResponse[] = [];

  // 顺序处理请求（阿里云API建议顺序调用以避免限流）
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((request) => generateImage(request))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * 下载图片并返回 Buffer
 *
 * @param imageUrl - 图片 URL
 * @returns 图片 Buffer
 */
export async function downloadImage(imageUrl: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AIGenerationError(
        `下载图片失败: ${response.status}`,
        "aliyun-image",
        { status: response.status, url: imageUrl }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AIGenerationError("下载图片超时", "aliyun-image", error);
    }

    throw new AIGenerationError(
      `下载图片失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "aliyun-image",
      error
    );
  }
}

// ==================== 导出类型 ====================

export type {
  VolcImageGenerationRequest,
  VolcImageGenerationResponse,
};
