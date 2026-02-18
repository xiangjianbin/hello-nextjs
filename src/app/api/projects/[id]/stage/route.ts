/**
 * Project Stage Update API
 * PATCH /api/projects/:id/stage - 更新项目阶段（用于重新进入任意阶段修改）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateProjectStage } from '@/lib/db/projects'
import type { ProjectStage } from '@/types/database'

interface UpdateStageRequest {
  stage: ProjectStage
}

// 允许的阶段转换
const VALID_STAGES: ProjectStage[] = ['draft', 'scenes', 'images', 'videos', 'completed']

/**
 * PATCH /api/projects/:id/stage
 * 更新项目阶段（允许从 completed 返回到任意阶段）
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
    const body: UpdateStageRequest = await request.json()
    const { stage } = body

    // 验证阶段值
    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: 'Invalid stage value. Must be one of: ' + VALID_STAGES.join(', ') },
        { status: 400 }
      )
    }

    // 更新项目阶段
    const updatedProject = await updateProjectStage(projectId, user.id, stage)

    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: `项目阶段已更新为 ${stage}`,
    })
  } catch (error) {
    console.error('Error updating project stage:', error)

    // 检查是否是权限错误
    if (error instanceof Error && error.message.includes('not found or access denied')) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update project stage' },
      { status: 500 }
    )
  }
}
