/**
 * Batch Image Generation API Route
 * POST /api/generate/images - 批量生成所有分镜图片
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getScenesPendingImage,
  updateSceneImageStatus,
} from '@/lib/db/scenes'
import { getProjectById, updateProjectStage } from '@/lib/db/projects'
import {
  createImage,
  uploadImageToStorage,
  cleanupOldImageFiles,
} from '@/lib/db/media'
import { generateSceneImage, downloadImage } from '@/lib/ai/aliyun-image'
import { AIGenerationError } from '@/types/ai'
import type { SceneWithMedia, Image } from '@/types/database'

interface GenerateImagesRequest {
  projectId: string
}

interface GeneratedImageResult {
  sceneId: string
  success: boolean
  image?: Image
  error?: string
}

interface GenerateImagesResponse {
  success: boolean
  results: GeneratedImageResult[]
  successCount: number
  failedCount: number
  message?: string
}

/**
 * 为单个分镜生成图片
 */
async function generateImageForScene(
  scene: SceneWithMedia,
  style: string,
  userId: string
): Promise<{ success: boolean; image?: Image; error?: string }> {
  try {
    // 更新状态为 processing
    await updateSceneImageStatus(scene.id, userId, 'processing')

    // 调用火山引擎图片生成 API
    const imageResponse = await generateSceneImage(
      scene.description,
      undefined,
      style
    )

    console.log(`Image generated for scene ${scene.id}: ${imageResponse.image_url}`)

    // 下载图片
    const imageBuffer = await downloadImage(imageResponse.image_url)

    // 清理旧图片文件
    await cleanupOldImageFiles(scene.project_id, scene.id)

    // 生成文件名
    const filename = `image-${Date.now()}.png`

    // 上传到 Supabase Storage
    const { path: storagePath, url: publicUrl } = await uploadImageToStorage(
      scene.project_id,
      scene.id,
      imageBuffer,
      filename
    )

    // 保存图片记录到数据库
    const image = await createImage(scene.id, userId, {
      storagePath,
      url: publicUrl,
      width: 1024,
      height: 1024,
    })

    // 更新分镜 image_status 为 'completed'
    await updateSceneImageStatus(scene.id, userId, 'completed')

    return { success: true, image }
  } catch (error) {
    // 更新状态为 failed
    await updateSceneImageStatus(scene.id, userId, 'failed')

    const errorMessage =
      error instanceof AIGenerationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown error'

    return { success: false, error: errorMessage }
  }
}

/**
 * POST /api/generate/images
 * 批量生成所有分镜图片
 *
 * 请求体:
 * - projectId: 项目 ID
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取项目信息
 * 3. 获取待生成图片的分镜列表（description_confirmed=true 且 image_status=pending）
 * 4. 遍历分镜，依次生成图片
 * 5. 更新项目 stage 为 'images'
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
    const body: GenerateImagesRequest = await request.json()
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

    // 4. 获取待生成图片的分镜列表
    const scenesToProcess = await getScenesPendingImage(projectId, user.id)

    if (scenesToProcess.length === 0) {
      return NextResponse.json(
        {
          success: true,
          results: [],
          successCount: 0,
          failedCount: 0,
          message: '没有待生成图片的分镜（请先确认分镜描述）',
        },
        { status: 200 }
      )
    }

    console.log(
      `Starting batch image generation for ${scenesToProcess.length} scenes`
    )

    // 5. 遍历分镜，依次生成图片
    // 注意：这里采用顺序处理，避免并发过高触发 API 限流
    const results: GeneratedImageResult[] = []

    for (const scene of scenesToProcess) {
      console.log(`Generating image for scene ${scene.id} (${scene.order_index})`)

      const result = await generateImageForScene(
        scene,
        project.style,
        user.id
      )

      results.push({
        sceneId: scene.id,
        success: result.success,
        image: result.image,
        error: result.error,
      })
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    console.log(
      `Batch image generation completed: ${successCount} success, ${failedCount} failed`
    )

    // 6. 更新项目 stage 为 'images'（即使有部分失败，只要有成功的）
    if (successCount > 0) {
      await updateProjectStage(projectId, user.id, 'images')
    }

    const response: GenerateImagesResponse = {
      success: failedCount === 0,
      results,
      successCount,
      failedCount,
      message:
        failedCount === 0
          ? `成功生成 ${successCount} 张图片`
          : `成功 ${successCount} 张，失败 ${failedCount} 张`,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error in batch image generation:', error)

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
      { error: 'Failed to generate images' },
      { status: 500 }
    )
  }
}
