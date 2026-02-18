"use client";

import { useState } from "react";
import type { Scene } from "@/types/database";

interface SceneDescriptionCardProps {
  scene: Scene;
  index: number;
  onConfirm: (sceneId: string) => Promise<void>;
  onUpdate: (sceneId: string, description: string) => Promise<void>;
  isConfirming?: boolean;
  isUpdating?: boolean;
}

export function SceneDescriptionCard({
  scene,
  index,
  onConfirm,
  onUpdate,
  isConfirming = false,
  isUpdating = false,
}: SceneDescriptionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(scene.description);
  const [localUpdating, setLocalUpdating] = useState(false);
  const [localConfirming, setLocalConfirming] = useState(false);

  const isLoading = isConfirming || isUpdating || localUpdating || localConfirming;
  const isConfirmed = scene.description_confirmed;

  const handleSaveEdit = async () => {
    if (editDescription.trim() === scene.description) {
      setIsEditing(false);
      return;
    }

    setLocalUpdating(true);
    try {
      await onUpdate(scene.id, editDescription.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update description:", error);
      // Reset to original on error
      setEditDescription(scene.description);
    } finally {
      setLocalUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditDescription(scene.description);
    setIsEditing(false);
  };

  const handleConfirm = async () => {
    setLocalConfirming(true);
    try {
      await onConfirm(scene.id);
    } catch (error) {
      console.error("Failed to confirm description:", error);
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
      <div className="flex items-start gap-3">
        {/* 分镜序号 */}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
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

        {/* 描述内容 */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full min-h-[100px] rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-zinc-600"
                placeholder="输入分镜描述..."
                disabled={isLoading}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isLoading || editDescription.trim() === ""}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {localUpdating ? (
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
                      保存中...
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
                      保存
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {scene.description}
              </p>

              {/* 操作按钮 */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    待确认
                  </span>
                )}

                {/* 编辑按钮（未确认时显示） */}
                {!isConfirmed && (
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    编辑
                  </button>
                )}

                {/* 确认按钮（未确认时显示） */}
                {!isConfirmed && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
