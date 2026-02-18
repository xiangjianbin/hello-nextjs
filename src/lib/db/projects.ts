/**
 * Project Data Access Layer
 * 项目的 CRUD 操作
 */

import { createClient } from '@/lib/supabase/server'
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectWithScenes,
  ProjectStage,
} from '@/types/database'

/**
 * 创建项目
 * @param userId 用户 ID
 * @param title 项目标题
 * @param story 故事内容
 * @param style 视频风格
 * @returns 创建的项目
 */
export async function createProject(
  userId: string,
  title: string,
  story: string,
  style: string
): Promise<Project> {
  const supabase = await createClient()

  const projectData: ProjectInsert = {
    user_id: userId,
    title,
    story,
    style,
    stage: 'draft',
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create project: ${error.message}`)
  }

  return data
}

/**
 * 获取用户项目列表
 * @param userId 用户 ID
 * @param options 分页选项
 * @returns 项目列表
 */
export async function getProjects(
  userId: string,
  options?: {
    page?: number
    pageSize?: number
  }
): Promise<{ projects: Project[]; total: number }> {
  const supabase = await createClient()

  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 10
  const offset = (page - 1) * pageSize

  // 获取总数
  const { count, error: countError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    throw new Error(`Failed to count projects: ${countError.message}`)
  }

  // 获取项目列表
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    throw new Error(`Failed to get projects: ${error.message}`)
  }

  return {
    projects: data,
    total: count ?? 0,
  }
}

/**
 * 获取单个项目（含分镜和媒体）
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @returns 项目详情（包含分镜和媒体）
 */
export async function getProjectById(
  projectId: string,
  userId: string
): Promise<ProjectWithScenes | null> {
  const supabase = await createClient()

  // 获取项目基本信息
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      // 项目不存在或不属于该用户
      return null
    }
    throw new Error(`Failed to get project: ${projectError.message}`)
  }

  // 获取项目的分镜列表
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })

  if (scenesError) {
    throw new Error(`Failed to get scenes: ${scenesError.message}`)
  }

  // 如果没有分镜，直接返回
  if (!scenes || scenes.length === 0) {
    return {
      ...project,
      scenes: [],
    }
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

  // 组装完整的项目数据
  const scenesWithMedia = scenes.map((scene) => ({
    ...scene,
    image: latestImageMap.get(scene.id) || null,
    video: latestVideoMap.get(scene.id) || null,
  }))

  return {
    ...project,
    scenes: scenesWithMedia,
  }
}

/**
 * 更新项目
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @param updates 更新内容
 * @returns 更新后的项目
 */
export async function updateProject(
  projectId: string,
  userId: string,
  updates: ProjectUpdate
): Promise<Project> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Project not found or access denied')
    }
    throw new Error(`Failed to update project: ${error.message}`)
  }

  return data
}

/**
 * 更新项目阶段
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 * @param stage 新阶段
 * @returns 更新后的项目
 */
export async function updateProjectStage(
  projectId: string,
  userId: string,
  stage: ProjectStage
): Promise<Project> {
  return updateProject(projectId, userId, { stage })
}

/**
 * 删除项目
 * @param projectId 项目 ID
 * @param userId 用户 ID（用于权限验证）
 */
export async function deleteProject(
  projectId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`)
  }
}
