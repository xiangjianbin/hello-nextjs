/**
 * Projects API Routes
 * POST /api/projects - 创建项目
 * GET /api/projects - 获取项目列表（支持分页）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createProject,
  getProjects,
} from '@/lib/db/projects'
import type { Project } from '@/types/database'

interface CreateProjectRequest {
  title: string
  story: string
  style: string
}

interface ProjectsListResponse {
  projects: Project[]
  total: number
  page: number
  pageSize: number
}

/**
 * POST /api/projects
 * 创建新项目
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body: CreateProjectRequest = await request.json()
    const { title, story, style } = body

    // 验证必填字段
    if (!title || !story || !style) {
      return NextResponse.json(
        { error: 'Missing required fields: title, story, style' },
        { status: 400 }
      )
    }

    // 验证字段长度
    if (title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      )
    }

    if (story.trim().length === 0) {
      return NextResponse.json(
        { error: 'Story cannot be empty' },
        { status: 400 }
      )
    }

    // 创建项目
    const project = await createProject(user.id, title.trim(), story.trim(), style)

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/projects
 * 获取用户项目列表（支持分页）
 * Query params: page, pageSize
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 解析分页参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    // 验证分页参数
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters. Page must be >= 1, pageSize must be between 1 and 100' },
        { status: 400 }
      )
    }

    // 获取项目列表
    const result = await getProjects(user.id, { page, pageSize })

    const response: ProjectsListResponse = {
      projects: result.projects,
      total: result.total,
      page,
      pageSize,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
