"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

interface SceneGeneratorProps {
  projectId: string;
}

export function SceneGenerator({ projectId }: SceneGeneratorProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState<string>("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgressText("正在连接 AI 服务...");

    // Simulate progress updates
    const progressSteps = [
      { delay: 2000, text: "正在分析故事内容..." },
      { delay: 5000, text: "正在拆分场景..." },
      { delay: 10000, text: "正在生成分镜描述..." },
      { delay: 15000, text: "正在优化输出..." },
    ];

    const timers: NodeJS.Timeout[] = [];
    progressSteps.forEach(({ delay, text }) => {
      const timer = setTimeout(() => {
        setProgressText(text);
      }, delay);
      timers.push(timer);
    });

    try {
      const response = await fetch("/api/generate/scenes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate scenes");
      }

      setProgressText("生成完成，正在刷新页面...");

      // 刷新页面以显示新分镜
      router.refresh();
    } catch (err) {
      console.error("Error generating scenes:", err);
      setError(
        err instanceof Error ? err.message : "生成失败，请重试"
      );
    } finally {
      // Clear all timers
      timers.forEach((timer) => clearTimeout(timer));
      setIsGenerating(false);
      setProgressText("");
    }
  };

  return (
    <div className="text-center py-12">
      {isGenerating ? (
        // Loading state
        <div className="space-y-6">
          {/* Animated spinner */}
          <div className="relative h-20 w-20 mx-auto">
            <div className="absolute inset-0">
              <Spinner size="xl" className="text-primary h-full w-full" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🎬</span>
            </div>
          </div>

          {/* Progress text */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">
              正在生成分镜
            </h3>
            <p className="text-sm text-muted-foreground animate-pulse">
              {progressText}
            </p>
          </div>

          {/* Progress bar animation */}
          <div className="max-w-xs mx-auto">
            <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-loading-bar" />
            </div>
          </div>

          {/* Hint text */}
          <p className="text-xs text-muted-foreground">
            AI 正在根据您的故事生成分镜描述，请耐心等待...
          </p>
        </div>
      ) : (
        // Default state
        <>
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            准备好生成分镜了！
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            点击下方按钮，AI 将根据您的故事自动拆分成分镜描述。
            您可以在生成后编辑和确认每个分镜。
          </p>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 max-w-md mx-auto rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400">
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
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            生成分镜
          </button>

          <p className="mt-4 text-xs text-muted-foreground">
            生成过程可能需要 10-30 秒，请耐心等待
          </p>
        </>
      )}
    </div>
  );
}
