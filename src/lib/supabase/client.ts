import { createBrowserClient } from '@supabase/ssr'

/**
 * 创建浏览器端 Supabase 客户端
 * 用于 Client Components（'use client' 组件）
 *
 * 注意：这个函数应该在客户端组件中调用
 * 服务端应该使用 createClient() from server.ts
 *
 * @returns Supabase Client 实例
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
