"use client";

import { ErrorDisplay } from "@/components/ui/ErrorDisplay";

/**
 * 全局错误页面
 * 捕获整个应用程序中未被处理的错误
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased font-sans">
        <div className="min-h-screen bg-background">
          <ErrorDisplay
            error={error}
            reset={reset}
            title="应用程序错误"
            description="抱歉，应用程序遇到了一个错误。我们的团队已经收到通知，请尝试刷新页面。"
          />
        </div>
      </body>
    </html>
  );
}
