/**
 * Media Data Access Layer
 * 图片和视频的数据访问和存储操作
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Image,
  ImageInsert,
  Video,
  VideoInsert,
} from '@/types/database'

// Storage bucket 名称
const STORAGE_BUCKET = 'project-media'

/**
 * 场景数据（包含项目信息用于验证）
 */
interface SceneWithProject {
  id: string
  project_id: string
  project: { user_id: string }
}

/**
 * 验证用户是否拥有场景（通过项目）
 * @param sceneId 场景 ID
 * @param userId 用户 ID
 * @returns 场景数据（包含项目ID）或 null
 */
async function verifySceneOwnership(
  sceneId: string,
  userId: string
): Promise<SceneWithProject | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('scenes')
    .select(`
      id,
      project_id,
      project:projects!inner(user_id)
    `)
    .eq('id', sceneId)
    .single()

  if (error || !data) {
    return null
  }

  const sceneWithProject = data as unknown as SceneWithProject
  if (sceneWithProject.project.user_id !== userId) {
    return null
  }

  return sceneWithProject
}

/**
 * 获取场景的下一个媒体版本号
 * @param sceneId 场景 ID
 * @param mediaType 媒体类型 ('image' | 'video')
 * @returns 下一个版本号
 */
async function getNextVersion(
  sceneId: string,
  mediaType: 'image' | 'video'
): Promise<number> {
  const supabase = await createClient()
  const table = mediaType === 'image' ? 'images' : 'videos'

  const { data, error } = await supabase
    .from(table)
    .select('version')
    .eq('scene_id', sceneId)
    .order('version', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    return 1
  }

  return data[0].version + 1
}

// ============================================
// Storage 操作
// ============================================

/**
 * 上传图片到 Supabase Storage
 * @param projectId 项目 ID
 * @param sceneId 场景 ID
 * @param file 图片 Buffer 或 File
 * @param filename 文件名
 * @returns 存储路径和公开 URL
 */
export async function uploadImageToStorage(
  projectId: string,
  sceneId: string,
  file: Buffer | File,
  filename: string
): Promise<{ path: string; url: string }> {
  const supabase = await createClient()

  // 构建存储路径: {project_id}/{scene_id}/images/{filename}
  const storagePath = `${projectId}/${sceneId}/images/${filename}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: 'image/png',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // 获取公开 URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath)

  return {
    path: storagePath,
    url: urlData.publicUrl,
  }
}

/**
 * 上传视频到 Supabase Storage
 * @param projectId 项目 ID
 * @param sceneId 场景 ID
 * @param file 视频 Buffer 或 File
 * @param filename 文件名
 * @returns 存储路径和公开 URL
 */
export async function uploadVideoToStorage(
  projectId: string,
  sceneId: string,
  file: Buffer | File,
  filename: string
): Promise<{ path: string; url: string }> {
  const supabase = await createClient()

  // 构建存储路径: {project_id}/{scene_id}/videos/{filename}
  const storagePath = `${projectId}/${sceneId}/videos/${filename}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: 'video/mp4',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload video: ${error.message}`)
  }

  // 获取公开 URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath)

  return {
    path: storagePath,
    url: urlData.publicUrl,
  }
}

/**
 * 从 Supabase Storage 删除文件
 * @param storagePath 存储路径
 */
export async function deleteFromStorage(storagePath: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath])

  if (error) {
    throw new Error(`Failed to delete from storage: ${error.message}`)
  }
}

/**
 * 批量删除 Storage 中的文件
 * @param storagePaths 存储路径列表
 */
export async function deleteMultipleFromStorage(
  storagePaths: string[]
): Promise<void> {
  if (storagePaths.length === 0) return

  const supabase = await createClient()

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(storagePaths)

  if (error) {
    throw new Error(`Failed to delete files from storage: ${error.message}`)
  }
}

/**
 * 删除场景的所有图片文件
 * @param projectId 项目 ID
 * @param sceneId 场景 ID
 */
export async function deleteSceneImageFiles(
  projectId: string,
  sceneId: string
): Promise<void> {
  const supabase = await createClient()
  const folderPath = `${projectId}/${sceneId}/images`

  // 列出文件夹中的所有文件
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folderPath)

  if (error) {
    // 文件夹可能不存在，忽略错误
    return
  }

  if (!data || data.length === 0) {
    return
  }

  // 删除所有文件
  const filesToDelete = data.map((file) => `${folderPath}/${file.name}`)
  await deleteMultipleFromStorage(filesToDelete)
}

/**
 * 删除场景的所有视频文件
 * @param projectId 项目 ID
 * @param sceneId 场景 ID
 */
export async function deleteSceneVideoFiles(
  projectId: string,
  sceneId: string
): Promise<void> {
  const supabase = await createClient()
  const folderPath = `${projectId}/${sceneId}/videos`

  // 列出文件夹中的所有文件
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folderPath)

  if (error) {
    // 文件夹可能不存在，忽略错误
    return
  }

  if (!data || data.length === 0) {
    return
  }

  // 删除所有文件
  const filesToDelete = data.map((file) => `${folderPath}/${file.name}`)
  await deleteMultipleFromStorage(filesToDelete)
}

// ============================================
// 数据库操作 - 图片
// ============================================

/**
 * 创建图片记录（version 自动+1）
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @param imageData 图片数据
 * @returns 创建的图片记录
 */
export async function createImage(
  sceneId: string,
  userId: string,
  imageData: {
    storagePath: string
    url: string
    width?: number | null
    height?: number | null
  }
): Promise<Image> {
  // 验证权限并获取场景信息
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  // 获取下一个版本号
  const version = await getNextVersion(sceneId, 'image')

  const imageInsert: ImageInsert = {
    scene_id: sceneId,
    storage_path: imageData.storagePath,
    url: imageData.url,
    width: imageData.width ?? null,
    height: imageData.height ?? null,
    version,
  }

  const { data, error } = await supabase
    .from('images')
    .insert(imageInsert)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create image record: ${error.message}`)
  }

  return data
}

/**
 * 获取场景的最新图片
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 最新版本的图片
 */
export async function getLatestImage(
  sceneId: string,
  userId: string
): Promise<Image | null> {
  // 验证权限
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('scene_id', sceneId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get latest image: ${error.message}`)
  }

  return data
}

/**
 * 获取场景的所有图片（按版本降序）
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 图片列表
 */
export async function getImagesBySceneId(
  sceneId: string,
  userId: string
): Promise<Image[]> {
  // 验证权限
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('scene_id', sceneId)
    .order('version', { ascending: false })

  if (error) {
    throw new Error(`Failed to get images: ${error.message}`)
  }

  return data ?? []
}

/**
 * 删除场景的所有图片记录
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @param deleteFiles 是否同时删除 Storage 文件
 * @returns 删除的图片数量
 */
export async function deleteImagesBySceneId(
  sceneId: string,
  userId: string,
  deleteFiles: boolean = false
): Promise<number> {
  // 验证权限并获取场景信息
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  // 先获取图片数量和路径
  const { data: images, error: fetchError } = await supabase
    .from('images')
    .select('id, storage_path')
    .eq('scene_id', sceneId)

  if (fetchError) {
    throw new Error(`Failed to fetch images: ${fetchError.message}`)
  }

  const count = images?.length ?? 0

  if (count === 0) {
    return 0
  }

  // 删除数据库记录
  const { error } = await supabase
    .from('images')
    .delete()
    .eq('scene_id', sceneId)

  if (error) {
    throw new Error(`Failed to delete images: ${error.message}`)
  }

  // 如果需要，删除 Storage 文件
  if (deleteFiles && images) {
    const storagePaths = images
      .map((img) => img.storage_path)
      .filter(Boolean)
    await deleteMultipleFromStorage(storagePaths)
  }

  return count
}

// ============================================
// 数据库操作 - 视频
// ============================================

/**
 * 创建视频记录
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @param videoData 视频数据
 * @returns 创建的视频记录
 */
export async function createVideo(
  sceneId: string,
  userId: string,
  videoData: {
    storagePath: string
    url: string
    duration?: number | null
    taskId?: string | null
  }
): Promise<Video> {
  // 验证权限并获取场景信息
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  // 获取下一个版本号
  const version = await getNextVersion(sceneId, 'video')

  const videoInsert: VideoInsert = {
    scene_id: sceneId,
    storage_path: videoData.storagePath,
    url: videoData.url,
    duration: videoData.duration ?? null,
    task_id: videoData.taskId ?? null,
    version,
  }

  const { data, error } = await supabase
    .from('videos')
    .insert(videoInsert)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create video record: ${error.message}`)
  }

  return data
}

/**
 * 更新视频记录（用于更新 taskId 或 duration）
 * @param videoId 视频 ID
 * @param userId 用户 ID（用于权限验证）
 * @param updates 更新内容
 * @returns 更新后的视频记录
 */
export async function updateVideo(
  videoId: string,
  userId: string,
  updates: {
    url?: string
    storagePath?: string
    duration?: number | null
    taskId?: string | null
  }
): Promise<Video> {
  const supabase = await createClient()

  // 通过联表更新并验证权限
  const updateData: Record<string, unknown> = {}
  if (updates.url !== undefined) updateData.url = updates.url
  if (updates.storagePath !== undefined) updateData.storage_path = updates.storagePath
  if (updates.duration !== undefined) updateData.duration = updates.duration
  if (updates.taskId !== undefined) updateData.task_id = updates.taskId

  const { data, error } = await supabase
    .from('videos')
    .update(updateData)
    .eq('id', videoId)
    .select(`
      *,
      scene:scenes!inner(
        project:projects!inner(user_id)
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Video not found or access denied')
    }
    throw new Error(`Failed to update video: ${error.message}`)
  }

  // 验证权限
  const videoWithScene = data as unknown as {
    id: string
    scene: { project: { user_id: string } }
  }
  if (videoWithScene.scene.project.user_id !== userId) {
    throw new Error('Video not found or access denied')
  }

  // 返回视频数据（不包含 scene）
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single()

  if (videoError) {
    throw new Error(`Failed to get updated video: ${videoError.message}`)
  }

  return video
}

/**
 * 获取场景的最新视频
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 最新版本的视频
 */
export async function getLatestVideo(
  sceneId: string,
  userId: string
): Promise<Video | null> {
  // 验证权限
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('scene_id', sceneId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get latest video: ${error.message}`)
  }

  return data
}

/**
 * 根据 taskId 获取视频
 * @param taskId 火山引擎任务 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 视频记录
 */
export async function getVideoByTaskId(
  taskId: string,
  userId: string
): Promise<Video | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      scene:scenes!inner(
        project:projects!inner(user_id)
      )
    `)
    .eq('task_id', taskId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to get video by task id: ${error.message}`)
  }

  // 验证权限
  const videoWithScene = data as unknown as Video & {
    scene: { project: { user_id: string } }
  }
  if (videoWithScene.scene.project.user_id !== userId) {
    return null
  }

  // 返回视频数据（不包含 scene）
  const { id, scene_id, storage_path, url, duration, task_id, version, created_at } = data
  return {
    id,
    scene_id,
    storage_path,
    url,
    duration,
    task_id,
    version,
    created_at,
  }
}

/**
 * 获取场景的所有视频（按版本降序）
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 视频列表
 */
export async function getVideosBySceneId(
  sceneId: string,
  userId: string
): Promise<Video[]> {
  // 验证权限
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('scene_id', sceneId)
    .order('version', { ascending: false })

  if (error) {
    throw new Error(`Failed to get videos: ${error.message}`)
  }

  return data ?? []
}

/**
 * 删除场景的所有视频记录
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @param deleteFiles 是否同时删除 Storage 文件
 * @returns 删除的视频数量
 */
export async function deleteVideosBySceneId(
  sceneId: string,
  userId: string,
  deleteFiles: boolean = false
): Promise<number> {
  // 验证权限并获取场景信息
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  // 先获取视频数量和路径
  const { data: videos, error: fetchError } = await supabase
    .from('videos')
    .select('id, storage_path')
    .eq('scene_id', sceneId)

  if (fetchError) {
    throw new Error(`Failed to fetch videos: ${fetchError.message}`)
  }

  const count = videos?.length ?? 0

  if (count === 0) {
    return 0
  }

  // 删除数据库记录
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('scene_id', sceneId)

  if (error) {
    throw new Error(`Failed to delete videos: ${error.message}`)
  }

  // 如果需要，删除 Storage 文件
  if (deleteFiles && videos) {
    const storagePaths = videos
      .map((vid) => vid.storage_path)
      .filter(Boolean)
    await deleteMultipleFromStorage(storagePaths)
  }

  return count
}

// ============================================
// 组合操作
// ============================================

/**
 * 获取分镜的所有媒体（图片和视频）
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 分镜的媒体数据
 */
export async function getMediaBySceneId(
  sceneId: string,
  userId: string
): Promise<{ images: Image[]; videos: Video[] }> {
  // 验证权限
  const sceneInfo = await verifySceneOwnership(sceneId, userId)
  if (!sceneInfo) {
    throw new Error('Scene not found or access denied')
  }

  const supabase = await createClient()

  const [imagesResult, videosResult] = await Promise.all([
    supabase
      .from('images')
      .select('*')
      .eq('scene_id', sceneId)
      .order('version', { ascending: false }),
    supabase
      .from('videos')
      .select('*')
      .eq('scene_id', sceneId)
      .order('version', { ascending: false }),
  ])

  if (imagesResult.error) {
    throw new Error(`Failed to get images: ${imagesResult.error.message}`)
  }
  if (videosResult.error) {
    throw new Error(`Failed to get videos: ${videosResult.error.message}`)
  }

  return {
    images: imagesResult.data ?? [],
    videos: videosResult.data ?? [],
  }
}

/**
 * 获取分镜的最新媒体
 * @param sceneId 分镜 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 最新的图片和视频
 */
export async function getLatestMediaBySceneId(
  sceneId: string,
  userId: string
): Promise<{ image: Image | null; video: Video | null }> {
  const media = await getMediaBySceneId(sceneId, userId)

  return {
    image: media.images.length > 0 ? media.images[0] : null,
    video: media.videos.length > 0 ? media.videos[0] : null,
  }
}

/**
 * 重新生成图片时清理旧文件（保留数据库记录用于版本历史）
 * @param projectId 项目 ID
 * @param sceneId 场景 ID
 */
export async function cleanupOldImageFiles(
  projectId: string,
  sceneId: string
): Promise<void> {
  await deleteSceneImageFiles(projectId, sceneId)
}

/**
 * 重新生成视频时清理旧文件（保留数据库记录用于版本历史）
 * @param projectId 项目 ID
 * @param sceneId 场景 ID
 */
export async function cleanupOldVideoFiles(
  projectId: string,
  sceneId: string
): Promise<void> {
  await deleteSceneVideoFiles(projectId, sceneId)
}

/**
 * 删除分镜的所有媒体（重新生成时用）
 * @param sceneId 场景 ID
 * @param userId 用户 ID（用于权限验证）
 * @param deleteFiles 是否同时删除 Storage 文件
 * @returns 删除的媒体数量
 */
export async function deleteAllMediaBySceneId(
  sceneId: string,
  userId: string,
  deleteFiles: boolean = false
): Promise<{ imagesDeleted: number; videosDeleted: number }> {
  const imagesDeleted = await deleteImagesBySceneId(sceneId, userId, deleteFiles)
  const videosDeleted = await deleteVideosBySceneId(sceneId, userId, deleteFiles)

  return { imagesDeleted, videosDeleted }
}
