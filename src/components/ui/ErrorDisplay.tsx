"use client";

import { useEffect } from "react";

interface ErrorDisplayProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  showReset?: boolean;
  resetButtonText?: string;
}

/**
 * 错误显示组件
 * 用于显示友好的错误信息并提供重试选项
 */
export function ErrorDisplay({
  error,
  reset,
  title = "出错了",
  description,
  showReset = true,
  resetButtonText = "重试",
}: ErrorDisplayProps) {
  useEffect(() => {
    // 可以在这里记录错误到错误报告服务
    console.error("Error caught:", error);
  }, [error]);

  // 获取友好的错误信息
  const getErrorMessage = () => {
    if (description) return description;

    // 常见错误的友好提示
    if (error.message?.includes("fetch")) {
      return "网络连接失败，请检查您的网络连接后重试。";
    }
    if (error.message?.includes("timeout")) {
      return "请求超时，请稍后重试。";
    }
    if (error.message?.includes("unauthorized") || error.message?.includes("401")) {
      return "您没有权限执行此操作，请登录后重试。";
    }
    if (error.message?.includes("not found") || error.message?.includes("404")) {
      return "您请求的资源不存在。";
    }

    return error.message || "发生了一个未知错误，请稍后重试。";
  };

  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        {/* 错误图标 */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-8 w-8 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* 标题 */}
        <h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2>

        {/* 错误描述 */}
        <p className="mb-6 text-muted-foreground">{getErrorMessage()}</p>

        {/* 操作按钮 */}
        {showReset && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {resetButtonText}
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              返回首页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
