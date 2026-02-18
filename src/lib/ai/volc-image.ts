/**
 * 火山引擎图片生成 API 封装
 * 用于调用 Seedream 模型进行图片生成
 */

import { retry } from "@/lib/utils";
import {
  type VolcImageGenerationRequest,
  type VolcImageGenerationResponse,
  AIGenerationError,
} from "@/types/ai";

// ==================== 配置 ====================

// 火山引擎图片生成 API 地址
const VOLC_IMAGE_API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 120000; // 120 seconds (图片生成可能较慢)

// 默认图片尺寸
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;

// ==================== 核心函数 ====================

/**
 * 获取火山引擎 API Key
 */
function getApiKey(): string {
  const apiKey = process.env.VOLCENGINE_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "VOLCENGINE_API_KEY 环境变量未配置",
      "volc-image"
    );
  }
  return apiKey;
}

/**
 * 图片生成请求接口（内部使用）
 */
interface ImageGenerationAPIRequest {
  model: string;
  prompt: string;
  size?: string;
  n?: number;
  response_format?: string;
}

/**
 * 图片生成响应接口（内部使用）
 */
interface ImageGenerationAPIResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/**
 * 图片生成错误响应
 */
interface ImageGenerationErrorResponse {
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}

/**
 * 发送图片生成请求
 */
async function imageGenerationRequest(
  request: ImageGenerationAPIRequest
): Promise<ImageGenerationAPIResponse> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(VOLC_IMAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        size: request.size || `${DEFAULT_WIDTH}x${DEFAULT_HEIGHT}`,
        n: request.n || 1,
        response_format: request.response_format || "url",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `API 请求失败: ${response.status}`;
      try {
        const errorData = (await response.json()) as ImageGenerationErrorResponse;
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // 忽略解析错误
      }
      throw new AIGenerationError(errorMessage, "volc-image", {
        status: response.status,
      });
    }

    return (await response.json()) as ImageGenerationAPIResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new AIGenerationError("图片生成请求超时", "volc-image", error);
      }
      throw new AIGenerationError(
        `图片生成请求失败: ${error.message}`,
        "volc-image",
        error
      );
    }

    throw new AIGenerationError(
      "图片生成请求发生未知错误",
      "volc-image",
      error
    );
  }
}

/**
 * 构建图片生成 Prompt
 * 将场景描述和风格组合成适合图片生成的 prompt
 */
function buildImagePrompt(description: string, style?: string): string {
  if (!style) {
    return description;
  }

  // 将风格信息融入 prompt
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

  // 构建尺寸字符串
  const width = request.width || DEFAULT_WIDTH;
  const height = request.height || DEFAULT_HEIGHT;
  const size = `${width}x${height}`;

  // 使用默认模型
  const model = process.env.VOLCENGINE_IMAGE_MODEL || "seedream-1";

  const apiRequest: ImageGenerationAPIRequest = {
    model,
    prompt,
    size,
    n: 1,
    response_format: "url",
  };

  try {
    const response = await retry(
      () => imageGenerationRequest(apiRequest),
      MAX_RETRIES,
      RETRY_DELAY
    );

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new AIGenerationError(
        "图片生成响应中没有返回图片 URL",
        "volc-image",
        response
      );
    }

    // 生成任务 ID（用于追踪）
    const taskId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
      "volc-image",
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
  // 火山引擎 API 每次调用都会生成不同的结果，直接调用生成即可
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
    concurrency?: number; // 并发数，默认为 3
  }
): Promise<VolcImageGenerationResponse[]> {
  const concurrency = options?.concurrency || 3;
  const results: VolcImageGenerationResponse[] = [];

  // 分批处理请求
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
        "volc-image",
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
      throw new AIGenerationError("下载图片超时", "volc-image", error);
    }

    throw new AIGenerationError(
      `下载图片失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "volc-image",
      error
    );
  }
}

// ==================== 导出类型 ====================

export type {
  VolcImageGenerationRequest,
  VolcImageGenerationResponse,
};
