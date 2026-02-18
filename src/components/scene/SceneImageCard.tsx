"use client";

import { useState } from "react";
import Image from "next/image";
import type { SceneWithMedia, MediaStatus } from "@/types/database";

// 图片状态配置
const imageStatusConfig: Record<
  MediaStatus,
  { label: string; colorClass: string; bgColorClass: string }
> = {
  pending: {
    label: "待生成",
    colorClass: "text-zinc-500",
    bgColorClass: "bg-zinc-100 dark:bg-zinc-800",
  },
  processing: {
    label: "生成中",
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgColorClass: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  completed: {
    label: "已完成",
    colorClass: "text-green-600 dark:text-green-400",
    bgColorClass: "bg-green-50 dark:bg-green-900/20",
  },
  failed: {
    label: "生成失败",
    colorClass: "text-red-600 dark:text-red-400",
    bgColorClass: "bg-red-50 dark:bg-red-900/20",
  },
};

interface SceneImageCardProps {
  scene: SceneWithMedia;
  index: number;
  onRegenerate: (sceneId: string) => Promise<void>;
  onConfirm: (sceneId: string) => Promise<void>;
  isRegenerating?: boolean;
  isConfirming?: boolean;
}

export function SceneImageCard({
  scene,
  index,
  onRegenerate,
  onConfirm,
  isRegenerating = false,
  isConfirming = false,
}: SceneImageCardProps) {
  const [localRegenerating, setLocalRegenerating] = useState(false);
  const [localConfirming, setLocalConfirming] = useState(false);

  const isLoading = isRegenerating || isConfirming || localRegenerating || localConfirming;
  const imageStatus = scene.image_status;
  const isConfirmed = scene.image_confirmed;
  const statusConfig = imageStatusConfig[imageStatus];
  const hasImage = scene.image && scene.image.url;
  const isFailed = imageStatus === "failed";

  const handleRegenerate = async () => {
    setLocalRegenerating(true);
    try {
      await onRegenerate(scene.id);
    } catch (error) {
      console.error("Failed to regenerate image:", error);
    } finally {
      setLocalRegenerating(false);
    }
  };

  const handleConfirm = async () => {
    setLocalConfirming(true);
    try {
      await onConfirm(scene.id);
    } catch (error) {
      console.error("Failed to confirm image:", error);
    } finally {
      setLocalConfirming(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isConfirmed
          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
          : isFailed
          ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
          : "border-zinc-200 bg-card hover:border-primary dark:border-zinc-700"
      }`}
    >
      <div className="flex flex-col md:flex-row gap-4">
        {/* 分镜序号和状态 */}
        <div className="flex md:flex-col items-center gap-2 md:w-16 shrink-0">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              isConfirmed
                ? "bg-green-500 text-white"
                : isFailed
                ? "bg-red-500 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {isConfirmed ? (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : isFailed ? (
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              index + 1
            )}
          </span>
          <span
            className={`text-xs font-medium ${statusConfig.colorClass} ${statusConfig.bgColorClass} px-2 py-0.5 rounded`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 描述 */}
          <p className="text-sm text-foreground leading-relaxed mb-4 whitespace-pre-wrap">
            {scene.description}
          </p>

          {/* 图片区域 */}
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-4">
            {hasImage ? (
              <Image
                src={scene.image!.url}
                alt={`分镜 ${index + 1} 图片`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                {imageStatus === "processing" ? (
                  <div className="text-center">
                    <svg
                      className="h-8 w-8 animate-spin text-primary mx-auto mb-2"
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
                    <p className="text-sm text-muted-foreground">
                      正在生成图片...
                    </p>
                  </div>
                ) : imageStatus === "failed" ? (
                  <div className="text-center p-4">
                    <svg
                      className="h-10 w-10 text-red-500 mx-auto mb-3"
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
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                      图片生成失败
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      AI 服务暂时不可用，请稍后重试
                    </p>
                    <button
                      onClick={handleRegenerate}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                    >
                      {localRegenerating ? (
                        <>
                          <svg
                            className="h-3 w-3 animate-spin"
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
                          重试中...
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-3 w-3"
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
                          重新生成
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg
                      className="h-8 w-8 text-zinc-400 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground">等待生成</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 状态标签 */}
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                已确认
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <svg
                  className="h-3 w-3"
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
                需要重试
              </span>
            ) : (
              <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-1 text-xs text-muted-foreground dark:bg-zinc-800">
                {hasImage ? "待确认" : "待生成"}
              </span>
            )}

            {/* 重新生成按钮（有图片或失败时显示） */}
            {(hasImage || isFailed) && !isConfirmed && (
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                  isFailed
                    ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                    : "border-zinc-300 bg-background text-foreground hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                }`}
              >
                {localRegenerating ? (
                  <>
                    <svg
                      className="h-3 w-3 animate-spin"
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
                    {isFailed ? "重试中..." : "生成中..."}
                  </>
                ) : (
                  <>
                    <svg
                      className="h-3 w-3"
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
                    {isFailed ? "重新生成" : "重新生成"}
                  </>
                )}
              </button>
            )}

            {/* 确认按钮（有图片且未确认时显示） */}
            {hasImage && !isConfirmed && (
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {localConfirming ? (
                  <>
                    <svg
                      className="h-3 w-3 animate-spin"
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
                    确认中...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    确认
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
