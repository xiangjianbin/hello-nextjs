"use client";

import { useState, createContext, useContext, useCallback, useRef } from "react";

// Toast 类型定义
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// 生成唯一 ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Toast Provider 组件
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timeoutRefsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Clear any existing timeout for this toast
    const timeout = timeoutRefsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">): string => {
    const id = generateId();
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    // 自动移除（如果 duration > 0）
    if (newToast.duration && newToast.duration > 0) {
      const timeout = setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
      timeoutRefsRef.current.set(id, timeout);
    }

    return id;
  }, [removeToast]);

  const clearAllToasts = useCallback(() => {
    // Clear all timeouts
    timeoutRefsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefsRef.current.clear();
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, clearAllToasts }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Toast 容器组件
function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

// 单个 Toast 组件
function Toast({
  toast,
  onClose,
}: {
  toast: ToastMessage;
  onClose: () => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  // 图标和样式配置
  const config = {
    success: {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      bgClass: "bg-green-50 dark:bg-green-900/20",
      borderClass: "border-green-200 dark:border-green-800",
      iconClass: "text-green-500",
      titleClass: "text-green-800 dark:text-green-200",
      descClass: "text-green-600 dark:text-green-300",
    },
    error: {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      bgClass: "bg-red-50 dark:bg-red-900/20",
      borderClass: "border-red-200 dark:border-red-800",
      iconClass: "text-red-500",
      titleClass: "text-red-800 dark:text-red-200",
      descClass: "text-red-600 dark:text-red-300",
    },
    warning: {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
      borderClass: "border-yellow-200 dark:border-yellow-800",
      iconClass: "text-yellow-500",
      titleClass: "text-yellow-800 dark:text-yellow-200",
      descClass: "text-yellow-600 dark:text-yellow-300",
    },
    info: {
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgClass: "bg-blue-50 dark:bg-blue-900/20",
      borderClass: "border-blue-200 dark:border-blue-800",
      iconClass: "text-blue-500",
      titleClass: "text-blue-800 dark:text-blue-200",
      descClass: "text-blue-600 dark:text-blue-300",
    },
  };

  const style = config[toast.type];

  return (
    <div
      className={`pointer-events-auto w-full rounded-lg border p-4 shadow-lg transition-all duration-200 ${
        style.bgClass
      } ${style.borderClass} ${isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}`}
      role="alert"
    >
      <div className="flex gap-3">
        <div className={`shrink-0 ${style.iconClass}`}>{style.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${style.titleClass}`}>{toast.title}</p>
          {toast.description && (
            <p className={`mt-1 text-sm ${style.descClass}`}>{toast.description}</p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`mt-2 text-sm font-medium underline ${style.titleClass} hover:opacity-80`}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleClose}
          className={`shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 ${style.iconClass}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 便捷函数
export const toast = {
  success: (title: string, description?: string, options?: Partial<ToastMessage>) => ({
    type: "success" as const,
    title,
    description,
    ...options,
  }),
  error: (title: string, description?: string, options?: Partial<ToastMessage>) => ({
    type: "error" as const,
    title,
    description,
    ...options,
  }),
  warning: (title: string, description?: string, options?: Partial<ToastMessage>) => ({
    type: "warning" as const,
    title,
    description,
    ...options,
  }),
  info: (title: string, description?: string, options?: Partial<ToastMessage>) => ({
    type: "info" as const,
    title,
    description,
    ...options,
  }),
};
