"use client";

import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import Link from "next/link";

/**
 * 项目详情页错误边界
 * 捕获项目详情页中的错误
 */
export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 根据错误类型提供不同的处理
  const isNotFoundError =
    error.message?.toLowerCase().includes("not found") ||
    error.message?.toLowerCase().includes("404");

  const isAuthError =
    error.message?.toLowerCase().includes("unauthorized") ||
    error.message?.toLowerCase().includes("401") ||
    error.message?.toLowerCase().includes("access denied");

  if (isNotFoundError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg
              className="h-8 w-8 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            项目未找到
          </h2>
          <p className="mb-6 text-muted-foreground">
            您访问的项目不存在或已被删除。请返回项目列表查看您的其他项目。
          </p>
          <Link
            href="/projects"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回项目列表
          </Link>
        </div>
      </div>
    );
  }

  if (isAuthError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <svg
              className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            无访问权限
          </h2>
          <p className="mb-6 text-muted-foreground">
            您没有权限访问此项目。该项目可能属于其他用户，或者您需要登录才能访问。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              登录
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              我的项目
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 其他错误
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      title="加载项目失败"
      description="无法加载项目详情，请检查网络连接后重试。"
      resetButtonText="重新加载"
    />
  );
}
