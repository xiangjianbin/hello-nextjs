# Supabase 数据库配置说明

## 概述

本目录包含 Supabase 数据库的 migration 文件。

## 文件结构

```
supabase/
└── migrations/
    └── 001_initial_schema.sql  # 初始化数据库结构
```

## 如何应用 Migration

### 方法 1: Supabase CLI（推荐）

1. 安装 Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. 登录 Supabase:
   ```bash
   supabase login
   ```

3. 关联你的项目:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. 应用 migration:
   ```bash
   supabase db push
   ```

### 方法 2: Supabase Dashboard

1. 打开 Supabase Dashboard: https://supabase.com/dashboard
2. 选择你的项目
3. 进入 SQL Editor
4. 复制 `migrations/001_initial_schema.sql` 的内容
5. 点击 Run 执行

## 数据库结构

### 表结构

| 表名 | 描述 |
|------|------|
| `projects` | 项目表，存储用户的故事项目 |
| `scenes` | 分镜表，存储每个项目的分镜信息 |
| `images` | 图片表，存储分镜图片的元数据 |
| `videos` | 视频表，存储分镜视频的元数据 |

### 关系图

```
auth.users
    ↓ (user_id)
projects
    ↓ (project_id)
scenes
    ↓ (scene_id)
├── images
└── videos
```

### RLS 策略

所有表都启用了 Row Level Security (RLS)，确保：
- 用户只能访问自己创建的项目
- 用户只能操作自己项目中的分镜和媒体

### Storage Bucket

创建了 `project-media` bucket 用于存储：
- 分镜图片
- 分镜视频

文件路径格式：`{project_id}/{scene_id}/{filename}`

## 注意事项

1. 确保 Supabase 项目已启用 Auth 服务
2. 确保 `auth.users` 表可以正常使用
3. Migration 文件只需运行一次
4. 如需修改结构，请创建新的 migration 文件
