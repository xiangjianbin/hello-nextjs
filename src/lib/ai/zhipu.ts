/**
 * 智谱AI API 封装
 * 用于调用 GLM 模型进行文本生成
 */

import { retry } from "@/lib/utils";
import {
  type ZhipuModel,
  type ZhipuMessage,
  type ZhipuChatCompletionRequest,
  type ZhipuChatCompletionResponse,
  type ZhipuErrorResponse,
  type StoryToScenesRequest,
  type StoryToScenesResponse,
  type SceneDescription,
  AIGenerationError,
} from "@/types/ai";

// ==================== 配置 ====================

const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEFAULT_MODEL: ZhipuModel = "glm-4-flash";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 60000; // 60 seconds

// ==================== 故事转分镜 Prompt 模板 ====================

const STORY_TO_SCENES_SYSTEM_PROMPT = `你是一个专业的视频脚本编剧。你的任务是将用户的故事拆解成适合制作视频的分镜脚本。

## 输出要求
1. 分析故事内容，将其拆分为 5-12 个关键场景
2. 每个场景需要有清晰的视觉描述
3. 场景之间要有连贯性，能够完整讲述故事
4. 每个场景包含：
   - 描述：场景中发生的事情（用于理解故事）
   - 视觉提示：用于 AI 图片生成的详细视觉描述

## 风格指南
根据用户指定的风格，调整描述的：
- 色调和氛围
- 视觉风格（写实、卡通、水墨等）
- 构图方式
- 光影效果

## 输出格式
请严格按照以下 JSON 格式输出，不要添加任何其他内容：

{
  "title": "项目标题（简洁概括故事主题）",
  "scenes": [
    {
      "order_index": 1,
      "description": "场景描述：发生了什么...",
      "visual_prompt": "详细的视觉描述，用于生成图片，包含场景、人物、动作、风格等"
    }
  ]
}`;

const STORY_TO_SCENES_USER_PROMPT_TEMPLATE = `请将以下故事拆解为视频分镜：

## 故事内容
{story}

## 视觉风格
{style}

请输出 JSON 格式的分镜脚本。`;

// ==================== 核心函数 ====================

/**
 * 获取智谱AI API Key
 */
function getApiKey(): string {
  const apiKey = process.env.ZHIPU_API_KEY;
  if (!apiKey) {
    throw new AIGenerationError(
      "ZHIPU_API_KEY 环境变量未配置",
      "zhipu"
    );
  }
  return apiKey;
}

/**
 * 发送 Chat Completion 请求
 */
async function chatCompletionRequest(
  request: ZhipuChatCompletionRequest
): Promise<ZhipuChatCompletionResponse> {
  const apiKey = getApiKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || DEFAULT_MODEL,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        top_p: request.top_p ?? 0.9,
        max_tokens: request.max_tokens ?? 4096,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = (await response.json()) as ZhipuErrorResponse;
      throw new AIGenerationError(
        errorData.error?.message || `API 请求失败: ${response.status}`,
        "zhipu",
        errorData
      );
    }

    return (await response.json()) as ZhipuChatCompletionResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AIGenerationError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new AIGenerationError(
          "API 请求超时",
          "zhipu",
          error
        );
      }
      throw new AIGenerationError(
        `API 请求失败: ${error.message}`,
        "zhipu",
        error
      );
    }

    throw new AIGenerationError(
      "API 请求发生未知错误",
      "zhipu",
      error
    );
  }
}

/**
 * 调用智谱AI Chat Completion API（带重试）
 */
export async function chatCompletion(
  messages: ZhipuMessage[],
  options: {
    model?: ZhipuModel;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  } = {}
): Promise<string> {
  const request: ZhipuChatCompletionRequest = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature,
    top_p: options.top_p,
    max_tokens: options.max_tokens,
  };

  const response = await retry(
    () => chatCompletionRequest(request),
    MAX_RETRIES,
    RETRY_DELAY
  );

  return response.choices[0]?.message?.content || "";
}

/**
 * 故事转分镜
 * 将用户故事拆解为视频分镜描述
 */
export async function storyToScenes(
  request: StoryToScenesRequest
): Promise<StoryToScenesResponse> {
  const userPrompt = STORY_TO_SCENES_USER_PROMPT_TEMPLATE
    .replace("{story}", request.story)
    .replace("{style}", request.style);

  const messages: ZhipuMessage[] = [
    { role: "system", content: STORY_TO_SCENES_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  // 添加场景数量提示
  if (request.sceneCount) {
    messages[1].content += `\n\n请生成约 ${request.sceneCount} 个场景。`;
  }

  try {
    const content = await chatCompletion(messages, {
      temperature: 0.8, // 稍高一点温度增加创意性
    });

    // 解析 JSON 响应
    const result = parseStoryToScenesResponse(content);
    return result;
  } catch (error) {
    if (error instanceof AIGenerationError) {
      throw error;
    }
    throw new AIGenerationError(
      `故事转分镜失败: ${error instanceof Error ? error.message : "未知错误"}`,
      "zhipu",
      error
    );
  }
}

/**
 * 解析故事转分镜响应
 */
function parseStoryToScenesResponse(content: string): StoryToScenesResponse {
  // 尝试提取 JSON 内容
  let jsonStr = content;

  // 如果响应包含 markdown 代码块，提取其中的 JSON
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as {
      title?: string;
      scenes: Array<{
        order_index: number;
        description: string;
        visual_prompt?: string;
      }>;
    };

    // 验证并规范化场景数据
    const scenes: SceneDescription[] = parsed.scenes.map((scene, index) => ({
      order_index: scene.order_index ?? index + 1,
      description: scene.description,
      visual_prompt: scene.visual_prompt || scene.description,
    }));

    return {
      scenes,
      title: parsed.title,
    };
  } catch (parseError) {
    throw new AIGenerationError(
      `解析分镜 JSON 失败: ${parseError instanceof Error ? parseError.message : "未知错误"}`,
      "zhipu",
      { rawContent: content, parseError }
    );
  }
}

/**
 * 重新生成分镜
 * 使用相同的故事和风格重新生成不同的分镜方案
 */
export async function regenerateScenes(
  request: StoryToScenesRequest
): Promise<StoryToScenesResponse> {
  // 添加随机性提示以获得不同的结果
  const modifiedRequest: StoryToScenesRequest = {
    ...request,
    story: request.story + "\n\n[请生成与之前不同的创意方案]",
  };

  return storyToScenes(modifiedRequest);
}

/**
 * 生成单个场景的优化描述
 */
export async function refineSceneDescription(
  originalDescription: string,
  style: string
): Promise<string> {
  const messages: ZhipuMessage[] = [
    {
      role: "system",
      content: "你是一个视频脚本优化助手。请优化用户提供的场景描述，使其更加生动、具体，适合视频制作。保持原有含义，但增强视觉效果和情感表达。",
    },
    {
      role: "user",
      content: `请优化以下场景描述：\n\n${originalDescription}\n\n视觉风格：${style}`,
    },
  ];

  return chatCompletion(messages, {
    temperature: 0.7,
  });
}

// ==================== 导出类型 ====================

export type {
  ZhipuModel,
  ZhipuMessage,
  ZhipuChatCompletionRequest,
  ZhipuChatCompletionResponse,
  StoryToScenesRequest,
  StoryToScenesResponse,
  SceneDescription,
};
