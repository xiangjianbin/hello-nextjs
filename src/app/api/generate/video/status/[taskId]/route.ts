/**
 * Video Task Status Query API Route
 * GET /api/generate/video/status/:taskId - 查询视频任务状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVideoByTaskId, updateVideo, uploadVideoToStorage } from '@/lib/db/media'
import { getSceneById, updateSceneVideoStatus } from '@/lib/db/scenes'
import { getVideoTaskStatus, downloadVideo } from '@/lib/ai/aliyun-video'
import { AIGenerationError } from '@/types/ai'
import type { Video as DbVideo } from '@/types/database'

interface VideoStatusResponse {
  success: boolean
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video?: DbVideo
  error?: string
  message?: string
}

interface RouteParams {
  params: Promise<{ taskId: string }>
}

/**
 * GET /api/generate/video/status/:taskId
 * 查询视频任务状态
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 根据 taskId 获取视频记录
 * 3. 调用火山引擎 API 查询任务状态
 * 4. 如果任务成功，下载视频并上传到 Storage
 * 5. 保存视频记录，更新 video_status 为 'completed'
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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

    // 2. 获取 taskId
    const { taskId } = await params
    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing task ID' },
        { status: 400 }
      )
    }

    // 3. 根据 taskId 获取视频记录（验证权限）
    const existingVideo = await getVideoByTaskId(taskId, user.id)
    if (!existingVideo) {
      return NextResponse.json(
        { error: 'Video task not found or access denied' },
        { status: 404 }
      )
    }

    // 4. 调用火山引擎 API 查询任务状态
    const taskStatus = await getVideoTaskStatus(taskId)

    console.log(`Video task ${taskId} status: ${taskStatus.status}`)

    // 5. 根据状态处理
    if (taskStatus.status === 'completed' && taskStatus.video_url) {
      // 任务成功，下载视频并上传到 Storage
      const videoBuffer = await downloadVideo(taskStatus.video_url)

      // 获取场景信息（用于构建存储路径）
      const scene = await getSceneById(existingVideo.scene_id, user.id)
      if (!scene) {
        return NextResponse.json(
          { error: 'Scene not found' },
          { status: 404 }
        )
      }

      // 生成文件名
      const filename = `video-${Date.now()}.mp4`

      // 上传到 Supabase Storage
      const { path: storagePath, url: publicUrl } = await uploadVideoToStorage(
        scene.project_id,
        existingVideo.scene_id,
        videoBuffer,
        filename
      )

      console.log(`Video uploaded to storage: ${storagePath}`)

      // 更新视频记录
      const updatedVideo = await updateVideo(existingVideo.id, user.id, {
        url: publicUrl,
        storagePath,
        duration: taskStatus.duration ?? null,
        taskId: taskId, // 保持 taskId
      })

      // 更新分镜 video_status 为 'completed'
      await updateSceneVideoStatus(existingVideo.scene_id, user.id, 'completed')

      const response: VideoStatusResponse = {
        success: true,
        taskId,
        status: 'completed',
        video: updatedVideo,
        message: '视频生成完成',
      }

      return NextResponse.json(response, { status: 200 })
    } else if (taskStatus.status === 'failed') {
      // 任务失败
      await updateSceneVideoStatus(existingVideo.scene_id, user.id, 'failed')

      const response: VideoStatusResponse = {
        success: false,
        taskId,
        status: 'failed',
        error: taskStatus.error || '视频生成失败',
      }

      return NextResponse.json(response, { status: 200 })
    } else {
      // 任务进行中 (pending 或 processing)
      const response: VideoStatusResponse = {
        success: true,
        taskId,
        status: taskStatus.status,
        message: taskStatus.status === 'pending'
          ? '视频任务等待处理中'
          : '视频生成中，请稍后查询',
      }

      return NextResponse.json(response, { status: 200 })
    }
  } catch (error) {
    console.error('Error querying video task status:', error)

    // 处理已知错误类型
    if (error instanceof AIGenerationError) {
      return NextResponse.json(
        { error: `查询视频状态失败: ${error.message}` },
        { status: 500 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('not found or access denied')) {
        return NextResponse.json(
          { error: 'Video task not found or access denied' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to query video task status' },
      { status: 500 }
    )
  }
}
