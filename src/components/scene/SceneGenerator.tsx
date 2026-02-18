"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SceneGeneratorProps {
  projectId: string;
}

export function SceneGenerator({ projectId }: SceneGeneratorProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

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

      // 刷新页面以显示新分镜
      router.refresh();
    } catch (err) {
      console.error("Error generating scenes:", err);
      setError(
        err instanceof Error ? err.message : "生成失败，请重试"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="text-center py-12">
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
        disabled={isGenerating}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            正在生成分镜...
          </>
        ) : (
          <>
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
          </>
        )}
      </button>

      <p className="mt-4 text-xs text-muted-foreground">
        生成过程可能需要 10-30 秒，请耐心等待
      </p>
    </div>
  );
}
