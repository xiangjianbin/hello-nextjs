/**
 * Confirm Scene Video API Route
 * POST /api/scenes/:id/confirm-video - 确认单个分镜视频
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmSceneVideo, getSceneById } from '@/lib/db/scenes'
import type { Scene } from '@/types/database'

interface ConfirmVideoResponse {
  success: boolean
  scene: Scene
  message?: string
}

/**
 * POST /api/scenes/:id/confirm-video
 * 确认单个分镜视频
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取分镜 ID
 * 3. 验证分镜视频已生成
 * 4. 确认分镜视频
 * 5. 返回更新后的分镜
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // 2. 获取分镜 ID
    const { id: sceneId } = await params

    if (!sceneId) {
      return NextResponse.json(
        { error: 'Scene ID is required' },
        { status: 400 }
      )
    }

    // 3. 获取分镜信息（用于验证是否存在和视频状态）
    const existingScene = await getSceneById(sceneId, user.id)

    if (!existingScene) {
      return NextResponse.json(
        { error: 'Scene not found or access denied' },
        { status: 404 }
      )
    }

    // 验证视频已生成
    if (existingScene.video_status !== 'completed') {
      return NextResponse.json(
        { error: 'Video has not been generated yet' },
        { status: 400 }
      )
    }

    // 4. 确认分镜视频
    const updatedScene = await confirmSceneVideo(sceneId, user.id)

    const response: ConfirmVideoResponse = {
      success: true,
      scene: updatedScene,
      message: '分镜视频已确认',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error confirming scene video:', error)

    // 处理已知错误类型
    if (error instanceof Error) {
      if (error.message.includes('not found or access denied')) {
        return NextResponse.json(
          { error: 'Scene not found or access denied' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to confirm scene video' },
      { status: 500 }
    )
  }
}
