import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 sm:py-24">
      {/* Hero Section */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          将您的故事转化为精彩视频
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Spring FES Video 是一个智能视频生成平台。只需输入您的故事，
          AI 将自动将其拆解为分镜场景，生成配图，并最终合成完整的视频作品。
        </p>
      </div>

      {/* Features Section */}
      <div className="mx-auto mt-16 max-w-4xl">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-card p-6 text-center dark:border-zinc-800">
            <div className="mb-4 text-3xl">📝</div>
            <h3 className="text-lg font-semibold text-foreground">
              故事转分镜
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              AI 智能分析故事内容，自动拆解为多个精彩分镜场景
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-card p-6 text-center dark:border-zinc-800">
            <div className="mb-4 text-3xl">🎨</div>
            <h3 className="text-lg font-semibold text-foreground">
              智能配图
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              根据分镜描述自动生成高质量配图，支持多种艺术风格
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-card p-6 text-center dark:border-zinc-800">
            <div className="mb-4 text-3xl">🎬</div>
            <h3 className="text-lg font-semibold text-foreground">
              视频合成
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              将分镜图片转换为动态视频，完成您的故事创作
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-16 flex flex-col items-center gap-4 sm:flex-row">
        {user ? (
          <>
            <Link
              href="/create"
              className="rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              创建新项目
            </Link>
            <Link
              href="/projects"
              className="rounded-md border border-zinc-200 bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground dark:border-zinc-800"
            >
              查看我的项目
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/register"
              className="rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              立即开始
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-zinc-200 bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground dark:border-zinc-800"
            >
              登录
            </Link>
          </>
        )}
      </div>

      {/* Workflow Section */}
      <div className="mx-auto mt-24 max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground">
          创作流程
        </h2>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              1
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              输入故事
            </p>
          </div>
          <div className="hidden h-px w-16 bg-zinc-200 sm:block dark:bg-zinc-800" />
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              2
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              生成分镜
            </p>
          </div>
          <div className="hidden h-px w-16 bg-zinc-200 sm:block dark:bg-zinc-800" />
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              3
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              生成配图
            </p>
          </div>
          <div className="hidden h-px w-16 bg-zinc-200 sm:block dark:bg-zinc-800" />
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              4
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              生成视频
            </p>
          </div>
          <div className="hidden h-px w-16 bg-zinc-200 sm:block dark:bg-zinc-800" />
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              5
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              完成
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
