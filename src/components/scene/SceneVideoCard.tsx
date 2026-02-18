"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { SceneWithMedia, MediaStatus } from "@/types/database";

// 视频状态配置
const videoStatusConfig: Record<
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
    colorClass: "text-purple-600 dark:text-purple-400",
    bgColorClass: "bg-purple-50 dark:bg-purple-900/20",
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

interface SceneVideoCardProps {
  scene: SceneWithMedia;
  index: number;
  onRegenerate: (sceneId: string) => Promise<void>;
  onConfirm: (sceneId: string) => Promise<void>;
  isRegenerating?: boolean;
  isConfirming?: boolean;
  processingCount?: number;
}

export function SceneVideoCard({
  scene,
  index,
  onRegenerate,
  onConfirm,
  isRegenerating = false,
  isConfirming = false,
  processingCount = 0,
}: SceneVideoCardProps) {
  const [localRegenerating, setLocalRegenerating] = useState(false);
  const [localConfirming, setLocalConfirming] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const isLoading = isRegenerating || isConfirming || localRegenerating || localConfirming;
  const videoStatus = scene.video_status;
  const isConfirmed = scene.video_confirmed;
  const statusConfig = videoStatusConfig[videoStatus];
  const hasImage = scene.image && scene.image.url;
  const hasVideo = scene.video && scene.video.url;
  const isProcessing = videoStatus === "processing";

  // 处理中时显示经过时间
  useEffect(() => {
    if (isProcessing) {
      // 如果刚开始处理，记录开始时间
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      // 不再处理时清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isProcessing]);

  // 格式化时间显示
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRegenerate = async () => {
    setLocalRegenerating(true);
    try {
      await onRegenerate(scene.id);
    } catch (error) {
      console.error("Failed to regenerate video:", error);
    } finally {
      setLocalRegenerating(false);
    }
  };

  const handleConfirm = async () => {
    setLocalConfirming(true);
    try {
      await onConfirm(scene.id);
    } catch (error) {
      console.error("Failed to confirm video:", error);
    } finally {
      setLocalConfirming(false);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isConfirmed
          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
          : "border-zinc-200 bg-card hover:border-primary dark:border-zinc-700"
      }`}
    >
      <div className="flex flex-col gap-4">
        {/* 分镜序号和状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                isConfirmed
                  ? "bg-green-500 text-white"
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
              ) : (
                index + 1
              )}
            </span>
            <span className="text-sm font-medium text-foreground">
              分镜 {index + 1}
            </span>
          </div>
          <span
            className={`text-xs font-medium ${statusConfig.colorClass} ${statusConfig.bgColorClass} px-2 py-0.5 rounded`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* 描述 */}
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {scene.description}
        </p>

        {/* 媒体区域：图片和视频并排显示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 图片区域 */}
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {hasImage ? (
              <Image
                src={scene.image!.url}
                alt={`分镜 ${index + 1} 图片`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">暂无图片</p>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
              图片
            </div>
          </div>

          {/* 视频区域 */}
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {hasVideo ? (
              <>
                <video
                  src={scene.video!.url}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded pointer-events-none">
                  视频
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                {videoStatus === "processing" ? (
                  <div className="text-center p-4">
                    {/* 进度动画 */}
                    <div className="relative h-16 w-16 mx-auto mb-3">
                      {/* 外圈旋转动画 */}
                      <svg
                        className="h-16 w-16 animate-spin text-purple-500"
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
                      {/* 脉冲效果 */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 bg-purple-500 rounded-full animate-ping opacity-25" />
                      </div>
                      {/* 中心图标 */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="h-6 w-6 text-purple-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    {/* 状态文字 */}
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                      正在生成视频...
                    </p>
                    {/* 经过时间 */}
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>已用时 {formatElapsedTime(elapsedTime)}</span>
                    </div>
                    {/* 进度提示 */}
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <div className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-pulse" />
                      <span>每 5 秒自动刷新状态</span>
                    </div>
                    {/* 批量处理提示 */}
                    {processingCount > 1 && (
                      <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                        同时生成 {processingCount} 个视频中
                      </p>
                    )}
                  </div>
                ) : videoStatus === "failed" ? (
                  <div className="text-center">
                    <svg
                      className="h-8 w-8 text-red-500 mx-auto mb-2"
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
                    <p className="text-sm text-red-500">生成失败</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      请点击重新生成
                    </p>
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
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground">等待生成</p>
                  </div>
                )}
              </div>
            )}
          </div>
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
          ) : (
            <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-1 text-xs text-muted-foreground dark:bg-zinc-800">
              {hasVideo ? "待确认" : "待生成"}
            </span>
          )}

          {/* 重新生成按钮（有视频或失败时显示） */}
          {(hasVideo || videoStatus === "failed") && !isConfirmed && (
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
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
                  生成中...
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
          )}

          {/* 确认按钮（有视频且未确认时显示） */}
          {hasVideo && !isConfirmed && (
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

          {/* 自动刷新状态指示器 */}
          {isProcessing && (
            <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 animate-pulse">
              <div className="h-2 w-2 bg-purple-500 rounded-full" />
              自动更新中
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
