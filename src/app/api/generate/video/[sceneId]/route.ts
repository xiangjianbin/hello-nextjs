/**
 * Single Scene Video Generation API Route
 * POST /api/generate/video/:sceneId - 为单个分镜创建视频任务
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSceneById, updateSceneVideoStatus } from '@/lib/db/scenes'
import { getProjectById } from '@/lib/db/projects'
import {
  createVideo,
  getLatestImage,
  cleanupOldVideoFiles,
} from '@/lib/db/media'
import { generateVideoFromImage } from '@/lib/ai/aliyun-video'
import { AIGenerationError } from '@/types/ai'
import type { Video } from '@/types/database'

interface GenerateVideoResponse {
  success: boolean
  video?: Video
  taskId?: string
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

interface RouteParams {
  params: Promise<{ sceneId: string }>
}

/**
 * POST /api/generate/video/:sceneId
 * 为单个分镜创建视频任务
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取分镜信息
 * 3. 验证图片已确认
 * 4. 获取分镜的图片
 * 5. 调用火山引擎视频生成 API 创建任务
 * 6. 保存 task_id 到数据库
 * 7. 更新分镜 video_status 为 'processing'
 */
export async function POST(
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

    // 2. 获取分镜信息
    const { sceneId } = await params
    if (!sceneId) {
      return NextResponse.json(
        { error: 'Missing scene ID' },
        { status: 400 }
      )
    }

    const scene = await getSceneById(sceneId, user.id)
    if (!scene) {
      return NextResponse.json(
        { error: 'Scene not found or access denied' },
        { status: 404 }
      )
    }

    // 验证图片已确认
    if (!scene.image_confirmed) {
      return NextResponse.json(
        { error: 'Scene image must be confirmed before generating video' },
        { status: 400 }
      )
    }

    // 3. 获取分镜的图片
    const latestImage = await getLatestImage(sceneId, user.id)
    if (!latestImage) {
      return NextResponse.json(
        { error: 'No image found for this scene. Please generate image first.' },
        { status: 400 }
      )
    }

    // 下载图片并转换为 Base64 格式
    // 阿里云 API 对 Base64 图片支持更好
    let imageBase64: string | undefined
    console.log(`Downloading image from: ${latestImage.url}`)

    try {
      const imageResponse = await fetch(latestImage.url)
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.arrayBuffer()
        const base64 = Buffer.from(imageBuffer).toString('base64')
        imageBase64 = `data:image/png;base64,${base64}`
        console.log(`Image converted to Base64, size: ${base64.length} characters`)
      } else {
        console.error(`Failed to download image: ${imageResponse.status}`)
      }
    } catch (downloadError) {
      console.error(`Error downloading image: ${downloadError}`)
    }

    // 4. 获取项目信息（用于获取描述作为提示词）

    // 4. 获取项目信息（用于获取描述作为提示词）
    const project = await getProjectById(scene.project_id, user.id)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 更新状态为 processing
    await updateSceneVideoStatus(sceneId, user.id, 'processing')

    try {
      // 5. 调用阿里云百炼视频生成 API 创建任务
      // 使用 Base64 图片和分镜描述生成视频
      const videoResponse = await generateVideoFromImage(
        imageBase64 || latestImage.url, // 优先使用 Base64，回退到 URL
        scene.description // 使用分镜描述作为提示词
      )

      console.log(`Video task created for scene ${sceneId}: ${videoResponse.task_id}`)

      // 6. 创建视频记录（保存 task_id）
      // 先清理旧视频文件
      await cleanupOldVideoFiles(scene.project_id, sceneId)

      // 创建一个临时视频记录，包含 task_id
      // 后续通过状态查询 API 更新 url 和 duration
      const video = await createVideo(sceneId, user.id, {
        storagePath: '', // 临时为空，状态查询成功后更新
        url: '', // 临时为空，状态查询成功后更新
        taskId: videoResponse.task_id,
        duration: null,
      })

      const response: GenerateVideoResponse = {
        success: true,
        video,
        taskId: videoResponse.task_id,
        status: 'processing',
        message: '视频任务已创建，请轮询查询状态',
      }

      return NextResponse.json(response, { status: 201 })
    } catch (generationError) {
      // 视频生成失败，更新状态
      await updateSceneVideoStatus(sceneId, user.id, 'failed')
      throw generationError
    }
  } catch (error) {
    console.error('Error creating video task:', error)

    // 处理已知错误类型
    if (error instanceof AIGenerationError) {
      return NextResponse.json(
        { error: `视频任务创建失败: ${error.message}` },
        { status: 500 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('not found or access denied')) {
        return NextResponse.json(
          { error: 'Scene not found or access denied' },
          { status: 404 }
        )
      }
      if (error.message.includes('must be confirmed')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('No image found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create video task' },
      { status: 500 }
    )
  }
}
