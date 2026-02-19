/**
 * 阿里云百炼 通义万象 视频生成 API 封装
 * 用于调用 wanx 图生视频模型
 *
 * 文档: https://help.aliyun.com/document_detail/2756931.html
 */

import { retry } from "@/lib/utils";
import {
  type VolcVideoGenerationRequest,
  type VolcVideoGenerationResponse,
  type VolcVideoTaskStatus,
  AIGenerationError,
} from "@/types/ai";

// ==================== 配置 ====================

// 阿里云 DashScope 图生视频 API 地址
const ALIYUN_VIDEO_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis";
// 阿里云 DashScope 任务状态查询 API 地址
const ALIYUN_TASK_API_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 60000; // 60 seconds (创建任务)
const STATUS_TIMEOUT = 30000; // 30 seconds (状态查询)

// ==================== 核心函数 ====================

/**
 * 获取阿里云 API Key
 */
function getApiKey(): string {
  const apiKey = process.env.ALIYUN_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "ALIYUN_API_KEY 环境变量未配置",
      "aliyun-video"
    );
  }
  return apiKey;
}

/**
 * 视频生成请求接口（内部使用）
 */
interface AliyunVideoGenerationRequest {
  model: string;
  input: {
    img_url: string;
    prompt?: string;
  };
  parameters?: {
    duration?: number;
    resolution?: string;
    prompt_extend?: boolean;
    watermark?: boolean;
  };
}

/**
 * 视频生成响应接口（内部使用）
 */
interface AliyunVideoGenerationResponse {
  request_id: string;
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
    video_url?: string;
    duration?: number;
    message?: string;
  };
}

/**
 * 任务状态查询响应
 */
interface AliyunVideoTaskStatusResponse {
  request_id: string;
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "UNKNOWN";
    video_url?: string;
    duration?: number;
    message?: string;
  };
}

/**
 * 视频生成错误响应
 */
interface VideoGenerationErrorResponse {
  code?: string;
  message?: string;
  request_id?: string;
}

/**
 * 发送视频生成请求
 */
async function submitVideoGenerationTask(
  request: AliyunVideoGenerationRequest
): Promise<string> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(ALIYUN_VIDEO_API_URL, {
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
        const errorData = (await response.json()) as VideoGenerationErrorResponse;
        console.error('Aliyun Video API error response:', JSON.stringify(errorData, null, 2));
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new AIGenerationError(errorMessage, "aliyun-video", {
        status: response.status,
      });
    }

    const result = (await response.json()) as AliyunVideoGenerationResponse;

    // 返回任务ID
    return result.output.task_id;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new AIGenerationError("视频生成请求超时", "aliyun-video", error);
      }
      throw new AIGenerationError(
        `视频生成请求失败: ${error.message}`,
        "aliyun-video",
        error
      );
    }

    throw new AIGenerationError(
      "视频生成请求发生未知错误",
      "aliyun-video",
      error
    );
  }
}

/**
 * 查询视频任务状态
 */
async function queryVideoTaskStatus(
  taskId: string
): Promise<AliyunVideoTaskStatusResponse> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STATUS_TIMEOUT);

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
      let errorMessage = `查询视频任务状态失败: ${response.status}`;
      try {
        const errorData = (await response.json()) as VideoGenerationErrorResponse;
        errorMessage = errorData.message || errorMessage;
      } catch {
        // 忽略解析错误
      }
      throw new AIGenerationError(errorMessage, "aliyun-video", {
        status: response.status,
        taskId,
      });
    }

    return (await response.json()) as AliyunVideoTaskStatusResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AIGenerationError("查询视频任务状态超时", "aliyun-video", error);
    }

    throw new AIGenerationError(
      `查询视频任务状态失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "aliyun-video",
      error
    );
  }
}

// ==================== 导出函数 ====================

/**
 * 创建视频生成任务
 *
 * @param request - 视频生成请求参数
 * @returns 视频生成响应，包含任务 ID
 */
export async function createVideoTask(
  request: VolcVideoGenerationRequest
): Promise<VolcVideoGenerationResponse> {
  // 获取模型名称 - 使用阿里云图生视频模型
  const model = process.env.ALIYUN_VIDEO_MODEL || "wanx2.1-i2v-plus";

  const apiRequest: AliyunVideoGenerationRequest = {
    model,
    input: {
      img_url: request.image_url,
      prompt: request.prompt,
    },
    parameters: {
      duration: 5, // 默认5秒视频
      resolution: "720P", // 使用 720P 更便宜
      prompt_extend: true, // 开启智能改写
      watermark: false,
    },
  };

  try {
    const taskId = await retry(
      () => submitVideoGenerationTask(apiRequest),
      MAX_RETRIES,
      RETRY_DELAY
    );

    return {
      task_id: taskId,
    };
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `创建视频任务失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "aliyun-video",
      error
    );
  }
}

/**
 * 查询视频任务状态
 *
 * @param taskId - 视频任务 ID
 * @returns 视频任务状态
 */
export async function getVideoTaskStatus(
  taskId: string
): Promise<VolcVideoTaskStatus> {
  try {
    const response = await retry(
      () => queryVideoTaskStatus(taskId),
      MAX_RETRIES,
      RETRY_DELAY
    );

    // 转换状态格式
    let status: "pending" | "processing" | "completed" | "failed";
    switch (response.output.task_status) {
      case "PENDING":
      case "RUNNING":
        status = "processing";
        break;
      case "SUCCEEDED":
        status = "completed";
        break;
      case "FAILED":
        status = "failed";
        break;
      default:
        status = "pending";
    }

    return {
      task_id: response.output.task_id,
      status,
      video_url: response.output.video_url,
      duration: response.output.duration,
      error: response.output.message,
    };
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `查询视频任务状态失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "aliyun-video",
      error
    );
  }
}

/**
 * 等待视频生成完成
 *
 * @param taskId - 视频任务 ID
 * @param options - 等待选项
 * @returns 视频任务状态
 */
export async function waitForVideoCompletion(
  taskId: string,
  options?: {
    pollInterval?: number; // 轮询间隔（毫秒），默认 5000
    maxWaitTime?: number; // 最大等待时间（毫秒），默认 600000 (10 分钟)
    onStatusChange?: (status: VolcVideoTaskStatus) => void; // 状态变化回调
  }
): Promise<VolcVideoTaskStatus> {
  const pollInterval = options?.pollInterval || 5000; // 5 秒
  const maxWaitTime = options?.maxWaitTime || 600000; // 10 分钟
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await getVideoTaskStatus(taskId);

    // 调用状态变化回调
    options?.onStatusChange?.(status);

    if (status.status === "completed") {
      return status;
    }

    if (status.status === "failed") {
      throw new AIGenerationError(
        `视频生成失败: ${status.error || "未知错误"}`,
        "aliyun-video",
        status
      );
    }

    // 等待下一次轮询
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new AIGenerationError(
    `视频生成超时: 等待超过 ${maxWaitTime / 1000} 秒`,
    "aliyun-video",
    { taskId, elapsed: Date.now() - startTime }
  );
}

/**
 * 根据图片 URL 生成视频
 *
 * @param imageUrl - 图片 URL
 * @param prompt - 可选的提示词（用于描述视频内容）
 * @returns 视频生成响应
 */
export async function generateVideoFromImage(
  imageUrl: string,
  prompt?: string
): Promise<VolcVideoGenerationResponse> {
  return createVideoTask({
    image_url: imageUrl,
    prompt,
  });
}

/**
 * 重新生成视频
 * 使用相同的参数重新生成视频（结果会不同）
 *
 * @param imageUrl - 图片 URL
 * @param prompt - 可选的提示词
 * @returns 视频生成响应
 */
export async function regenerateVideo(
  imageUrl: string,
  prompt?: string
): Promise<VolcVideoGenerationResponse> {
  return generateVideoFromImage(imageUrl, prompt);
}

/**
 * 批量创建视频生成任务
 *
 * @param requests - 视频生成请求列表
 * @param options - 批量选项
 * @returns 视频生成响应列表
 */
export async function createVideoTasks(
  requests: VolcVideoGenerationRequest[],
  options?: {
    concurrency?: number; // 并发数，默认为 1
  }
): Promise<VolcVideoGenerationResponse[]> {
  const concurrency = options?.concurrency || 1;
  const results: VolcVideoGenerationResponse[] = [];

  // 顺序处理请求
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((request) => createVideoTask(request))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * 下载视频并返回 Buffer
 *
 * @param videoUrl - 视频 URL
 * @returns 视频 Buffer
 */
export async function downloadVideo(videoUrl: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout

  try {
    const response = await fetch(videoUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AIGenerationError(
        `下载视频失败: ${response.status}`,
        "aliyun-video",
        { status: response.status, url: videoUrl }
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
      throw new AIGenerationError("下载视频超时", "aliyun-video", error);
    }

    throw new AIGenerationError(
      `下载视频失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "aliyun-video",
      error
    );
  }
}

// ==================== 导出类型 ====================

export type {
  VolcVideoGenerationRequest,
  VolcVideoGenerationResponse,
  VolcVideoTaskStatus,
};
