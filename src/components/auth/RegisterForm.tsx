"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RegisterFormProps {
  className?: string;
}

export function RegisterForm({ className }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("密码长度至少为6位");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(getErrorMessage(signUpError.message));
        return;
      }

      // Registration successful
      setSuccess(true);

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("注册失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (message: string): string => {
    // Translate common Supabase error messages to Chinese
    const errorMap: Record<string, string> = {
      "User already registered": "该邮箱已被注册",
      "Email not confirmed": "邮箱未验证，请检查您的邮箱",
      "Too many requests": "请求过于频繁，请稍后重试",
      "Invalid email": "邮箱格式不正确",
      "Password should be at least 6 characters": "密码长度至少为6位",
      "Unable to validate email address": "邮箱格式不正确",
      "Signup is disabled": "注册功能已禁用",
    };

    return errorMap[message] || message || "注册失败，请稍后重试";
  };

  return (
    <div className={cn("w-full max-w-md space-y-6", className)}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">注册</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          创建 Spring FES Video 账号
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
            注册成功！即将跳转到登录页面...
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
            disabled={isLoading || success}
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
            disabled={isLoading || success}
            placeholder="请输入密码（至少6位）"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-foreground"
          >
            确认密码
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading || success}
            placeholder="请再次输入密码"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || success}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "注册中..." : "注册"}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        已有账号？{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80"
        >
          立即登录
        </Link>
      </div>
    </div>
  );
}
