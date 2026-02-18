/**
 * Confirm All Videos API Route
 * POST /api/scenes/confirm-all-videos - 确认所有分镜视频，更新项目 stage 为 'completed'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmAllVideos, getScenesByProjectId } from '@/lib/db/scenes'
import { getProjectById, updateProjectStage } from '@/lib/db/projects'
import type { SceneWithMedia, Project } from '@/types/database'

interface ConfirmAllVideosRequest {
  projectId: string
}

interface ConfirmAllVideosResponse {
  success: boolean
  confirmedCount: number
  scenes: SceneWithMedia[]
  project: Project
  message?: string
}

/**
 * POST /api/scenes/confirm-all-videos
 * 确认所有分镜视频，更新项目 stage 为 'completed'
 *
 * 请求体:
 * - projectId: 项目 ID
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取项目信息
 * 3. 验证所有分镜视频已生成
 * 4. 确认所有分镜视频
 * 5. 更新项目 stage 为 'completed'
 * 6. 返回更新后的分镜列表和项目信息
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
    const body: ConfirmAllVideosRequest = await request.json()
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

    // 4. 获取分镜列表，验证所有视频已生成
    const scenes = await getScenesByProjectId(projectId, user.id)

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found in this project' },
        { status: 400 }
      )
    }

    // 检查是否有未生成视频的分镜
    const uncompletedScenes = scenes.filter(
      (scene) => scene.video_status !== 'completed'
    )

    if (uncompletedScenes.length > 0) {
      return NextResponse.json(
        {
          error: `有 ${uncompletedScenes.length} 个分镜的视频尚未生成完成`,
          uncompletedSceneIds: uncompletedScenes.map((s) => s.id),
        },
        { status: 400 }
      )
    }

    // 5. 确认所有分镜视频
    const confirmedCount = await confirmAllVideos(projectId, user.id)

    // 6. 更新项目 stage 为 'completed'
    const updatedProject = await updateProjectStage(projectId, user.id, 'completed')

    // 7. 获取更新后的分镜列表
    const updatedScenes = await getScenesByProjectId(projectId, user.id)

    const response: ConfirmAllVideosResponse = {
      success: true,
      confirmedCount,
      scenes: updatedScenes,
      project: updatedProject,
      message: `已确认 ${confirmedCount} 个分镜视频，项目已完成！`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error confirming all videos:', error)

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
      { error: 'Failed to confirm all videos' },
      { status: 500 }
    )
  }
}
