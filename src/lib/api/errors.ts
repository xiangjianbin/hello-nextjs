import { NextResponse } from "next/server";

/**
 * API 错误响应格式
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * API 成功响应格式
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 认证错误 (1xxx)
  UNAUTHORIZED = "AUTH_001",
  FORBIDDEN = "AUTH_002",
  INVALID_TOKEN = "AUTH_003",
  SESSION_EXPIRED = "AUTH_004",

  // 请求错误 (2xxx)
  BAD_REQUEST = "REQ_001",
  VALIDATION_ERROR = "REQ_002",
  MISSING_FIELD = "REQ_003",
  INVALID_FORMAT = "REQ_004",

  // 资源错误 (3xxx)
  NOT_FOUND = "RES_001",
  PROJECT_NOT_FOUND = "RES_002",
  SCENE_NOT_FOUND = "RES_003",
  MEDIA_NOT_FOUND = "RES_004",

  // 业务逻辑错误 (4xxx)
  INVALID_STAGE = "BIZ_001",
  SCENE_NOT_CONFIRMED = "BIZ_002",
  IMAGE_NOT_GENERATED = "BIZ_003",
  VIDEO_NOT_GENERATED = "BIZ_004",
  GENERATION_IN_PROGRESS = "BIZ_005",

  // 外部服务错误 (5xxx)
  AI_SERVICE_ERROR = "EXT_001",
  STORAGE_ERROR = "EXT_002",
  EXTERNAL_API_ERROR = "EXT_003",

  // 服务器错误 (9xxx)
  INTERNAL_ERROR = "SRV_001",
  DATABASE_ERROR = "SRV_002",
  UNKNOWN_ERROR = "SRV_999",
}

/**
 * 错误代码对应的消息
 */
const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: "请先登录",
  [ErrorCode.FORBIDDEN]: "无访问权限",
  [ErrorCode.INVALID_TOKEN]: "无效的身份凭证",
  [ErrorCode.SESSION_EXPIRED]: "会话已过期，请重新登录",

  [ErrorCode.BAD_REQUEST]: "请求格式错误",
  [ErrorCode.VALIDATION_ERROR]: "数据验证失败",
  [ErrorCode.MISSING_FIELD]: "缺少必填字段",
  [ErrorCode.INVALID_FORMAT]: "数据格式错误",

  [ErrorCode.NOT_FOUND]: "资源不存在",
  [ErrorCode.PROJECT_NOT_FOUND]: "项目不存在或无权访问",
  [ErrorCode.SCENE_NOT_FOUND]: "分镜不存在或无权访问",
  [ErrorCode.MEDIA_NOT_FOUND]: "媒体文件不存在",

  [ErrorCode.INVALID_STAGE]: "项目当前阶段不允许此操作",
  [ErrorCode.SCENE_NOT_CONFIRMED]: "分镜描述尚未确认",
  [ErrorCode.IMAGE_NOT_GENERATED]: "图片尚未生成",
  [ErrorCode.VIDEO_NOT_GENERATED]: "视频尚未生成",
  [ErrorCode.GENERATION_IN_PROGRESS]: "内容正在生成中",

  [ErrorCode.AI_SERVICE_ERROR]: "AI 服务暂时不可用",
  [ErrorCode.STORAGE_ERROR]: "文件存储服务错误",
  [ErrorCode.EXTERNAL_API_ERROR]: "外部服务暂时不可用",

  [ErrorCode.INTERNAL_ERROR]: "服务器内部错误",
  [ErrorCode.DATABASE_ERROR]: "数据库操作失败",
  [ErrorCode.UNKNOWN_ERROR]: "未知错误",
};

/**
 * HTTP 状态码对应关系
 */
const statusCodeMap: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,

  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.MISSING_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,

  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.PROJECT_NOT_FOUND]: 404,
  [ErrorCode.SCENE_NOT_FOUND]: 404,
  [ErrorCode.MEDIA_NOT_FOUND]: 404,

  [ErrorCode.INVALID_STAGE]: 400,
  [ErrorCode.SCENE_NOT_CONFIRMED]: 400,
  [ErrorCode.IMAGE_NOT_GENERATED]: 400,
  [ErrorCode.VIDEO_NOT_GENERATED]: 400,
  [ErrorCode.GENERATION_IN_PROGRESS]: 409,

  [ErrorCode.AI_SERVICE_ERROR]: 502,
  [ErrorCode.STORAGE_ERROR]: 502,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,

  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * 创建 API 错误响应
 */
export function apiError(
  code: ErrorCode,
  customMessage?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const statusCode = statusCodeMap[code] || 500;
  const message = customMessage || errorMessages[code] || "未知错误";

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 创建 API 成功响应
 */
export function apiSuccess<T>(
  data: T,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}

/**
 * 创建 API 成功响应（带状态码）
 */
export function apiSuccessWithStatus<T>(
  data: T,
  statusCode: number,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 解析 API 错误响应（前端使用）
 */
export function parseApiError(error: unknown): {
  code: string;
  message: string;
} {
  if (typeof error === "object" && error !== null) {
    const apiError = error as { error?: { code?: string; message?: string } };
    if (apiError.error) {
      return {
        code: apiError.error.code || ErrorCode.UNKNOWN_ERROR,
        message: apiError.error.message || "未知错误",
      };
    }
  }

  if (error instanceof Error) {
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
    };
  }

  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: "未知错误",
  };
}

/**
 * 便捷函数：创建常见错误响应
 */
export const apiErrors = {
  unauthorized: () => apiError(ErrorCode.UNAUTHORIZED),
  forbidden: () => apiError(ErrorCode.FORBIDDEN),
  badRequest: (message?: string) => apiError(ErrorCode.BAD_REQUEST, message),
  notFound: (message?: string) => apiError(ErrorCode.NOT_FOUND, message),
  projectNotFound: () => apiError(ErrorCode.PROJECT_NOT_FOUND),
  sceneNotFound: () => apiError(ErrorCode.SCENE_NOT_FOUND),
  internalError: (details?: unknown) => apiError(ErrorCode.INTERNAL_ERROR, undefined, details),
  aiServiceError: (details?: unknown) => apiError(ErrorCode.AI_SERVICE_ERROR, undefined, details),
  storageError: (details?: unknown) => apiError(ErrorCode.STORAGE_ERROR, undefined, details),
};
