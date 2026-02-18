"use client";

import { useState } from "react";
import type { Project } from "@/types/database";
import { ProjectCard } from "./ProjectCard";
import { ProjectCardSkeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";

interface ProjectListProps {
  initialProjects: Project[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
}

export function ProjectList({
  initialProjects,
  initialTotal,
  initialPage,
  pageSize,
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page < totalPages;

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(
        `/api/projects?page=${nextPage}&pageSize=${pageSize}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();
      setProjects((prev) => [...prev, ...data.projects]);
      setTotal(data.total);
      setPage(nextPage);
    } catch (error) {
      console.error("Error loading more projects:", error);
    } finally {
      setLoading(false);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-5xl opacity-30">📁</div>
        <h3 className="text-lg font-medium text-foreground">
          暂无项目
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          点击上方按钮创建您的第一个项目
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 项目卡片网格 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {/* Loading skeletons */}
        {loading &&
          Array.from({ length: pageSize }).map((_, i) => (
            <ProjectCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>

      {/* 分页控制 */}
      {hasMore && (
        <div className="flex flex-col items-center gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" />
              <span>正在加载更多项目...</span>
            </div>
          )}
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border border-zinc-200 bg-background px-6 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                加载中...
              </span>
            ) : (
              `加载更多 (第 ${page}/${totalPages} 页)`
            )}
          </button>
        </div>
      )}

      {/* 项目总数 */}
      <div className="text-center text-sm text-muted-foreground">
        共 {total} 个项目
      </div>
    </div>
  );
}
