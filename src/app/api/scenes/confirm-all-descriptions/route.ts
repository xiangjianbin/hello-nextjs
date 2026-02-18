/**
 * Confirm All Descriptions API Route
 * POST /api/scenes/confirm-all-descriptions - 确认所有分镜描述
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmAllDescriptions, getScenesByProjectId } from '@/lib/db/scenes'
import { getProjectById } from '@/lib/db/projects'
import type { SceneWithMedia } from '@/types/database'

interface ConfirmAllDescriptionsRequest {
  projectId: string
}

interface ConfirmAllDescriptionsResponse {
  success: boolean
  confirmedCount: number
  scenes: SceneWithMedia[]
  message?: string
}

/**
 * POST /api/scenes/confirm-all-descriptions
 * 确认所有分镜描述
 *
 * 请求体:
 * - projectId: 项目 ID
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取项目信息
 * 3. 确认所有分镜描述
 * 4. 返回更新后的分镜列表
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户认证
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 解析请求体
    const body: ConfirmAllDescriptionsRequest = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      )
    }

    // 3. 获取项目信息（验证权限）
    const project = await getProjectById(projectId, user.id)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 4. 确认所有分镜描述
    const confirmedCount = await confirmAllDescriptions(projectId, user.id)

    // 5. 获取更新后的分镜列表
    const scenes = await getScenesByProjectId(projectId, user.id)

    const response: ConfirmAllDescriptionsResponse = {
      success: true,
      confirmedCount,
      scenes,
      message: `已确认 ${confirmedCount} 个分镜描述`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error confirming all descriptions:', error)

    // 处理已知错误类型
    if (error instanceof Error) {
      if (error.message.includes('not found or access denied')) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to confirm all descriptions' },
      { status: 500 }
    )
  }
}
