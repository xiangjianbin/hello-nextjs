import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjectById } from "@/lib/db/projects";
import { StageIndicator } from "@/components/project/StageIndicator";
import type { ProjectStage } from "@/types/database";

// 风格显示名称映射
const styleNames: Record<string, string> = {
  realistic: "写实风格",
  anime: "动漫风格",
  "3d-cartoon": "3D 卡通",
  watercolor: "水彩风格",
  oil_painting: "油画风格",
  sketch: "素描风格",
  cyberpunk: "赛博朋克",
  fantasy: "奇幻风格",
};

// 阶段描述
const stageDescriptions: Record<ProjectStage, string> = {
  draft: "项目已创建，请先生成分镜描述。",
  scenes: "正在编辑分镜描述，确认后可生成配图。",
  images: "正在生成场景配图，确认后可生成视频。",
  videos: "正在生成场景视频，确认后项目完成。",
  completed: "项目已完成！您可以下载视频或重新编辑。",
};

// 格式化日期
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;

  // 获取当前用户
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未登录用户重定向到登录页
  if (!user) {
    redirect("/login");
  }

  // 获取项目详情
  const project = await getProjectById(id, user.id);

  // 项目不存在或无权访问
  if (!project) {
    notFound();
  }

  const styleName = styleNames[project.style] || project.style;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回链接 */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          返回项目列表
        </Link>
      </div>

      {/* 项目标题和元信息 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          {project.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
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
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            {styleName}
          </span>
          <span className="inline-flex items-center gap-1">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            创建于 {formatDate(project.created_at)}
          </span>
          {project.scenes.length > 0 && (
            <span className="inline-flex items-center gap-1">
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
              {project.scenes.length} 个分镜
            </span>
          )}
        </div>
      </div>

      {/* 阶段指示器 */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-foreground">项目进度</h2>
        <StageIndicator currentStage={project.stage} />
        <p className="mt-4 text-sm text-muted-foreground">
          {stageDescriptions[project.stage]}
        </p>
      </div>

      {/* 故事内容 */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-foreground">故事内容</h2>
        <p className="whitespace-pre-wrap text-foreground leading-relaxed">
          {project.story}
        </p>
      </div>

      {/* 分镜预览（占位符） */}
      <div className="rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">分镜列表</h2>
          {project.scenes.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {project.scenes.length} 个分镜
            </span>
          )}
        </div>

        {project.scenes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎬</div>
            <p className="text-muted-foreground mb-4">
              还没有分镜，请先生成分镜描述
            </p>
            {project.stage === "draft" && (
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                生成分镜
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.scenes.map((scene, index) => (
              <div
                key={scene.id}
                className="rounded-lg border border-zinc-200 p-4 transition-all hover:border-primary dark:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {index + 1}
                  </span>
                  <p className="text-sm text-foreground line-clamp-3">
                    {scene.description}
                  </p>
                </div>
                {/* 状态指示 */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {scene.description_confirmed ? (
                    <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-600 dark:bg-green-900/30">
                      描述已确认
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-muted-foreground dark:bg-zinc-800">
                      描述待确认
                    </span>
                  )}
                  {scene.image && (
                    <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30">
                      已配图
                    </span>
                  )}
                  {scene.video && (
                    <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-600 dark:bg-purple-900/30">
                      已生成视频
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
