"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SceneWithMedia, MediaStatus } from "@/types/database";
import { SceneImageCard } from "./SceneImageCard";

interface SceneImageListProps {
  projectId: string;
  scenes: SceneWithMedia[];
  onScenesUpdate?: (scenes: SceneWithMedia[]) => void;
}

export function SceneImageList({
  projectId,
  scenes: initialScenes,
  onScenesUpdate,
}: SceneImageListProps) {
  const router = useRouter();
  const [scenes, setScenes] = useState(initialScenes);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 计算状态统计
  const totalCount = scenes.length;
  const completedCount = scenes.filter((s) => s.image_status === "completed").length;
  const confirmedCount = scenes.filter((s) => s.image_confirmed).length;
  const allConfirmed = confirmedCount === totalCount && totalCount > 0;
  const allGenerated = completedCount === totalCount && totalCount > 0;
  const pendingCount = scenes.filter((s) => s.image_status === "pending").length;

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

  // 生成单个图片
  const handleGenerateImage = useCallback(
    async (sceneId: string) => {
      setError(null);

      // 更新本地状态为 processing
      updateLocalScene(sceneId, { image_status: "processing" as MediaStatus });

      try {
        const response = await fetch(`/api/generate/image/${sceneId}`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate image");
        }

        const { image } = await response.json();

        // 更新本地状态
        updateLocalScene(sceneId, {
          image_status: "completed" as MediaStatus,
          image: image,
        });

        // 刷新页面数据
        router.refresh();
      } catch (err) {
        console.error("Error generating image:", err);
        updateLocalScene(sceneId, { image_status: "failed" as MediaStatus });
        setError(
          err instanceof Error ? err.message : "生成图片失败，请重试"
        );
        throw err;
      }
    },
    [updateLocalScene, router]
  );

  // 确认单个图片
  const handleConfirmImage = useCallback(
    async (sceneId: string) => {
      setError(null);
      try {
        const response = await fetch(`/api/scenes/${sceneId}/confirm-image`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to confirm image");
        }

        await response.json();
        updateLocalScene(sceneId, { image_confirmed: true });

        // 刷新页面数据
        router.refresh();
      } catch (err) {
        console.error("Error confirming image:", err);
        setError(
          err instanceof Error ? err.message : "确认失败，请重试"
        );
        throw err;
      }
    },
    [updateLocalScene, router]
  );

  // 生成所有图片
  const handleGenerateAll = async () => {
    if (pendingCount === 0) {
      setError("没有待生成的图片（所有图片已生成或正在处理中）");
      return;
    }

    setIsGeneratingAll(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate images");
      }

      const { results, failedCount } = await response.json();

      // 更新本地状态
      setScenes((prev) => {
        const updated = prev.map((scene) => {
          const result = results.find((r: { sceneId: string }) => r.sceneId === scene.id);
          if (result) {
            return {
              ...scene,
              image_status: (result.success ? "completed" : "failed") as MediaStatus,
              image: result.image || scene.image,
            };
          }
          return scene;
        });
        onScenesUpdate?.(updated);
        return updated;
      });

      // 刷新页面数据
      router.refresh();

      if (failedCount > 0) {
        setError(`生成完成，但 ${failedCount} 张图片失败`);
      }
    } catch (err) {
      console.error("Error generating all images:", err);
      setError(
        err instanceof Error ? err.message : "批量生成失败，请重试"
      );
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // 确认所有图片
  const handleConfirmAll = async () => {
    setIsConfirmingAll(true);
    setError(null);

    try {
      const response = await fetch("/api/scenes/confirm-all-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to confirm all images");
      }

      // 更新所有场景为已确认
      setScenes((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          image_confirmed: true,
        }));
        onScenesUpdate?.(updated);
        return updated;
      });

      // 刷新页面数据（更新项目阶段）
      router.refresh();
    } catch (err) {
      console.error("Error confirming all images:", err);
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
        <div className="text-4xl mb-4">🖼️</div>
        <p className="text-muted-foreground mb-4">
          还没有分镜，请先生成分镜描述
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部：生成所有图片按钮 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          <span>
            已生成 {completedCount} / {totalCount} 张图片，
          </span>
          <span className="ml-1">
            已确认 {confirmedCount} / {totalCount} 张
          </span>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={handleGenerateAll}
            disabled={isGeneratingAll || isConfirmingAll}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingAll ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
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
                  className="h-4 w-4"
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
                生成所有图片
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
            className="h-full rounded-full bg-primary transition-all duration-300"
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

      {/* 图片卡片列表 */}
      <div className="space-y-4">
        {scenes.map((scene, index) => (
          <SceneImageCard
            key={scene.id}
            scene={scene}
            index={index}
            onRegenerate={handleGenerateImage}
            onConfirm={handleConfirmImage}
          />
        ))}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        {/* 确认所有图片 */}
        <button
          onClick={handleConfirmAll}
          disabled={isConfirmingAll || isGeneratingAll || allConfirmed || !allGenerated}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirmingAll ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
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
              确认所有图片
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
              <p className="font-medium">所有图片已确认！</p>
              <p className="mt-1 text-green-600 dark:text-green-500">
                现在可以进入视频生成阶段。
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
              <p className="font-medium">部分图片尚未生成</p>
              <p className="mt-1 text-yellow-600 dark:text-yellow-500">
                还有 {totalCount - completedCount} 张图片等待生成，点击「生成所有图片」或单独生成每张图片。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
