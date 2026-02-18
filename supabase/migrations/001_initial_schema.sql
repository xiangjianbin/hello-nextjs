-- ============================================
-- Spring FES Video - 初始数据库 Schema
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. projects 表
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    story TEXT NOT NULL,
    style VARCHAR(100) NOT NULL,
    stage VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (stage IN ('draft', 'scenes', 'images', 'videos', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按用户查询项目
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
-- 索引：按阶段筛选
CREATE INDEX idx_projects_stage ON public.projects(stage);
-- 索引：按创建时间排序
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- 启用 RLS (Row Level Security)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的项目
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

-- RLS 策略：用户只能创建自己的项目
CREATE POLICY "Users can create their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能更新自己的项目
CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS 策略：用户只能删除自己的项目
CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. scenes 表
-- ============================================
CREATE TABLE IF NOT EXISTS public.scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    description TEXT NOT NULL,
    description_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    image_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (image_status IN ('pending', 'processing', 'completed', 'failed')),
    image_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    video_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (video_status IN ('pending', 'processing', 'completed', 'failed')),
    video_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按项目查询分镜
CREATE INDEX idx_scenes_project_id ON public.scenes(project_id);
-- 索引：按顺序排序
CREATE INDEX idx_scenes_order ON public.scenes(project_id, order_index);
-- 索引：按图片状态筛选
CREATE INDEX idx_scenes_image_status ON public.scenes(image_status);
-- 索引：按视频状态筛选
CREATE INDEX idx_scenes_video_status ON public.scenes(video_status);

-- 启用 RLS
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

-- RLS 策略：通过项目关联允许访问
CREATE POLICY "Users can view scenes of their projects" ON public.scenes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = scenes.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create scenes in their projects" ON public.scenes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = scenes.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update scenes in their projects" ON public.scenes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = scenes.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete scenes in their projects" ON public.scenes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = scenes.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- ============================================
-- 3. images 表
-- ============================================
CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按分镜查询图片
CREATE INDEX idx_images_scene_id ON public.images(scene_id);

-- 启用 RLS
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- RLS 策略：通过项目关联允许访问
CREATE POLICY "Users can view images of their projects" ON public.images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scenes
            JOIN public.projects ON projects.id = scenes.project_id
            WHERE scenes.id = images.scene_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create images in their projects" ON public.images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scenes
            JOIN public.projects ON projects.id = scenes.project_id
            WHERE scenes.id = images.scene_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete images in their projects" ON public.images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.scenes
            JOIN public.projects ON projects.id = scenes.project_id
            WHERE scenes.id = images.scene_id
            AND projects.user_id = auth.uid()
        )
    );

-- ============================================
-- 4. videos 表
-- ============================================
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    duration INTEGER, -- 视频时长（秒）
    task_id VARCHAR(255), -- 火山引擎任务ID
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引：按分镜查询视频
CREATE INDEX idx_videos_scene_id ON public.videos(scene_id);
-- 索引：按任务ID查询
CREATE INDEX idx_videos_task_id ON public.videos(task_id);

-- 启用 RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS 策略：通过项目关联允许访问
CREATE POLICY "Users can view videos of their projects" ON public.videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.scenes
            JOIN public.projects ON projects.id = scenes.project_id
            WHERE scenes.id = videos.scene_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create videos in their projects" ON public.videos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.scenes
            JOIN public.projects ON projects.id = scenes.project_id
            WHERE scenes.id = videos.scene_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update videos in their projects" ON public.videos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.scenes
            JOIN public.projects ON projects.id = scenes.project_id
            WHERE scenes.id = videos.scene_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete videos in their projects" ON public.videos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.scenes
            JOIN public.projects ON projects.id = scenes.project_id
            WHERE scenes.id = videos.scene_id
            AND projects.user_id = auth.uid()
        )
    );

-- ============================================
-- 5. 更新时间触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 projects 表添加更新时间触发器
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Storage Bucket
-- ============================================
-- 创建 project-media bucket（用于存储图片和视频）
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-media', 'project-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 策略：用户可以上传文件到自己的项目
CREATE POLICY "Users can upload files to their projects"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'project-media' AND
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.user_id = auth.uid()
        AND (storage.foldername(name))[1] = projects.id::text
    )
);

-- Storage RLS 策略：用户可以查看自己项目的文件
CREATE POLICY "Users can view files from their projects"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'project-media' AND
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.user_id = auth.uid()
        AND (storage.foldername(name))[1] = projects.id::text
    )
);

-- Storage RLS 策略：用户可以删除自己项目的文件
CREATE POLICY "Users can delete files from their projects"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'project-media' AND
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE projects.user_id = auth.uid()
        AND (storage.foldername(name))[1] = projects.id::text
    )
);

-- ============================================
-- 完成
-- ============================================
