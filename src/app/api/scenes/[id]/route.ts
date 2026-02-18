/**
 * Scene API Route
 * PATCH /api/scenes/:id - 更新分镜描述
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSceneDescription, getSceneById } from '@/lib/db/scenes'
import type { Scene } from '@/types/database'

interface UpdateSceneRequest {
  description?: string
}

interface UpdateSceneResponse {
  success: boolean
  scene: Scene
  message?: string
}

/**
 * PATCH /api/scenes/:id
 * 更新分镜描述
 *
 * 流程:
 * 1. 验证用户认证
 * 2. 获取分镜 ID 和请求体
 * 3. 更新分镜描述
 * 4. 返回更新后的分镜
 */
export async function PATCH(
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

    // 2. 获取分镜 ID 和请求体
    const { id: sceneId } = await params

    if (!sceneId) {
      return NextResponse.json(
        { error: 'Scene ID is required' },
        { status: 400 }
      )
    }

    const body: UpdateSceneRequest = await request.json()

    if (!body.description || body.description.trim() === '') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // 3. 获取分镜信息（用于验证是否存在）
    const existingScene = await getSceneById(sceneId, user.id)

    if (!existingScene) {
      return NextResponse.json(
        { error: 'Scene not found or access denied' },
        { status: 404 }
      )
    }

    // 4. 更新分镜描述
    const updatedScene = await updateSceneDescription(
      sceneId,
      user.id,
      body.description.trim()
    )

    const response: UpdateSceneResponse = {
      success: true,
      scene: updatedScene,
      message: '分镜描述已更新',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating scene:', error)

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
      { error: 'Failed to update scene' },
      { status: 500 }
    )
  }
}
