import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProjectById } from "@/lib/db/projects";
import { StageIndicator } from "@/components/project/StageIndicator";
import { SceneGenerator } from "@/components/scene/SceneGenerator";
import { SceneDescriptionList } from "@/components/scene/SceneDescriptionList";
import { SceneImageList } from "@/components/scene/SceneImageList";
import { SceneVideoList } from "@/components/scene/SceneVideoList";
import { ProjectCompletedView } from "@/components/project/ProjectCompletedView";
import type { ProjectStage, SceneWithMedia } from "@/types/database";

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

      {/* 分镜区域 - 根据阶段显示不同内容 */}
      <div className="rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">分镜列表</h2>
          {project.scenes.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {project.scenes.length} 个分镜
            </span>
          )}
        </div>

        {/* Draft 阶段 - 显示生成按钮 */}
        {project.stage === "draft" && (
          <SceneGenerator projectId={project.id} />
        )}

        {/* Scenes 阶段 - 显示分镜描述编辑列表 */}
        {project.stage === "scenes" && project.scenes.length > 0 && (
          <SceneDescriptionList
            projectId={project.id}
            scenes={project.scenes as SceneWithMedia[]}
          />
        )}

        {/* Images 阶段 - 显示图片生成列表 */}
        {project.stage === "images" && project.scenes.length > 0 && (
          <SceneImageList
            projectId={project.id}
            scenes={project.scenes as SceneWithMedia[]}
          />
        )}

        {/* Videos 阶段 - 显示视频生成列表 */}
        {project.stage === "videos" && project.scenes.length > 0 && (
          <SceneVideoList
            projectId={project.id}
            scenes={project.scenes as SceneWithMedia[]}
          />
        )}

        {/* Completed 阶段 - 显示完成视图 */}
        {project.stage === "completed" && project.scenes.length > 0 && (
          <ProjectCompletedView
            projectId={project.id}
            scenes={project.scenes as SceneWithMedia[]}
            completedAt={project.updated_at}
          />
        )}

        {/* 如果有分镜但在 draft 阶段（异常情况） */}
        {project.stage === "draft" && project.scenes.length > 0 && (
          <SceneDescriptionList
            projectId={project.id}
            scenes={project.scenes as SceneWithMedia[]}
          />
        )}
      </div>
    </div>
  );
}
