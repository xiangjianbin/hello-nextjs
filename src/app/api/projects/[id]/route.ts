/**
 * Project Detail API Routes
 * GET /api/projects/:id - 获取项目详情（包含所有分镜及媒体）
 * PATCH /api/projects/:id - 更新项目（标题、故事、风格）
 * DELETE /api/projects/:id - 删除项目
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getProjectById,
  updateProject,
  deleteProject,
} from '@/lib/db/projects'
import type { ProjectUpdate } from '@/types/database'

interface UpdateProjectRequest {
  title?: string
  story?: string
  style?: string
}

/**
 * GET /api/projects/:id
 * 获取项目详情（包含所有分镜及媒体）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 获取项目 ID
    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // 获取项目详情
    const project = await getProjectById(projectId, user.id)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/projects/:id
 * 更新项目（标题、故事、风格）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 获取项目 ID
    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // 解析请求体
    const body: UpdateProjectRequest = await request.json()
    const { title, story, style } = body

    // 至少需要更新一个字段
    if (title === undefined && story === undefined && style === undefined) {
      return NextResponse.json(
        { error: 'At least one field (title, story, or style) must be provided' },
        { status: 400 }
      )
    }

    // 验证字段值
    if (title !== undefined && title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      )
    }

    if (story !== undefined && story.trim().length === 0) {
      return NextResponse.json(
        { error: 'Story cannot be empty' },
        { status: 400 }
      )
    }

    if (style !== undefined && style.trim().length === 0) {
      return NextResponse.json(
        { error: 'Style cannot be empty' },
        { status: 400 }
      )
    }

    // 构建更新对象
    const updates: ProjectUpdate = {}
    if (title !== undefined) updates.title = title.trim()
    if (story !== undefined) updates.story = story.trim()
    if (style !== undefined) updates.style = style.trim()

    // 更新项目
    const updatedProject = await updateProject(projectId, user.id, updates)

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)

    // 检查是否是权限错误
    if (error instanceof Error && error.message.includes('not found or access denied')) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 获取项目 ID
    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // 删除项目（数据访问层会验证所有权）
    await deleteProject(projectId, user.id)

    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting project:', error)

    // 检查是否是权限错误
    if (error instanceof Error && error.message.includes('not found or access denied')) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
