/**
 * Confirm All Images API Route
 * POST /api/scenes/confirm-all-images - 确认所有分镜图片
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmAllImages, getScenesByProjectId } from '@/lib/db/scenes'
import { getProjectById } from '@/lib/db/projects'
import type { SceneWithMedia } from '@/types/database'

interface ConfirmAllImagesRequest {
  projectId: string
}

interface ConfirmAllImagesResponse {
  success: boolean
  confirmedCount: number
  scenes: SceneWithMedia[]
  message?: string
}

/**
 * POST /api/scenes/confirm-all-images
 * 确认所有分镜图片
 *
 * 请求体:
 * - projectId: 项目 ID
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取项目信息
 * 3. 验证所有分镜图片已生成
 * 4. 确认所有分镜图片
 * 5. 返回更新后的分镜列表
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
    const body: ConfirmAllImagesRequest = await request.json()
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

    // 4. 获取分镜列表，验证所有图片已生成
    const scenes = await getScenesByProjectId(projectId, user.id)

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found in this project' },
        { status: 400 }
      )
    }

    // 检查是否有未生成图片的分镜
    const uncompletedScenes = scenes.filter(
      (scene) => scene.image_status !== 'completed'
    )

    if (uncompletedScenes.length > 0) {
      return NextResponse.json(
        {
          error: `有 ${uncompletedScenes.length} 个分镜的图片尚未生成完成`,
          uncompletedSceneIds: uncompletedScenes.map((s) => s.id),
        },
        { status: 400 }
      )
    }

    // 5. 确认所有分镜图片
    const confirmedCount = await confirmAllImages(projectId, user.id)

    // 6. 获取更新后的分镜列表
    const updatedScenes = await getScenesByProjectId(projectId, user.id)

    const response: ConfirmAllImagesResponse = {
      success: true,
      confirmedCount,
      scenes: updatedScenes,
      message: `已确认 ${confirmedCount} 个分镜图片`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error confirming all images:', error)

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
      { error: 'Failed to confirm all images' },
      { status: 500 }
    )
  }
}
