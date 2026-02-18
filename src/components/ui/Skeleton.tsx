import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800",
        className
      )}
    />
  );
}

// Project card skeleton
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      {/* Preview image skeleton */}
      <Skeleton className="h-40 w-full rounded-md mb-4" />

      {/* Stage badge skeleton */}
      <Skeleton className="h-5 w-16 rounded-full mb-2" />

      {/* Title skeleton */}
      <Skeleton className="h-5 w-3/4 mb-2" />

      {/* Story preview skeleton */}
      <div className="space-y-1.5 mb-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      {/* Style and date skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

// Project list skeleton
interface ProjectListSkeletonProps {
  count?: number;
}

export function ProjectListSkeleton({ count = 6 }: ProjectListSkeletonProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Scene card skeleton
export function SceneCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      {/* Scene number skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Status skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}

// Scene list skeleton
interface SceneListSkeletonProps {
  count?: number;
}

export function SceneListSkeleton({ count = 4 }: SceneListSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SceneCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Project detail page skeleton
export function ProjectDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link skeleton */}
      <Skeleton className="h-4 w-32 mb-6" />

      {/* Project header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-2/3 md:w-1/2 mb-3" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Stage indicator skeleton */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="flex items-center justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <Skeleton className="h-8 w-8 rounded-full mb-2" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-3/4 mt-4" />
      </div>

      {/* Story content skeleton */}
      <div className="mb-8 rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>

      {/* Scenes section skeleton */}
      <div className="rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <SceneListSkeleton count={3} />
      </div>
    </div>
  );
}

// Text skeleton with custom lines
interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
interface AvatarSkeletonProps {
  size?: "sm" | "md" | "lg";
}

const avatarSizes = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function AvatarSkeleton({ size = "md" }: AvatarSkeletonProps) {
  return <Skeleton className={cn("rounded-full", avatarSizes[size])} />;
}

// Form field skeleton
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

// Form skeleton
interface FormSkeletonProps {
  fields?: number;
  showButton?: boolean;
}

export function FormSkeleton({ fields = 3, showButton = true }: FormSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
      {showButton && <Skeleton className="h-10 w-full rounded-md" />}
    </div>
  );
}
