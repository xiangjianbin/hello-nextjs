"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "ghost" | "link";
}

export function LogoutButton({
  className,
  variant = "default",
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
    "text-sm font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

  const variantStyles = {
    default:
      "rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2",
    ghost:
      "rounded-md px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground",
    link: "text-primary hover:text-primary/80 underline-offset-4 hover:underline",
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={cn(baseStyles, variantStyles[variant], className)}
    >
      {isLoading ? "登出中..." : "登出"}
    </button>
  );
}
