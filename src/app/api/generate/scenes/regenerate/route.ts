/**
 * Scene Regeneration API Routes
 * POST /api/generate/scenes/regenerate - 重新生成分镜描述
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjectById, updateProjectStage } from '@/lib/db/projects'
import {
  createScenes,
  deleteScenesByProjectId,
  getScenesByProjectId,
} from '@/lib/db/scenes'
import { regenerateScenes } from '@/lib/ai/aliyun-chat'
import { AIGenerationError } from '@/types/ai'
import type { SceneWithMedia } from '@/types/database'

interface RegenerateScenesRequest {
  projectId: string
}

interface RegenerateScenesResponse {
  success: boolean
  scenes: SceneWithMedia[]
  message?: string
}

/**
 * POST /api/generate/scenes/regenerate
 * 重新生成分镜描述
 *
 * 请求体:
 * - projectId: 项目 ID
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取项目信息
 * 3. 调用智谱AI 重新生成分镜（使用 regenerateScenes 获得不同结果）
 * 4. 删除旧分镜
 * 5. 保存新分镜到数据库
 * 6. 确保项目阶段为 'scenes'
 * 7. 返回分镜列表
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
    const body: RegenerateScenesRequest = await request.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      )
    }

    // 3. 获取项目信息
    const project = await getProjectById(projectId, user.id)

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 验证项目有所需的故事和风格
    if (!project.story || !project.style) {
      return NextResponse.json(
        { error: 'Project must have story and style defined' },
        { status: 400 }
      )
    }

    // 4. 调用智谱AI 重新生成分镜
    let scenesData
    try {
      scenesData = await regenerateScenes({
        story: project.story,
        style: project.style,
      })
    } catch (error) {
      if (error instanceof AIGenerationError) {
        console.error('AI regeneration error:', error.message)
        return NextResponse.json(
          { error: `分镜重新生成失败: ${error.message}` },
          { status: 500 }
        )
      }
      throw error
    }

    // 5. 删除旧分镜（如果存在）
    const deletedCount = await deleteScenesByProjectId(projectId, user.id)
    console.log(
      `Deleted ${deletedCount} old scenes for project ${projectId} (regenerate)`
    )

    // 6. 保存新分镜到数据库
    const newScenes = await createScenes(
      projectId,
      user.id,
      scenesData.scenes.map((scene) => ({
        orderIndex: scene.order_index,
        description: scene.description,
      }))
    )

    console.log(
      `Created ${newScenes.length} scenes for project ${projectId} (regenerate)`
    )

    // 7. 确保项目阶段为 'scenes'
    if (project.stage !== 'scenes') {
      await updateProjectStage(projectId, user.id, 'scenes')
    }

    // 8. 获取完整的分镜列表（包含媒体信息）
    const scenesWithMedia = await getScenesByProjectId(projectId, user.id)

    const response: RegenerateScenesResponse = {
      success: true,
      scenes: scenesWithMedia,
      message: `成功重新生成 ${scenesWithMedia.length} 个分镜`,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error regenerating scenes:', error)

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
      { error: 'Failed to regenerate scenes' },
      { status: 500 }
    )
  }
}
