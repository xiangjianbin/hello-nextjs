"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SceneWithMedia, ProjectStage } from "@/types/database";

// 阶段配置
const STAGE_CONFIG: { key: ProjectStage; label: string; description: string }[] = [
  { key: "scenes", label: "分镜描述", description: "编辑分镜描述" },
  { key: "images", label: "场景配图", description: "重新生成图片" },
  { key: "videos", label: "场景视频", description: "重新生成视频" },
];

interface ProjectCompletedViewProps {
  projectId: string;
  scenes: SceneWithMedia[];
  completedAt: string;
}

export function ProjectCompletedView({
  projectId,
  scenes,
  completedAt,
}: ProjectCompletedViewProps) {
  const router = useRouter();
  const [isChangingStage, setIsChangingStage] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ProjectStage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 格式化完成时间
  const formatCompletedDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 下载单个视频
  const handleDownloadVideo = useCallback(async (scene: SceneWithMedia) => {
    if (!scene.video?.url) {
      return;
    }

    try {
      // 使用 fetch 下载视频
      const response = await fetch(scene.video.url);
      if (!response.ok) {
        throw new Error("Failed to download video");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scene_${scene.order_index + 1}_video.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading video:", err);
      setError("下载视频失败，请重试");
    }
  }, []);

  // 下载所有视频
  const handleDownloadAll = useCallback(async () => {
    const videosWithScenes = scenes.filter((s) => s.video?.url);

    if (videosWithScenes.length === 0) {
      setError("没有可下载的视频");
      return;
    }

    // 顺序下载每个视频
    for (const scene of videosWithScenes) {
      await handleDownloadVideo(scene);
      // 添加延迟避免浏览器阻止多次下载
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }, [scenes, handleDownloadVideo]);

  // 更改项目阶段
  const handleChangeStage = useCallback(
    async (stage: ProjectStage) => {
      setIsChangingStage(true);
      setSelectedStage(stage);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/stage`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stage }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update stage");
        }

        // 刷新页面以显示新阶段
        router.refresh();
      } catch (err) {
        console.error("Error changing stage:", err);
        setError(
          err instanceof Error ? err.message : "更新阶段失败，请重试"
        );
        setIsChangingStage(false);
        setSelectedStage(null);
      }
    },
    [projectId, router]
  );

  // 有视频的分镜
  const scenesWithVideos = scenes.filter((s) => s.video?.url);

  return (
    <div className="space-y-8">
      {/* 完成庆祝区域 */}
      <div className="rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                🎉 项目已完成！
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                完成时间：{formatCompletedDate(completedAt)}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadAll}
            disabled={scenesWithVideos.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            下载所有视频
          </button>
        </div>
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

      {/* 视频预览网格 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">视频预览</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              className="group rounded-lg border border-zinc-200 bg-card overflow-hidden transition-all hover:border-primary hover:shadow-lg dark:border-zinc-700"
            >
              {/* 视频播放器 */}
              <div className="relative aspect-video bg-zinc-900">
                {scene.video?.url ? (
                  <video
                    src={scene.video.url}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">暂无视频</p>
                  </div>
                )}
                {/* 分镜序号标签 */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                  分镜 {index + 1}
                </div>
              </div>

              {/* 描述和下载 */}
              <div className="p-3 space-y-3">
                <p className="text-sm text-foreground line-clamp-2">
                  {scene.description}
                </p>
                {scene.video?.url && (
                  <button
                    onClick={() => handleDownloadVideo(scene)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    下载此视频
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 重新编辑区域 */}
      <div className="rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-700">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          重新编辑
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          您可以返回任意阶段进行修改。修改后需要重新确认后续步骤。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STAGE_CONFIG.map((stage) => (
            <button
              key={stage.key}
              onClick={() => handleChangeStage(stage.key)}
              disabled={isChangingStage}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-all ${
                isChangingStage && selectedStage === stage.key
                  ? "border-primary bg-primary/5"
                  : "border-zinc-200 bg-background hover:border-primary hover:bg-primary/5 dark:border-zinc-700"
              } disabled:opacity-50`}
            >
              {isChangingStage && selectedStage === stage.key ? (
                <svg
                  className="h-5 w-5 animate-spin text-primary"
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
              ) : (
                <svg
                  className="h-5 w-5 text-muted-foreground"
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
              )}
              <div className="text-center">
                <span className="text-sm font-medium text-foreground">
                  {stage.label}
                </span>
                <p className="text-xs text-muted-foreground">
                  {stage.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
