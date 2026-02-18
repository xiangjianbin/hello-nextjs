"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// 风格配置
const styles = [
  {
    id: "realistic",
    name: "写实风格",
    description: "真实感强，细节丰富，接近现实世界",
    emoji: "📷",
  },
  {
    id: "anime",
    name: "动漫风格",
    description: "日式动漫风格，线条流畅，色彩鲜艳",
    emoji: "🎨",
  },
  {
    id: "3d-cartoon",
    name: "3D 卡通",
    description: "立体卡通效果，可爱有趣，适合儿童向内容",
    emoji: "🎮",
  },
  {
    id: "watercolor",
    name: "水彩风格",
    description: "水彩画效果，柔和淡雅，艺术感强",
    emoji: "🎨",
  },
  {
    id: "oil_painting",
    name: "油画风格",
    description: "油画质感，厚重丰富，经典艺术风格",
    emoji: "🖼️",
  },
  {
    id: "sketch",
    name: "素描风格",
    description: "铅笔素描效果，简洁有力，线条清晰",
    emoji: "✏️",
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "未来科技感，霓虹灯效果，科幻风格",
    emoji: "🌃",
  },
  {
    id: "fantasy",
    name: "奇幻风格",
    description: "魔法世界，奇幻元素，充满想象力",
    emoji: "🧙",
  },
];

interface FormData {
  title: string;
  story: string;
  style: string;
}

export function CreateProjectForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    story: "",
    style: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStyleSelect = (styleId: string) => {
    setFormData((prev) => ({ ...prev, style: styleId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 验证必填字段
    if (!formData.title.trim()) {
      setError("请输入项目标题");
      return;
    }

    if (!formData.story.trim()) {
      setError("请输入故事内容");
      return;
    }

    if (!formData.style) {
      setError("请选择视频风格");
      return;
    }

    // 故事内容最小长度
    if (formData.story.trim().length < 20) {
      setError("故事内容至少需要 20 个字符");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          story: formData.story.trim(),
          style: formData.style,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "创建项目失败，请稍后重试");
        return;
      }

      // 创建成功，跳转到项目详情页
      router.push(`/projects/${data.id}`);
    } catch (err) {
      console.error("Error creating project:", err);
      setError("创建项目失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 项目标题 */}
      <div className="space-y-2">
        <label
          htmlFor="title"
          className="block text-sm font-medium text-foreground"
        >
          项目标题 <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleInputChange}
          required
          disabled={isLoading}
          placeholder="为您的项目起个名字"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* 故事内容 */}
      <div className="space-y-2">
        <label
          htmlFor="story"
          className="block text-sm font-medium text-foreground"
        >
          故事内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="story"
          name="story"
          value={formData.story}
          onChange={handleInputChange}
          required
          disabled={isLoading}
          rows={8}
          placeholder="请输入您想要制作成视频的故事内容。可以是完整的故事、剧本大纲或场景描述。内容越详细，生成的分镜效果越好。"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          已输入 {formData.story.length} 个字符（至少 20 个字符）
        </p>
      </div>

      {/* 风格选择 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          视频风格 <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          选择一种视觉风格，AI 将按照该风格生成图片和视频
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {styles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => handleStyleSelect(style.id)}
              disabled={isLoading}
              className={cn(
                "flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
                formData.style === style.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-zinc-200 bg-card hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              )}
            >
              <div className="mb-2 text-2xl">{style.emoji}</div>
              <h3
                className={cn(
                  "text-sm font-semibold",
                  formData.style === style.id
                    ? "text-primary"
                    : "text-foreground"
                )}
              >
                {style.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {style.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isLoading}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-800"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
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
              创建中...
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              创建项目
            </>
          )}
        </button>
      </div>
    </form>
  );
}
