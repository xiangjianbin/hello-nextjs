"use client";

import type { ProjectStage } from "@/types/database";

// 阶段配置
const STAGES: { key: ProjectStage; label: string; description: string }[] = [
  { key: "draft", label: "草稿", description: "创建项目" },
  { key: "scenes", label: "分镜", description: "生成分镜描述" },
  { key: "images", label: "配图", description: "生成场景图片" },
  { key: "videos", label: "视频", description: "生成场景视频" },
  { key: "completed", label: "完成", description: "项目完成" },
];

// 获取阶段索引
function getStageIndex(stage: ProjectStage): number {
  return STAGES.findIndex((s) => s.key === stage);
}

interface StageIndicatorProps {
  currentStage: ProjectStage;
  className?: string;
}

export function StageIndicator({ currentStage, className = "" }: StageIndicatorProps) {
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className={`w-full ${className}`}>
      {/* 桌面端显示 */}
      <div className="hidden md:flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage.key} className="flex items-center flex-1">
              {/* 阶段项 */}
              <div className="flex items-center gap-3">
                {/* 图标/圆圈 */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-zinc-300 bg-background text-muted-foreground dark:border-zinc-700"
                  }`}
                >
                  {isCompleted ? (
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* 标签 */}
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-medium ${
                      isCompleted
                        ? "text-green-600 dark:text-green-400"
                        : isCurrent
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-xs text-muted-foreground hidden lg:block">
                    {stage.description}
                  </span>
                </div>
              </div>

              {/* 连接线 */}
              {index < STAGES.length - 1 && (
                <div className="flex-1 mx-4">
                  <div
                    className={`h-0.5 transition-all ${
                      index < currentIndex
                        ? "bg-green-500"
                        : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 移动端显示 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={stage.key} className="flex items-center flex-1">
                {/* 圆点 */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-zinc-300 bg-background text-muted-foreground dark:border-zinc-700"
                  }`}
                >
                  {isCompleted ? (
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
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>

                {/* 连接线 */}
                {index < STAGES.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={`h-0.5 transition-all ${
                        index < currentIndex
                          ? "bg-green-500"
                          : "bg-zinc-200 dark:bg-zinc-700"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 当前阶段描述 */}
        <div className="text-center">
          <span className="text-sm font-medium text-foreground">
            {STAGES[currentIndex]?.label}
          </span>
          <span className="text-sm text-muted-foreground ml-1">
            - {STAGES[currentIndex]?.description}
          </span>
        </div>
      </div>
    </div>
  );
}
