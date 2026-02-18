/**
 * Spring FES Video - 数据库类型定义
 */

// ============================================
// 枚举类型
// ============================================

export type ProjectStage = 'draft' | 'scenes' | 'images' | 'videos' | 'completed';

export type MediaStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ============================================
// 数据库表类型
// ============================================

export interface Project {
  id: string;
  user_id: string;
  title: string;
  story: string;
  style: string;
  stage: ProjectStage;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  order_index: number;
  description: string;
  description_confirmed: boolean;
  image_status: MediaStatus;
  image_confirmed: boolean;
  video_status: MediaStatus;
  video_confirmed: boolean;
  created_at: string;
}

export interface Image {
  id: string;
  scene_id: string;
  storage_path: string;
  url: string;
  width: number | null;
  height: number | null;
  version: number;
  created_at: string;
}

export interface Video {
  id: string;
  scene_id: string;
  storage_path: string;
  url: string;
  duration: number | null;
  task_id: string | null;
  version: number;
  created_at: string;
}

// ============================================
// 关联类型（用于查询返回）
// ============================================

export interface SceneWithMedia extends Scene {
  image: Image | null;
  video: Video | null;
}

export interface ProjectWithScenes extends Project {
  scenes: SceneWithMedia[];
}

// ============================================
// 插入类型（用于创建）
// ============================================

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>;

export type SceneInsert = Omit<Scene, 'id' | 'created_at'>;

export type ImageInsert = Omit<Image, 'id' | 'created_at'>;

export type VideoInsert = Omit<Video, 'id' | 'created_at'>;

// ============================================
// 更新类型
// ============================================

export type ProjectUpdate = Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type SceneUpdate = Partial<Omit<Scene, 'id' | 'project_id' | 'created_at'>>;
