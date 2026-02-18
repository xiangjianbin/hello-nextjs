import { Spinner } from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center">
      <div className="text-center">
        {/* Animated logo/spinner */}
        <div className="relative mb-6">
          <div className="h-16 w-16 mx-auto">
            <Spinner size="xl" className="text-primary" />
          </div>
          {/* Pulse effect */}
          <div className="absolute inset-0 h-16 w-16 mx-auto">
            <div className="h-full w-full rounded-full border-2 border-primary/30 animate-ping" />
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-lg font-medium text-foreground mb-2">加载中</h2>
        <p className="text-sm text-muted-foreground">
          请稍候，正在为您加载内容...
        </p>

        {/* Loading dots animation */}
        <div className="flex items-center justify-center gap-1 mt-4">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
