/**
 * AI 相关类型定义
 */

// ==================== 智谱AI 类型 ====================

/**
 * 智谱AI 模型类型
 */
export type ZhipuModel =
  | "glm-4-flash"
  | "glm-4"
  | "glm-4-plus"
  | "glm-4-air"
  | "glm-4-airx"
  | "glm-4-long";

/**
 * 智谱AI 消息角色
 */
export type ZhipuMessageRole = "system" | "user" | "assistant";

/**
 * 智谱AI 消息
 */
export interface ZhipuMessage {
  role: ZhipuMessageRole;
  content: string;
}

/**
 * 智谱AI Chat Completion 请求参数
 */
export interface ZhipuChatCompletionRequest {
  model: ZhipuModel;
  messages: ZhipuMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * 智谱AI Chat Completion 响应
 */
export interface ZhipuChatCompletionResponse {
  id: string;
  created: number;
  model: string;
  choices: {
    index: number;
    finish_reason: string;
    message: ZhipuMessage;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 智谱AI 错误响应
 */
export interface ZhipuErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ==================== 分镜生成类型 ====================

/**
 * 分镜描述
 */
export interface SceneDescription {
  order_index: number;
  description: string;
  visual_prompt?: string; // 用于图片生成的视觉提示
}

/**
 * 故事转分镜请求
 */
export interface StoryToScenesRequest {
  story: string;
  style: string;
  sceneCount?: number; // 期望的分镜数量，默认自动判断
}

/**
 * 故事转分镜响应
 */
export interface StoryToScenesResponse {
  scenes: SceneDescription[];
  title?: string; // AI 生成的项目标题
}

// ==================== 火山引擎 类型 ====================

/**
 * 图片生成状态
 */
export type ImageGenerationStatus = "pending" | "processing" | "completed" | "failed";

/**
 * 视频生成状态
 */
export type VideoGenerationStatus = "pending" | "processing" | "completed" | "failed";

/**
 * 火山引擎图片生成请求
 */
export interface VolcImageGenerationRequest {
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
}

/**
 * 火山引擎图片生成响应
 */
export interface VolcImageGenerationResponse {
  image_url: string;
  task_id: string;
}

/**
 * 火山引擎视频生成请求
 */
export interface VolcVideoGenerationRequest {
  image_url: string;
  prompt?: string;
}

/**
 * 火山引擎视频生成响应
 */
export interface VolcVideoGenerationResponse {
  task_id: string;
}

/**
 * 火山引擎视频任务状态
 */
export interface VolcVideoTaskStatus {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  duration?: number;
  error?: string;
}

// ==================== 通用 AI 类型 ====================

/**
 * AI 服务配置
 */
export interface AIServiceConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

/**
 * AI 生成错误
 */
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public readonly provider: "zhipu" | "volc-image" | "volc-video",
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}
