/**
 * Batch Video Generation API Route
 * POST /api/generate/videos - 批量创建所有分镜视频任务
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getScenesPendingVideo,
  updateSceneVideoStatus,
} from '@/lib/db/scenes'
import { getProjectById, updateProjectStage } from '@/lib/db/projects'
import {
  createVideo,
  getLatestImage,
  cleanupOldVideoFiles,
} from '@/lib/db/media'
import { generateVideoFromImage } from '@/lib/ai/aliyun-video'
import { AIGenerationError } from '@/types/ai'
import type { SceneWithMedia, Video } from '@/types/database'

interface GenerateVideosRequest {
  projectId: string
}

interface GeneratedVideoResult {
  sceneId: string
  success: boolean
  video?: Video
  taskId?: string
  error?: string
}

interface GenerateVideosResponse {
  success: boolean
  results: GeneratedVideoResult[]
  successCount: number
  failedCount: number
  message?: string
}

/**
 * 为单个分镜创建视频任务
 */
async function createVideoTaskForScene(
  scene: SceneWithMedia,
  userId: string
): Promise<{ success: boolean; video?: Video; taskId?: string; error?: string }> {
  try {
    // 更新状态为 processing
    await updateSceneVideoStatus(scene.id, userId, 'processing')

    // 获取分镜的图片
    const latestImage = await getLatestImage(scene.id, userId)
    if (!latestImage) {
      await updateSceneVideoStatus(scene.id, userId, 'failed')
      return { success: false, error: 'No image found for this scene' }
    }

    // 调用火山引擎视频生成 API
    const videoResponse = await generateVideoFromImage(
      latestImage.url,
      scene.description // 使用分镜描述作为提示词
    )

    console.log(`Video task created for scene ${scene.id}: ${videoResponse.task_id}`)

    // 清理旧视频文件
    await cleanupOldVideoFiles(scene.project_id, scene.id)

    // 创建视频记录（保存 task_id）
    const video = await createVideo(scene.id, userId, {
      storagePath: '', // 临时为空，状态查询成功后更新
      url: '', // 临时为空，状态查询成功后更新
      taskId: videoResponse.task_id,
      duration: null,
    })

    return { success: true, video, taskId: videoResponse.task_id }
  } catch (error) {
    // 更新状态为 failed
    await updateSceneVideoStatus(scene.id, userId, 'failed')

    const errorMessage =
      error instanceof AIGenerationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error'

    console.error(`Video task creation failed for scene ${scene.id}:`, errorMessage, error)
    return { success: false, error: errorMessage }
  }
}

/**
 * POST /api/generate/videos
 * 批量创建所有分镜视频任务
 *
 * 请求体:
 * - projectId: 项目 ID
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取项目信息
 * 3. 获取待生成视频的分镜列表（image_confirmed=true 且 video_status=pending）
 * 4. 遍历分镜，依次创建视频任务
 * 5. 更新项目 stage 为 'videos'
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
    const body: GenerateVideosRequest = await request.json()
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

    // 4. 获取待生成视频的分镜列表
    const scenesToProcess = await getScenesPendingVideo(projectId, user.id)

    if (scenesToProcess.length === 0) {
      return NextResponse.json(
        {
          success: true,
          results: [],
          successCount: 0,
          failedCount: 0,
          message: '没有待生成视频的分镜（请先确认分镜图片）',
        },
        { status: 200 }
      )
    }

    console.log(
      `Starting batch video task creation for ${scenesToProcess.length} scenes`
    )

    // 5. 遍历分镜，依次创建视频任务
    // 注意：这里采用顺序处理，视频生成消耗资源较大
    const results: GeneratedVideoResult[] = []

    for (const scene of scenesToProcess) {
      console.log(`Creating video task for scene ${scene.id} (${scene.order_index})`)

      const result = await createVideoTaskForScene(scene, user.id)

      results.push({
        sceneId: scene.id,
        success: result.success,
        video: result.video,
        taskId: result.taskId,
        error: result.error,
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    console.log(
      `Batch video task creation completed: ${successCount} success, ${failedCount} failed`
    )

    // 6. 更新项目 stage 为 'videos'（即使有部分失败，只要有成功的）
    if (successCount > 0) {
      await updateProjectStage(projectId, user.id, 'videos')
    }

    const response: GenerateVideosResponse = {
      success: failedCount === 0,
      results,
      successCount,
      failedCount,
      message:
        failedCount === 0
          ? `成功创建 ${successCount} 个视频任务`
          : `成功 ${successCount} 个，失败 ${failedCount} 个`,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in batch video task creation:', error)

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
      { error: 'Failed to create video tasks' },
      { status: 500 }
    )
  }
}
