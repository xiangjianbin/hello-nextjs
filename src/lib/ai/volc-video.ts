/**
 * 火山引擎视频生成 API 封装
 * 用于调用 Seedance 模型进行视频生成
 */

import { retry } from "@/lib/utils";
import {
  type VolcVideoGenerationRequest,
  type VolcVideoGenerationResponse,
  type VolcVideoTaskStatus,
  AIGenerationError,
} from "@/types/ai";

// ==================== 配置 ====================

// 火山引擎视频生成 API 地址
const VOLC_VIDEO_API_URL = "https://ark.cn-beijing.volces.com/api/v3/videos/generations";

// 视频任务状态查询 API 地址
const VOLC_VIDEO_TASK_API_URL = "https://ark.cn-beijing.volces.com/api/v3/videos/tasks";

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 60000; // 60 seconds (创建任务较快)
const STATUS_TIMEOUT = 30000; // 30 seconds (状态查询)

// 默认视频参数
const DEFAULT_DURATION = 5; // 5 秒

// ==================== 核心函数 ====================

/**
 * 获取火山引擎 API Key
 */
function getApiKey(): string {
  const apiKey = process.env.VOLCENGINE_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "VOLCENGINE_API_KEY 环境变量未配置",
      "volc-video"
    );
  }
  return apiKey;
}

/**
 * 视频生成请求接口（内部使用）
 */
interface VideoGenerationAPIRequest {
  model: string;
  image_url: string;
  prompt?: string;
  duration?: number;
  aspect_ratio?: string;
}

/**
 * 视频生成响应接口（内部使用）
 */
interface VideoGenerationAPIResponse {
  created: number;
  data: Array<{
    task_id: string;
    status: string;
  }>;
}

/**
 * 视频任务状态响应接口（内部使用）
 */
interface VideoTaskStatusAPIResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at?: number;
  updated_at?: number;
  video_url?: string;
  duration?: number;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * 视频生成错误响应
 */
interface VideoGenerationErrorResponse {
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}

/**
 * 发送视频生成请求
 */
async function videoGenerationRequest(
  request: VideoGenerationAPIRequest
): Promise<VideoGenerationAPIResponse> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(VOLC_VIDEO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        image_url: request.image_url,
        prompt: request.prompt,
        duration: request.duration || DEFAULT_DURATION,
        aspect_ratio: request.aspect_ratio || "16:9",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `API 请求失败: ${response.status}`;
      try {
        const errorData = (await response.json()) as VideoGenerationErrorResponse;
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // 忽略解析错误
      }
      throw new AIGenerationError(errorMessage, "volc-video", {
        status: response.status,
      });
    }

    return (await response.json()) as VideoGenerationAPIResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new AIGenerationError("视频生成请求超时", "volc-video", error);
      }
      throw new AIGenerationError(
        `视频生成请求失败: ${error.message}`,
        "volc-video",
        error
      );
    }

    throw new AIGenerationError(
      "视频生成请求发生未知错误",
      "volc-video",
      error
    );
  }
}

/**
 * 查询视频任务状态请求
 */
async function videoTaskStatusRequest(
  taskId: string
): Promise<VideoTaskStatusAPIResponse> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STATUS_TIMEOUT);

  try {
    const response = await fetch(`${VOLC_VIDEO_TASK_API_URL}/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `查询视频任务状态失败: ${response.status}`;
      try {
        const errorData = (await response.json()) as VideoGenerationErrorResponse;
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // 忽略解析错误
      }
      throw new AIGenerationError(errorMessage, "volc-video", {
        status: response.status,
        taskId,
      });
    }

    return (await response.json()) as VideoTaskStatusAPIResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new AIGenerationError("查询视频任务状态超时", "volc-video", error);
      }
      throw new AIGenerationError(
        `查询视频任务状态失败: ${error.message}`,
        "volc-video",
        error
      );
    }

    throw new AIGenerationError(
      "查询视频任务状态发生未知错误",
      "volc-video",
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
  // 获取默认模型
  const model = process.env.VOLCENGINE_VIDEO_MODEL || "seedance-1";

  const apiRequest: VideoGenerationAPIRequest = {
    model,
    image_url: request.image_url,
    prompt: request.prompt,
  };

  try {
    const response = await retry(
      () => videoGenerationRequest(apiRequest),
      MAX_RETRIES,
      RETRY_DELAY
    );

    const taskId = response.data[0]?.task_id;
    if (!taskId) {
      throw new AIGenerationError(
        "视频生成响应中没有返回任务 ID",
        "volc-video",
        response
      );
    }

    return {
      task_id: taskId,
    };
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `创建视频任务失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "volc-video",
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
      () => videoTaskStatusRequest(taskId),
      MAX_RETRIES,
      RETRY_DELAY
    );

    return {
      task_id: response.task_id,
      status: response.status,
      video_url: response.video_url,
      duration: response.duration,
      error: response.error?.message,
    };
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `查询视频任务状态失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "volc-video",
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
        "volc-video",
        status
      );
    }

    // 等待下一次轮询
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new AIGenerationError(
    `视频生成超时: 等待超过 ${maxWaitTime / 1000} 秒`,
    "volc-video",
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
  // 火山引擎 API 每次调用都会生成不同的结果，直接调用创建即可
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
    concurrency?: number; // 并发数，默认为 2（视频生成消耗资源较大）
  }
): Promise<VolcVideoGenerationResponse[]> {
  const concurrency = options?.concurrency || 2;
  const results: VolcVideoGenerationResponse[] = [];

  // 分批处理请求
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
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout (视频文件较大)

  try {
    const response = await fetch(videoUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new AIGenerationError(
        `下载视频失败: ${response.status}`,
        "volc-video",
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
      throw new AIGenerationError("下载视频超时", "volc-video", error);
    }

    throw new AIGenerationError(
      `下载视频失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "volc-video",
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
