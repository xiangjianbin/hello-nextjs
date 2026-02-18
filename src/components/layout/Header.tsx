import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:border-zinc-800">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-foreground">
            Spring FES Video
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center space-x-4">
          {user ? (
            <>
              {/* User is logged in */}
              <Link
                href="/projects"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                我的项目
              </Link>
              <Link
                href="/create"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                创建项目
              </Link>
              <div className="flex items-center space-x-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <LogoutButton variant="ghost" />
              </div>
            </>
          ) : (
            <>
              {/* User is not logged in */}
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
