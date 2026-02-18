"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SceneWithMedia, MediaStatus } from "@/types/database";
import { SceneVideoCard } from "./SceneVideoCard";
import { Spinner } from "@/components/ui/Spinner";

interface SceneVideoListProps {
  projectId: string;
  scenes: SceneWithMedia[];
  onScenesUpdate?: (scenes: SceneWithMedia[]) => void;
}

export function SceneVideoList({
  projectId,
  scenes: initialScenes,
  onScenesUpdate,
}: SceneVideoListProps) {
  const router = useRouter();
  const [scenes, setScenes] = useState(initialScenes);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // 计算状态统计
  const totalCount = scenes.length;
  const completedCount = scenes.filter((s) => s.video_status === "completed").length;
  const confirmedCount = scenes.filter((s) => s.video_confirmed).length;
  const allConfirmed = confirmedCount === totalCount && totalCount > 0;
  const allGenerated = completedCount === totalCount && totalCount > 0;
  const pendingCount = scenes.filter(
    (s) => s.video_status === "pending" || s.video_status === "failed"
  ).length;
  const processingCount = scenes.filter((s) => s.video_status === "processing").length;

  // 更新本地场景数据
  const updateLocalScene = useCallback(
    (sceneId: string, updates: Partial<SceneWithMedia>) => {
      setScenes((prev) => {
        const updated = prev.map((s) =>
          s.id === sceneId ? { ...s, ...updates } : s
        );
        onScenesUpdate?.(updated);
        return updated;
      });
    },
    [onScenesUpdate]
  );

  // 轮询单个视频状态
  const pollVideoStatus = useCallback(
    async (sceneId: string, taskId: string) => {
      try {
        const response = await fetch(`/api/generate/video/status/${taskId}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to poll video status");
        }

        const { status, video } = await response.json();

        // 更新本地状态
        if (status === "completed" && video) {
          updateLocalScene(sceneId, {
            video_status: "completed" as MediaStatus,
            video: video,
          });
        } else if (status === "failed") {
          updateLocalScene(sceneId, {
            video_status: "failed" as MediaStatus,
          });
        }
        // processing 状态继续轮询（由全局轮询处理）
      } catch (err) {
        console.error("Error polling video status:", err);
      }
    },
    [updateLocalScene]
  );

  // 开始全局轮询（处理所有 processing 状态的视频）
  const startGlobalPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    setPollingActive(true);
    console.log("[Polling] Started global polling for video status");

    pollingRef.current = setInterval(async () => {
      // 获取当前处理中的场景
      setScenes((currentScenes) => {
        const processingScenes = currentScenes.filter(
          (s) => s.video_status === "processing" && s.video?.task_id
        );

        if (processingScenes.length === 0) {
          // 没有正在处理的视频，停止轮询
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setPollingActive(false);
          console.log("[Polling] Stopped - no more processing videos");
          // 刷新页面数据
          router.refresh();
          return currentScenes;
        }

        // 轮询所有处理中的视频
        processingScenes.forEach((scene) => {
          if (scene.video?.task_id) {
            pollVideoStatus(scene.id, scene.video.task_id);
          }
        });

        return currentScenes;
      });
    }, 5000); // 每5秒轮询一次
  }, [pollVideoStatus, router]);

  // 当有 processing 状态的视频时自动开始轮询
  useEffect(() => {
    if (processingCount > 0 && !pollingRef.current) {
      startGlobalPolling();
    }
    return () => {
      if (pollingRef.current && processingCount === 0) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPollingActive(false);
      }
    };
  }, [processingCount, startGlobalPolling]);

  // 生成单个视频
  const handleGenerateVideo = useCallback(
    async (sceneId: string) => {
      setError(null);

      // 更新本地状态为 processing
      updateLocalScene(sceneId, { video_status: "processing" as MediaStatus });

      try {
        const response = await fetch(`/api/generate/video/${sceneId}`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate video");
        }

        const { video, taskId } = await response.json();

        // 更新本地状态
        updateLocalScene(sceneId, {
          video_status: "processing" as MediaStatus,
          video: video,
        });

        // 开始轮询
        if (taskId && !pollingRef.current) {
          startGlobalPolling();
        }
      } catch (err) {
        console.error("Error generating video:", err);
        updateLocalScene(sceneId, { video_status: "failed" as MediaStatus });
        setError(
          err instanceof Error ? err.message : "生成视频失败，请重试"
        );
        throw err;
      }
    },
    [updateLocalScene, startGlobalPolling]
  );

  // 确认单个视频
  const handleConfirmVideo = useCallback(
    async (sceneId: string) => {
      setError(null);
      try {
        const response = await fetch(`/api/scenes/${sceneId}/confirm-video`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to confirm video");
        }

        await response.json();
        updateLocalScene(sceneId, { video_confirmed: true });

        // 刷新页面数据
        router.refresh();
      } catch (err) {
        console.error("Error confirming video:", err);
        setError(
          err instanceof Error ? err.message : "确认失败，请重试"
        );
        throw err;
      }
    },
    [updateLocalScene, router]
  );

  // 生成所有视频
  const handleGenerateAll = async () => {
    if (pendingCount === 0) {
      setError("没有待生成的视频（所有视频已生成或正在处理中）");
      return;
    }

    setIsGeneratingAll(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate videos");
      }

      const { results, failedCount } = await response.json();

      // 更新本地状态
      setScenes((prev) => {
        const updated = prev.map((scene) => {
          const result = results.find((r: { sceneId: string }) => r.sceneId === scene.id);
          if (result) {
            return {
              ...scene,
              video_status: (result.success ? "processing" : "failed") as MediaStatus,
              video: result.video || scene.video,
            };
          }
          return scene;
        });
        onScenesUpdate?.(updated);
        return updated;
      });

      // 开始全局轮询
      startGlobalPolling();

      if (failedCount > 0) {
        setError(`生成完成，但 ${failedCount} 个视频任务创建失败`);
      }
    } catch (err) {
      console.error("Error generating all videos:", err);
      setError(
        err instanceof Error ? err.message : "批量生成失败，请重试"
      );
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // 确认所有视频
  const handleConfirmAll = async () => {
    setIsConfirmingAll(true);
    setError(null);

    try {
      const response = await fetch("/api/scenes/confirm-all-videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to confirm all videos");
      }

      // 更新所有场景为已确认
      setScenes((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          video_confirmed: true,
        }));
        onScenesUpdate?.(updated);
        return updated;
      });

      // 刷新页面数据（更新项目阶段）
      router.refresh();
    } catch (err) {
      console.error("Error confirming all videos:", err);
      setError(
        err instanceof Error ? err.message : "确认失败，请重试"
      );
    } finally {
      setIsConfirmingAll(false);
    }
  };

  if (scenes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🎬</div>
        <p className="text-muted-foreground mb-4">
          还没有分镜，请先生成分镜描述
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部：生成所有视频按钮 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          <span>
            已生成 {completedCount} / {totalCount} 个视频，
          </span>
          <span className="ml-1">
            已确认 {confirmedCount} / {totalCount} 个
          </span>
          {processingCount > 0 && (
            <span className="ml-1 text-purple-600 dark:text-purple-400">
              （{processingCount} 个生成中）
            </span>
          )}
        </div>
        {pendingCount > 0 && (
          <button
            onClick={handleGenerateAll}
            disabled={isGeneratingAll || isConfirmingAll}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingAll ? (
              <>
                <Spinner size="sm" />
                生成中...
              </>
            ) : (
              <>
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                生成所有视频
              </>
            )}
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>生成进度</span>
          <span>{Math.round((completedCount / totalCount) * 100)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
        {allGenerated && !allConfirmed && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>确认进度</span>
            <span>{Math.round((confirmedCount / totalCount) * 100)}%</span>
          </div>
        )}
        {allGenerated && !allConfirmed && (
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
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

      {/* 视频卡片列表 */}
      <div className="space-y-4">
        {scenes.map((scene, index) => (
          <SceneVideoCard
            key={scene.id}
            scene={scene}
            index={index}
            onRegenerate={handleGenerateVideo}
            onConfirm={handleConfirmVideo}
            processingCount={processingCount}
          />
        ))}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        {/* 确认所有视频 */}
        <button
          onClick={handleConfirmAll}
          disabled={isConfirmingAll || isGeneratingAll || allConfirmed || !allGenerated}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirmingAll ? (
            <>
              <Spinner size="sm" />
              确认中...
            </>
          ) : (
            <>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              确认所有视频
            </>
          )}
        </button>
      </div>

      {/* 提示信息 */}
      {allConfirmed && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-green-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-green-700 dark:text-green-400">
              <p className="font-medium">🎉 项目已完成！</p>
              <p className="mt-1 text-green-600 dark:text-green-500">
                所有视频已确认，项目创作流程结束。您可以下载视频或重新编辑任意分镜。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 未完成提示 */}
      {!allGenerated && completedCount > 0 && completedCount < totalCount && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-yellow-500 mt-0.5"
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
            <div className="text-sm text-yellow-700 dark:text-yellow-400">
              <p className="font-medium">部分视频尚未生成</p>
              <p className="mt-1 text-yellow-600 dark:text-yellow-500">
                还有 {totalCount - completedCount} 个视频等待生成，点击「生成所有视频」或单独生成每个视频。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 视频生成提示 */}
      {processingCount > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 flex items-center justify-center">
              <div className="h-3 w-3 bg-purple-500 rounded-full animate-pulse" />
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-400">
              <div className="flex items-center gap-2">
                <p className="font-medium">视频生成中</p>
                {pollingActive && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded-full">
                    <div className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-pulse" />
                    自动刷新
                  </span>
                )}
              </div>
              <p className="mt-1 text-purple-600 dark:text-purple-500">
                正在生成 {processingCount} 个视频，视频生成通常需要 1-3 分钟。
              </p>
              <p className="mt-1 text-purple-500 dark:text-purple-600 text-xs">
                每 5 秒自动检查生成状态
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
