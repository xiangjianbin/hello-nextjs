import Link from "next/link";
import type { Project, ProjectStage } from "@/types/database";

interface ProjectCardProps {
  project: Project;
}

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

// 阶段显示配置
const stageConfig: Record<
  ProjectStage,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "草稿",
    color: "text-zinc-600",
    bgColor: "bg-zinc-100 dark:bg-zinc-800",
  },
  scenes: {
    label: "分镜中",
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  images: {
    label: "图片中",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  videos: {
    label: "视频生成中",
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  completed: {
    label: "已完成",
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
};

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "今天";
  } else if (diffDays === 1) {
    return "昨天";
  } else if (diffDays < 7) {
    return `${diffDays} 天前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} 周前`;
  } else {
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const stage = stageConfig[project.stage];
  const styleName = styleNames[project.style] || project.style;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-card transition-all hover:border-primary hover:shadow-md dark:border-zinc-800"
    >
      {/* 预览图区域 */}
      <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-900">
        {/* 暂时显示占位符，后续可以显示第一个分镜的图片 */}
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-4xl opacity-30">
            {project.stage === "completed" ? "🎬" : "📝"}
          </div>
        </div>

        {/* 阶段标签 */}
        <div
          className={`absolute right-2 top-2 rounded px-2 py-1 text-xs font-medium ${stage.bgColor} ${stage.color}`}
        >
          {stage.label}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 标题 */}
        <h3 className="truncate text-lg font-semibold text-foreground group-hover:text-primary">
          {project.title}
        </h3>

        {/* 故事预览 */}
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {project.story}
        </p>

        {/* 元信息 */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
            {styleName}
          </span>
          <span>{formatDate(project.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
