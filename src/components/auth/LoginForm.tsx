"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(getErrorMessage(signInError.message));
        return;
      }

      // Login successful, redirect to homepage
      router.push("/");
      router.refresh();
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (message: string): string => {
    // Translate common Supabase error messages to Chinese
    const errorMap: Record<string, string> = {
      "Invalid login credentials": "邮箱或密码错误",
      "Email not confirmed": "邮箱未验证，请检查您的邮箱",
      "Too many requests": "请求过于频繁，请稍后重试",
      "User not found": "用户不存在",
      "Invalid email": "邮箱格式不正确",
      "Invalid password": "密码格式不正确",
    };

    return errorMap[message] || message || "登录失败，请稍后重试";
  };

  return (
    <div className={cn("w-full max-w-md space-y-6", className)}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">登录</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          登录到 Spring FES Video
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            邮箱
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="请输入邮箱"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="请输入密码"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "登录中..." : "登录"}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        还没有账号？{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary/80"
        >
          立即注册
        </Link>
      </div>
    </div>
  );
}
