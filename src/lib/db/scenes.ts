/**
 * Scene Data Access Layer
 * 分镜的 CRUD 和确认操作
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Scene,
  SceneInsert,
  SceneWithMedia,
} from '@/types/database'

/**
 * 场景数据（包含项目信息用于验证）
 */
interface SceneWithProject extends Scene {
  project: { user_id: string }
}

/**
 * 从场景数据中移除项目信息，返回纯场景数据
 */
function removeProjectField(data: SceneWithProject): Scene {
  const scene: Scene = {
    id: data.id,
    project_id: data.project_id,
    order_index: data.order_index,
    description: data.description,
    description_confirmed: data.description_confirmed,
    image_status: data.image_status,
    image_confirmed: data.image_confirmed,
    video_status: data.video_status,
    video_confirmed: data.video_confirmed,
    created_at: data.created_at,
  }
  return scene
}

/**
 * 验证用户是否拥有项目
 * @param projectId 项目 ID
 * @param userId 用户 ID
 * @returns 是否拥有
 */
async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return false
  }
  return true
}

/**
 * 批量创建分镜
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @param scenes 分镜数据列表
 * @returns 创建的分镜列表
 */
export async function createScenes(
  projectId: string,
  userId: string,
  scenes: Array<{
    orderIndex: number
    description: string
  }>
): Promise<Scene[]> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  const scenesData: SceneInsert[] = scenes.map((scene) => ({
    project_id: projectId,
    order_index: scene.orderIndex,
    description: scene.description,
    description_confirmed: false,
    image_status: 'pending',
    image_confirmed: false,
    video_status: 'pending',
    video_confirmed: false,
  }))

  const { data, error } = await supabase
    .from('scenes')
    .insert(scenesData)
    .select()

  if (error) {
    throw new Error(`Failed to create scenes: ${error.message}`)
  }

  return data
}

/**
 * 获取项目的分镜列表
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 分镜列表（包含媒体）
 */
export async function getScenesByProjectId(
  projectId: string,
  userId: string
): Promise<SceneWithMedia[]> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  // 获取分镜列表
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })

  if (scenesError) {
    throw new Error(`Failed to get scenes: ${scenesError.message}`)
  }

  // 如果没有分镜，返回空数组
  if (!scenes || scenes.length === 0) {
    return []
  }

  // 获取所有分镜的图片和视频
  const sceneIds = scenes.map((s) => s.id)

  const [imagesResult, videosResult] = await Promise.all([
    supabase.from('images').select('*').in('scene_id', sceneIds),
    supabase.from('videos').select('*').in('scene_id', sceneIds),
  ])

  if (imagesResult.error) {
    throw new Error(`Failed to get images: ${imagesResult.error.message}`)
  }
  if (videosResult.error) {
    throw new Error(`Failed to get videos: ${videosResult.error.message}`)
  }

  // 构建图片和视频的映射（按 version 降序，取最新版本）
  const latestImageMap = new Map<string, typeof imagesResult.data[0]>()
  const latestVideoMap = new Map<string, typeof videosResult.data[0]>()

  if (imagesResult.data) {
    for (const image of imagesResult.data) {
      const existing = latestImageMap.get(image.scene_id)
      if (!existing || image.version > existing.version) {
        latestImageMap.set(image.scene_id, image)
      }
    }
  }

  if (videosResult.data) {
    for (const video of videosResult.data) {
      const existing = latestVideoMap.get(video.scene_id)
      if (!existing || video.version > existing.version) {
        latestVideoMap.set(video.scene_id, video)
      }
    }
  }

  // 组装完整的分镜数据
  const scenesWithMedia: SceneWithMedia[] = scenes.map((scene) => ({
    ...scene,
    image: latestImageMap.get(scene.id) || null,
    video: latestVideoMap.get(scene.id) || null,
  }))

  return scenesWithMedia
}

/**
 * 获取单个分镜（验证权限）
 * @param sceneId 分镜 ID
 * @param userId 用户 ID
 * @returns 分镜数据
 */
export async function getSceneById(
  sceneId: string,
  userId: string
): Promise<Scene | null> {
  const supabase = await createClient()

  // 通过联表查询验证权限
  const { data, error } = await supabase
    .from('scenes')
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .eq('id', sceneId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get scene: ${error.message}`)
  }

  // 验证权限
  const sceneWithProject = data as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    return null
  }

  // 返回分镜数据（不包含 project）
  return removeProjectField(sceneWithProject)
}

/**
 * 更新分镜描述
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @param description 新描述
 * @returns 更新后的分镜
 */
export async function updateSceneDescription(
  sceneId: string,
  userId: string,
  description: string
): Promise<Scene> {
  const supabase = await createClient()

  // 通过联表更新并验证权限
  const { data, error } = await supabase
    .from('scenes')
    .update({ description })
    .eq('id', sceneId)
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Scene not found or access denied')
    }
    throw new Error(`Failed to update scene description: ${error.message}`)
  }

  // 验证权限
  const sceneWithProject = data as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    throw new Error('Scene not found or access denied')
  }

  // 返回分镜数据（不包含 project）
  return removeProjectField(sceneWithProject)
}

/**
 * 确认分镜描述
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 更新后的分镜
 */
export async function confirmSceneDescription(
  sceneId: string,
  userId: string
): Promise<Scene> {
  const supabase = await createClient()

  // 通过联表更新并验证权限
  const { data, error } = await supabase
    .from('scenes')
    .update({ description_confirmed: true })
    .eq('id', sceneId)
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Scene not found or access denied')
    }
    throw new Error(`Failed to confirm scene description: ${error.message}`)
  }

  // 验证权限
  const sceneWithProject = data as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    throw new Error('Scene not found or access denied')
  }

  // 返回分镜数据（不包含 project）
  return removeProjectField(sceneWithProject)
}

/**
 * 确认所有分镜描述
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 更新后的分镜数量
 */
export async function confirmAllDescriptions(
  projectId: string,
  userId: string
): Promise<number> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scenes')
    .update({ description_confirmed: true })
    .eq('project_id', projectId)
    .eq('description_confirmed', false)
    .select('id')

  if (error) {
    throw new Error(`Failed to confirm all descriptions: ${error.message}`)
  }

  return data?.length ?? 0
}

/**
 * 更新分镜图片状态
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @param status 图片状态
 * @returns 更新后的分镜
 */
export async function updateSceneImageStatus(
  sceneId: string,
  userId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<Scene> {
  const supabase = await createClient()

  // 通过联表更新并验证权限
  const { data, error } = await supabase
    .from('scenes')
    .update({ image_status: status })
    .eq('id', sceneId)
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Scene not found or access denied')
    }
    throw new Error(`Failed to update scene image status: ${error.message}`)
  }

  // 验证权限
  const sceneWithProject = data as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    throw new Error('Scene not found or access denied')
  }

  // 返回分镜数据（不包含 project）
  return removeProjectField(sceneWithProject)
}

/**
 * 确认分镜图片
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 更新后的分镜
 */
export async function confirmSceneImage(
  sceneId: string,
  userId: string
): Promise<Scene> {
  const supabase = await createClient()

  // 通过联表更新并验证权限
  const { data, error } = await supabase
    .from('scenes')
    .update({ image_confirmed: true })
    .eq('id', sceneId)
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Scene not found or access denied')
    }
    throw new Error(`Failed to confirm scene image: ${error.message}`)
  }

  // 验证权限
  const sceneWithProject = data as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    throw new Error('Scene not found or access denied')
  }

  // 返回分镜数据（不包含 project）
  return removeProjectField(sceneWithProject)
}

/**
 * 确认所有分镜图片
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 更新后的分镜数量
 */
export async function confirmAllImages(
  projectId: string,
  userId: string
): Promise<number> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scenes')
    .update({ image_confirmed: true })
    .eq('project_id', projectId)
    .eq('image_confirmed', false)
    .select('id')

  if (error) {
    throw new Error(`Failed to confirm all images: ${error.message}`)
  }

  return data?.length ?? 0
}

/**
 * 更新分镜视频状态
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @param status 视频状态
 * @returns 更新后的分镜
 */
export async function updateSceneVideoStatus(
  sceneId: string,
  userId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<Scene> {
  const supabase = await createClient()

  // 通过联表更新并验证权限
  const { data, error } = await supabase
    .from('scenes')
    .update({ video_status: status })
    .eq('id', sceneId)
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Scene not found or access denied')
    }
    throw new Error(`Failed to update scene video status: ${error.message}`)
  }

  // 验证权限
  const sceneWithProject = data as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    throw new Error('Scene not found or access denied')
  }

  // 返回分镜数据（不包含 project）
  return removeProjectField(sceneWithProject)
}

/**
 * 确认分镜视频
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 更新后的分镜
 */
export async function confirmSceneVideo(
  sceneId: string,
  userId: string
): Promise<Scene> {
  const supabase = await createClient()

  // 通过联表更新并验证权限
  const { data, error } = await supabase
    .from('scenes')
    .update({ video_confirmed: true })
    .eq('id', sceneId)
    .select(`
      *,
      project:projects!inner(user_id)
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Scene not found or access denied')
    }
    throw new Error(`Failed to confirm scene video: ${error.message}`)
  }

  // 验证权限
  const sceneWithProject = data as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    throw new Error('Scene not found or access denied')
  }

  // 返回分镜数据（不包含 project）
  return removeProjectField(sceneWithProject)
}

/**
 * 确认所有分镜视频
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 更新后的分镜数量
 */
export async function confirmAllVideos(
  projectId: string,
  userId: string
): Promise<number> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scenes')
    .update({ video_confirmed: true })
    .eq('project_id', projectId)
    .eq('video_confirmed', false)
    .select('id')

  if (error) {
    throw new Error(`Failed to confirm all videos: ${error.message}`)
  }

  return data?.length ?? 0
}

/**
 * 删除项目的所有分镜（重新生成时用）
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 删除的分镜数量
 */
export async function deleteScenesByProjectId(
  projectId: string,
  userId: string
): Promise<number> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  // 先获取要删除的分镜数量
  const { data: scenes, error: countError } = await supabase
    .from('scenes')
    .select('id')
    .eq('project_id', projectId)

  if (countError) {
    throw new Error(`Failed to count scenes: ${countError.message}`)
  }

  const count = scenes?.length ?? 0

  if (count === 0) {
    return 0
  }

  // 删除所有分镜（级联删除会自动删除关联的图片和视频）
  const { error } = await supabase
    .from('scenes')
    .delete()
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to delete scenes: ${error.message}`)
  }

  return count
}

/**
 * 获取待处理的分镜（description_confirmed=true 且 image_status=pending）
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 待处理的分镜列表
 */
export async function getScenesPendingImage(
  projectId: string,
  userId: string
): Promise<SceneWithMedia[]> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  // 获取待处理的分镜
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .eq('description_confirmed', true)
    .eq('image_status', 'pending')
    .order('order_index', { ascending: true })

  if (scenesError) {
    throw new Error(`Failed to get scenes pending image: ${scenesError.message}`)
  }

  if (!scenes || scenes.length === 0) {
    return []
  }

  // 返回不带媒体的分镜列表（图片还没生成）
  return scenes.map((scene) => ({
    ...scene,
    image: null,
    video: null,
  }))
}

/**
 * 获取待处理的分镜（image_confirmed=true 且 video_status=pending）
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 待处理的分镜列表（包含图片）
 */
export async function getScenesPendingVideo(
  projectId: string,
  userId: string
): Promise<SceneWithMedia[]> {
  // 验证用户是否拥有项目
  const isOwner = await verifyProjectOwnership(projectId, userId)
  if (!isOwner) {
    throw new Error('Project not found or access denied')
  }

  const supabase = await createClient()

  // 获取待处理的分镜
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .eq('image_confirmed', true)
    .eq('video_status', 'pending')
    .order('order_index', { ascending: true })

  if (scenesError) {
    throw new Error(`Failed to get scenes pending video: ${scenesError.message}`)
  }

  if (!scenes || scenes.length === 0) {
    return []
  }

  // 获取所有分镜的图片
  const sceneIds = scenes.map((s) => s.id)
  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('*')
    .in('scene_id', sceneIds)

  if (imagesError) {
    throw new Error(`Failed to get images: ${imagesError.message}`)
  }

  // 构建图片映射（按 version 降序，取最新版本）
  const latestImageMap = new Map<string, typeof images[0]>()
  if (images) {
    for (const image of images) {
      const existing = latestImageMap.get(image.scene_id)
      if (!existing || image.version > existing.version) {
        latestImageMap.set(image.scene_id, image)
      }
    }
  }

  // 返回带图片的分镜列表
  return scenes.map((scene) => ({
    ...scene,
    image: latestImageMap.get(scene.id) || null,
    video: null,
  }))
}
