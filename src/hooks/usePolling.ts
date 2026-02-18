"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePollingOptions {
  /** 轮询间隔（毫秒） */
  interval?: number;
  /** 是否在开始时立即执行一次 */
  immediate?: boolean;
  /** 最大轮询次数（0 表示无限制） */
  maxAttempts?: number;
  /** 轮询条件 - 返回 false 时停止轮询 */
  shouldContinue?: () => boolean;
  /** 完成回调 */
  onComplete?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

interface UsePollingReturn {
  /** 是否正在轮询 */
  isPolling: boolean;
  /** 开始轮询 */
  startPolling: () => void;
  /** 停止轮询 */
  stopPolling: () => void;
  /** 手动触发一次轮询 */
  pollOnce: () => Promise<void>;
  /** 轮询次数 */
  attemptCount: number;
}

/**
 * 轮询 Hook
 * 用于定期执行某个函数，支持自动停止和条件判断
 */
export function usePolling(
  pollFunction: () => Promise<void>,
  options: UsePollingOptions = {}
): UsePollingReturn {
  const {
    interval = 5000,
    immediate = false,
    maxAttempts = 0,
    shouldContinue,
    onComplete,
    onError,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // 清理轮询
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
    setIsPolling(false);
  }, []);

  // 执行单次轮询
  const pollOnce = useCallback(async () => {
    try {
      await pollFunction();
      setAttemptCount((prev) => prev + 1);
    } catch (error) {
      console.error("[Polling] Error during poll:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [pollFunction, onError]);

  // 开始轮询
  const startPolling = useCallback(() => {
    if (isPollingRef.current) {
      console.log("[Polling] Already polling, skipping start");
      return;
    }

    console.log("[Polling] Starting polling");
    isPollingRef.current = true;
    setIsPolling(true);
    setAttemptCount(0);

    // 立即执行一次
    if (immediate) {
      pollOnce();
    }

    // 设置定时器
    intervalRef.current = setInterval(async () => {
      // 检查是否应该继续
      if (shouldContinue && !shouldContinue()) {
        console.log("[Polling] shouldContinue returned false, stopping");
        cleanup();
        onComplete?.();
        return;
      }

      // 检查是否达到最大次数
      if (maxAttempts > 0 && attemptCount >= maxAttempts) {
        console.log("[Polling] Max attempts reached, stopping");
        cleanup();
        onComplete?.();
        return;
      }

      await pollOnce();
    }, interval);
  }, [interval, immediate, maxAttempts, shouldContinue, onComplete, pollOnce, cleanup, attemptCount]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    console.log("[Polling] Stopping polling");
    cleanup();
    onComplete?.();
  }, [cleanup, onComplete]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isPolling,
    startPolling,
    stopPolling,
    pollOnce,
    attemptCount,
  };
}

/**
 * 视频状态轮询 Hook
 * 专门用于视频生成状态检查
 */
export function useVideoStatusPolling(
  checkStatus: () => Promise<boolean>, // 返回 true 表示完成
  options: Omit<UsePollingOptions, "shouldContinue"> = {}
): UsePollingReturn {
  const shouldContinueRef = useRef(true);

  const pollFunction = useCallback(async () => {
    const isComplete = await checkStatus();
    if (isComplete) {
      shouldContinueRef.current = false;
    }
  }, [checkStatus]);

  const shouldContinue = useCallback(() => shouldContinueRef.current, []);

  return usePolling(pollFunction, {
    ...options,
    shouldContinue,
  });
}
