"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SceneWithMedia } from "@/types/database";
import { SceneDescriptionCard } from "./SceneDescriptionCard";

interface SceneDescriptionListProps {
  projectId: string;
  scenes: SceneWithMedia[];
  onScenesUpdate?: (scenes: SceneWithMedia[]) => void;
}

export function SceneDescriptionList({
  projectId,
  scenes: initialScenes,
  onScenesUpdate,
}: SceneDescriptionListProps) {
  const router = useRouter();
  const [scenes, setScenes] = useState(initialScenes);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 计算确认状态
  const confirmedCount = scenes.filter((s) => s.description_confirmed).length;
  const totalCount = scenes.length;
  const allConfirmed = confirmedCount === totalCount && totalCount > 0;

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

  // 确认单个分镜描述
  const handleConfirm = useCallback(
    async (sceneId: string) => {
      setError(null);
      try {
        const response = await fetch(
          `/api/scenes/${sceneId}/confirm-description`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to confirm description");
        }

        await response.json();
        updateLocalScene(sceneId, { description_confirmed: true });

        // 刷新页面数据
        router.refresh();
      } catch (err) {
        console.error("Error confirming description:", err);
        setError(
          err instanceof Error ? err.message : "确认失败，请重试"
        );
        throw err;
      }
    },
    [updateLocalScene, router]
  );

  // 更新分镜描述
  const handleUpdate = useCallback(
    async (sceneId: string, description: string) => {
      setError(null);
      try {
        const response = await fetch(`/api/scenes/${sceneId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update description");
        }

        const { scene } = await response.json();
        updateLocalScene(sceneId, { description: scene.description });

        // 刷新页面数据
        router.refresh();
      } catch (err) {
        console.error("Error updating description:", err);
        setError(
          err instanceof Error ? err.message : "更新失败，请重试"
        );
        throw err;
      }
    },
    [updateLocalScene, router]
  );

  // 重新生成分镜
  const handleRegenerate = async () => {
    if (
      !confirm(
        "重新生成分镜将删除当前所有分镜，确定要继续吗？"
      )
    ) {
      return;
    }

    setIsRegenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/generate/scenes/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to regenerate scenes");
      }

      const { scenes: newScenes } = await response.json();
      setScenes(newScenes);
      onScenesUpdate?.(newScenes);

      // 刷新页面数据
      router.refresh();
    } catch (err) {
      console.error("Error regenerating scenes:", err);
      setError(
        err instanceof Error ? err.message : "重新生成失败，请重试"
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  // 确认所有分镜描述
  const handleConfirmAll = async () => {
    setIsConfirmingAll(true);
    setError(null);
    try {
      const response = await fetch("/api/scenes/confirm-all-descriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to confirm all descriptions");
      }

      // 更新所有场景为已确认
      setScenes((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          description_confirmed: true,
        }));
        onScenesUpdate?.(updated);
        return updated;
      });

      // 刷新页面数据（更新项目阶段）
      router.refresh();
    } catch (err) {
      console.error("Error confirming all descriptions:", err);
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
    <div className="space-y-4">
      {/* 进度指示 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          已确认 {confirmedCount} / {totalCount} 个分镜
        </div>
        {allConfirmed && (
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
            所有分镜已确认
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
        />
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

      {/* 分镜卡片列表 */}
      <div className="space-y-3">
        {scenes.map((scene, index) => (
          <SceneDescriptionCard
            key={scene.id}
            scene={scene}
            index={index}
            onConfirm={handleConfirm}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        {/* 重新生成分镜 */}
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating || isConfirmingAll}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          {isRegenerating ? (
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
              重新生成中...
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              重新生成分镜
            </>
          )}
        </button>

        {/* 确认所有分镜 */}
        <button
          onClick={handleConfirmAll}
          disabled={isConfirmingAll || isRegenerating || allConfirmed}
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
              确认所有分镜
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
              <p className="font-medium">所有分镜描述已确认！</p>
              <p className="mt-1 text-green-600 dark:text-green-500">
                点击下方按钮进入图片生成阶段。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
