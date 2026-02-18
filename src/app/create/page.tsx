import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateProjectForm } from "@/components/project/CreateProjectForm";

export default async function CreateProjectPage() {
  // 获取当前用户
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未登录用户重定向到登录页
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">创建新项目</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          输入您的故事，选择风格，开始创作视频
        </p>
      </div>

      {/* 创建项目表单 */}
      <CreateProjectForm />
    </div>
  );
}
