/**
 * Single Scene Image Generation API Route
 * POST /api/generate/image/:sceneId - 为单个分镜生成图片
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSceneById, updateSceneImageStatus } from '@/lib/db/scenes'
import { getProjectById } from '@/lib/db/projects'
import {
  createImage,
  uploadImageToStorage,
  cleanupOldImageFiles,
} from '@/lib/db/media'
import { generateSceneImage, downloadImage } from '@/lib/ai/aliyun-image'
import { AIGenerationError } from '@/types/ai'
import type { Image } from '@/types/database'

interface GenerateImageResponse {
  success: boolean
  image: Image
  message?: string
}

interface RouteParams {
  params: Promise<{ sceneId: string }>
}

/**
 * POST /api/generate/image/:sceneId
 * 为单个分镜生成图片
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取分镜信息
 * 3. 获取项目风格
 * 4. 调用火山引擎图片生成 API
 * 5. 下载图片
 * 6. 上传到 Supabase Storage
 * 7. 保存图片记录到数据库
 * 8. 更新分镜 image_status 为 'completed'
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

    // 验证分镜描述已确认
    if (!scene.description_confirmed) {
      return NextResponse.json(
        { error: 'Scene description must be confirmed before generating image' },
        { status: 400 }
      )
    }

    // 3. 获取项目风格
    const project = await getProjectById(scene.project_id, user.id)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 更新状态为 processing
    await updateSceneImageStatus(sceneId, user.id, 'processing')

    try {
      // 4. 调用火山引擎图片生成 API
      const imageResponse = await generateSceneImage(
        scene.description,
        undefined, // visual prompt
        project.style
      )

      console.log(`Image generated for scene ${sceneId}: ${imageResponse.image_url}`)

      // 5. 下载图片
      const imageBuffer = await downloadImage(imageResponse.image_url)

      // 6. 上传到 Supabase Storage
      // 清理旧图片文件
      await cleanupOldImageFiles(scene.project_id, sceneId)

      // 生成文件名
      const filename = `image-${Date.now()}.png`

      const { path: storagePath, url: publicUrl } = await uploadImageToStorage(
        scene.project_id,
        sceneId,
        imageBuffer,
        filename
      )

      console.log(`Image uploaded to storage: ${storagePath}`)

      // 7. 保存图片记录到数据库
      const image = await createImage(sceneId, user.id, {
        storagePath,
        url: publicUrl,
        width: 1024, // 默认尺寸
        height: 1024,
      })

      // 8. 更新分镜 image_status 为 'completed'
      await updateSceneImageStatus(sceneId, user.id, 'completed')

      const response: GenerateImageResponse = {
        success: true,
        image,
        message: '图片生成成功',
      }

      return NextResponse.json(response, { status: 201 })
    } catch (generationError) {
      // 图片生成失败，更新状态
      await updateSceneImageStatus(sceneId, user.id, 'failed')
      throw generationError
    }
  } catch (error) {
    console.error('Error generating image:', error)

    // 处理已知错误类型
    if (error instanceof AIGenerationError) {
      return NextResponse.json(
        { error: `图片生成失败: ${error.message}` },
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
    }

    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
