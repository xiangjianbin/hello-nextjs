"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface MobileNavProps {
  user: {
    email: string;
  } | null;
}

export function MobileNav({ user }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="md:hidden" ref={menuRef}>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label={isOpen ? "关闭菜单" : "打开菜单"}
        aria-expanded={isOpen}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={closeMenu}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={`fixed top-16 right-0 bottom-0 z-50 w-64 bg-background border-l border-zinc-200 dark:border-zinc-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="flex flex-col p-4 space-y-1">
          {user ? (
            <>
              {/* User info */}
              <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 mb-2">
                <p className="text-sm text-muted-foreground">已登录</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {user.email}
                </p>
              </div>

              {/* Navigation links */}
              <Link
                href="/projects"
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-3 rounded-md text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                我的项目
              </Link>
              <Link
                href="/create"
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-3 rounded-md text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-muted-foreground"
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
              </Link>

              {/* Logout button */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 mt-2">
                <LogoutButton variant="ghost" showIcon className="w-full justify-start px-3 py-3" />
              </div>
            </>
          ) : (
            <>
              {/* Not logged in */}
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-3 rounded-md text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg
                  className="h-5 w-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                登录
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
