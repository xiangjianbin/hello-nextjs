import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/db/projects";
import { ProjectList } from "@/components/project/ProjectList";

const PAGE_SIZE = 9; // 每页显示 9 个项目（3x3 网格）

export default async function ProjectsPage() {
  // 获取当前用户
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未登录用户重定向到登录页
  if (!user) {
    redirect("/login");
  }

  // 获取项目列表
  const { projects, total } = await getProjects(user.id, {
    page: 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题和操作按钮 */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">我的项目</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理您的视频创作项目
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          创建新项目
        </Link>
      </div>

      {/* 项目列表 */}
      <ProjectList
        initialProjects={projects}
        initialTotal={total}
        initialPage={1}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
