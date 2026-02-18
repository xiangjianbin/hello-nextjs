import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 受保护的路由路径（需要登录才能访问）
 */
const protectedPaths = ['/projects', '/create']

/**
 * 仅限未登录用户访问的路径
 */
const authPaths = ['/login', '/register']

/**
 * 更新 Supabase session 并返回响应
 * 用于 Next.js middleware 中处理认证状态和路由保护
 *
 * @param request - NextRequest 对象
 * @returns NextResponse 对象，包含更新的 session cookies 或重定向
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // 合并 request cookies 和 response cookies
          const requestCookies = request.cookies.getAll()
          const responseCookies = supabaseResponse.cookies.getAll()
          return [...requestCookies, ...responseCookies]
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 更新 request cookies
            request.cookies.set(name, value)
            // 更新 response cookies
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 获取当前用户信息
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 检查是否是受保护的路由
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path))

  // 检查是否是认证页面（登录、注册）
  const isAuthPath = authPaths.some((path) => pathname === path)

  // 未登录用户访问受保护的路由 -> 重定向到登录页
  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname) // 保存原始目标路径
    return NextResponse.redirect(url)
  }

  // 已登录用户访问登录/注册页面 -> 重定向到首页
  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
