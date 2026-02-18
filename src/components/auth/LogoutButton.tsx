"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "ghost" | "link";
  showIcon?: boolean;
}

export function LogoutButton({
  className,
  variant = "default",
  showIcon = false,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      // Redirect to login page after logout
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const baseStyles =
    "inline-flex items-center text-sm font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

  const variantStyles = {
    default:
      "justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2",
    ghost:
      "justify-center rounded-md px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground",
    link: "text-primary hover:text-primary/80 underline-offset-4 hover:underline",
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {isLoading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
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
          登出中...
        </>
      ) : (
        <>
          {showIcon && (
            <svg
              className="mr-3 h-5 w-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          )}
          登出
        </>
      )}
    </button>
  );
}
