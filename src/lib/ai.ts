/**
 * AI 服务层 - 支持多模型切换（2026.07 更新）
 * 
 * 支持的模型：
 * - OpenAI (o3-mini, GPT-5, GPT-4o, GPT-4o-mini)
 * - Anthropic (Claude Opus 4, Claude Sonnet 4, Claude 3.5 Haiku)
 * - Google Gemini (Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash)
 * - 通义千问 (Qwen3-Max, Qwen3-Plus, Qwen3-Turbo, Qwen-Coder-Plus)
 * - 文心一言 (ERNIE 4.5, ERNIE 4.0, ERNIE 3.5)
 * - DeepSeek (DeepSeek-V3, DeepSeek-R1, DeepSeek-Coder-V3)
 * - 智谱 GLM (GLM-5, GLM-4-Plus, GLM-4-Flash)
 * - 月之暗面 Moonshot (Kimi-k2, Moonshot-v2-128k)
 * - 自定义 (任意兼容OpenAI格式的API)
 */

import { AIConfig, AIMessage, AIProvider } from '@/types';

// 各提供商的API端点
const API_ENDPOINTS: Record<AIProvider, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  tongyi: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  wenxin: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  moonshot: 'https://api.moonshot.cn/v1/chat/completions',
  custom: '',
};

// 各提供商的可选模型（2026.07 更新）
export const PROVIDER_MODELS: Record<AIProvider, { label: string; value: string; tag?: string }[]> = {
  openai: [
    { label: 'o3-mini', value: 'o3-mini', tag: '推理' },
    { label: 'GPT-5', value: 'gpt-5', tag: '最新' },
    { label: 'GPT-4o', value: 'gpt-4o', tag: '均衡' },
    { label: 'GPT-4o mini', value: 'gpt-4o-mini', tag: '快速' },
  ],
  anthropic: [
    { label: 'Claude Opus 4', value: 'claude-opus-4-20250514', tag: '最强' },
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514', tag: '均衡' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022', tag: '快速' },
  ],
  gemini: [
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro-preview-06-05', tag: '最强' },
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash-preview-05-20', tag: '均衡' },
    { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash', tag: '快速' },
    { label: 'Gemini 2.0 Flash Lite', value: 'gemini-2.0-flash-lite', tag: '轻量' },
  ],
  tongyi: [
    { label: 'Qwen3-Max', value: 'qwen3-max', tag: '最强' },
    { label: 'Qwen3-Plus', value: 'qwen3-plus', tag: '均衡' },
    { label: 'Qwen3-Turbo', value: 'qwen3-turbo', tag: '快速' },
    { label: 'Qwen-Coder-Plus', value: 'qwen-coder-plus', tag: '代码' },
  ],
  wenxin: [
    { label: 'ERNIE 4.5', value: 'ernie-4.5-8k-latest', tag: '最新' },
    { label: 'ERNIE 4.0', value: 'ernie-4.0-8k-latest', tag: '均衡' },
    { label: 'ERNIE 3.5', value: 'ernie-3.5-8k-latest', tag: '快速' },
  ],
  deepseek: [
    { label: 'DeepSeek-V3', value: 'deepseek-chat', tag: '最新' },
    { label: 'DeepSeek-R1', value: 'deepseek-reasoner', tag: '推理' },
    { label: 'DeepSeek-Coder-V3', value: 'deepseek-coder', tag: '代码' },
  ],
  zhipu: [
    { label: 'GLM-5', value: 'glm-5', tag: '最新' },
    { label: 'GLM-4-Plus', value: 'glm-4-plus', tag: '均衡' },
    { label: 'GLM-4-Flash', value: 'glm-4-flash', tag: '免费' },
  ],
  moonshot: [
    { label: 'Kimi-K2', value: 'kimi-k2', tag: '最新' },
    { label: 'Moonshot-v2-128K', value: 'moonshot-v2-128k', tag: '长文本' },
    { label: 'Moonshot-v1-8K', value: 'moonshot-v1-8k', tag: '快速' },
  ],
  custom: [
    { label: '自定义模型', value: 'custom' },
  ],
};

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google Gemini',
  tongyi: '通义千问 (阿里)',
  wenxin: '文心一言 (百度)',
  deepseek: 'DeepSeek',
  zhipu: '智谱 GLM',
  moonshot: '月之暗面 (Kimi)',
  custom: '自定义API',
};

// 提供商图标和颜色
export const PROVIDER_META: Record<AIProvider, { icon: string; color: string; description: string }> = {
  openai: { icon: '🟢', color: 'emerald', description: 'GPT-5 / o3-mini 推理强大' },
  anthropic: { icon: '🟠', color: 'orange', description: 'Claude 4 系列，安全可靠' },
  gemini: { icon: '💎', color: 'cyan', description: 'Gemini 2.5 Pro，Google最新旗舰' },
  tongyi: { icon: '🔵', color: 'blue', description: '阿里通义千问，中文优秀' },
  wenxin: { icon: '🔴', color: 'red', description: '百度文心一言，国产领先' },
  deepseek: { icon: '🟣', color: 'purple', description: 'DeepSeek-R1 推理王者' },
  zhipu: { icon: '🔷', color: 'sky', description: '智谱GLM-5，清华系' },
  moonshot: { icon: '🌙', color: 'indigo', description: 'Kimi 超长上下文' },
  custom: { icon: '⚙️', color: 'slate', description: '兼容OpenAI格式的自定义接口' },
};

/**
 * 调用AI接口（兼容 OpenAI / Anthropic 格式）
 */
export async function chatWithAI(
  config: AIConfig,
  messages: AIMessage[],
  onStream?: (text: string) => void
): Promise<string> {
  const endpoint = config.provider === 'custom' 
    ? config.apiUrl! 
    : API_ENDPOINTS[config.provider];

  if (!config.apiKey) {
    throw new Error('请先在设置中配置AI API Key');
  }

  // Anthropic 使用不同的请求格式
  if (config.provider === 'anthropic') {
    return await callAnthropic(config, messages, onStream);
  }

  // Google Gemini 使用不同的请求格式
  if (config.provider === 'gemini') {
    return await callGemini(config, messages, onStream);
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: !!onStream,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI接口错误 (${response.status}): ${err}`);
    }

    if (onStream && response.body) {
      return await handleStream(response.body, onStream);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '无响应内容';
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`AI调用失败: ${error.message}`);
    }
    throw new Error('AI调用失败: 未知错误');
  }
}

/**
 * Anthropic Claude API 专用调用
 */
async function callAnthropic(
  config: AIConfig,
  messages: AIMessage[],
  onStream?: (text: string) => void
): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  try {
    const response = await fetch(API_ENDPOINTS.anthropic, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2024-10-22',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: systemMsg,
        messages: chatMsgs,
        stream: !!onStream,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude接口错误 (${response.status}): ${err}`);
    }

    if (onStream && response.body) {
      return await handleAnthropicStream(response.body, onStream);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '无响应内容';
  } catch (error: unknown) {
    if (error instanceof Error) throw new Error(`Claude调用失败: ${error.message}`);
    throw new Error('Claude调用失败: 未知错误');
  }
}

/**
 * Google Gemini API 专用调用
 */
async function callGemini(
  config: AIConfig,
  messages: AIMessage[],
  onStream?: (text: string) => void
): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const model = config.model || 'gemini-2.5-flash-preview-05-20';
  const action = onStream ? 'streamGenerateContent' : 'generateContent';
  const endpoint = `${API_ENDPOINTS.gemini}/${model}:${action}?key=${config.apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatMsgs,
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini接口错误 (${response.status}): ${err}`);
    }

    if (onStream && response.body) {
      return await handleGeminiStream(response.body, onStream);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '无响应内容';
  } catch (error: unknown) {
    if (error instanceof Error) throw new Error(`Gemini调用失败: ${error.message}`);
    throw new Error('Gemini调用失败: 未知错误');
  }
}

/**
 * Gemini 流式响应处理
 */
async function handleGeminiStream(
  body: ReadableStream<Uint8Array>,
  onStream: (text: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    
    // Gemini streams JSON array chunks
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '[' || trimmed === ']' || trimmed === ',') continue;
      try {
        const cleanLine = trimmed.startsWith(',') ? trimmed.slice(1) : trimmed;
        const parsed = JSON.parse(cleanLine);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          fullText += text;
          onStream(fullText);
        }
      } catch { /* ignore parse errors on partial chunks */ }
    }
  }
  return fullText;
}

/**
 * Anthropic 流式响应处理
 */
async function handleAnthropicStream(
  body: ReadableStream<Uint8Array>,
  onStream: (text: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          fullText += parsed.delta.text;
          onStream(fullText);
        }
      } catch { /* ignore */ }
    }
  }
  return fullText;
}

/**
 * 处理流式响应
 */
async function handleStream(
  body: ReadableStream<Uint8Array>,
  onStream: (text: string) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          onStream(fullText);
        }
      } catch {
        // 忽略解析错误
      }
    }
  }

  return fullText;
}

// ==================== 预设Prompt模板 ====================

/**
 * AI解题助手 - 详细解析一道题
 */
export function buildExplainPrompt(question: string, options: string, answer: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `你是一位资深的公务员考试行测辅导专家，擅长将复杂的题目用简单易懂的方式讲解。
请提供以下内容：
1. 【题型识别】这道题属于什么题型
2. 【解题思路】一步步的解题思路
3. 【正确答案】并解释为什么正确
4. 【干扰项分析】分析每个错误选项的陷阱
5. 【知识点总结】涉及的核心知识点
6. 【记忆口诀】如果有的话，给出便于记忆的口诀
7. 【同类题技巧】解决这类题的通用技巧`,
    },
    {
      role: 'user',
      content: `请详细解析以下行测题目：\n\n${question}\n\n选项：\n${options}\n\n正确答案：${answer}`,
    },
  ];
}

/**
 * AI复盘分析 - 分析一组做题结果
 */
export function buildReviewPrompt(
  totalQuestions: number,
  correctCount: number,
  mistakes: { question: string; userAnswer: string; correctAnswer: string; module: string }[]
): AIMessage[] {
  const mistakeList = mistakes
    .map((m, i) => `${i + 1}. [${m.module}] ${m.question}\n   你的答案：${m.userAnswer}  正确答案：${m.correctAnswer}`)
    .join('\n\n');

  return [
    {
      role: 'system',
      content: `你是一位资深公务员考试行测辅导专家。请根据学生的做题结果进行全面复盘分析。
分析要求：
1. 【整体表现】正确率评价和整体评估
2. 【错误分类】按知识点/题型归类错误
3. 【错误原因分析】是知识盲点、粗心、还是方法不对
4. 【薄弱环节】指出最需要加强的模块
5. 【提分建议】针对性的学习建议和策略
6. 【练习计划】推荐接下来的练习重点`,
    },
    {
      role: 'user',
      content: `本次做题共${totalQuestions}题，答对${correctCount}题，正确率${Math.round(correctCount / totalQuestions * 100)}%。\n\n错题列表：\n${mistakeList}`,
    },
  ];
}

/**
 * 费曼学习法验证 - 检查用户的理解是否正确
 */
export function buildFeynmanCheckPrompt(question: string, answer: string, userExplanation: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `你是一位使用费曼学习法的行测辅导老师。学生用自己的话解释了一道题的答案，请：
1. 评估学生的理解是否正确和完整
2. 指出理解中的偏差或遗漏
3. 用更准确但仍然通俗的语言补充完善
4. 给出一个便于记忆的类比或例子
保持友好鼓励的语气。`,
    },
    {
      role: 'user',
      content: `题目：${question}\n正确答案：${answer}\n\n我的理解：${userExplanation}`,
    },
  ];
}

/**
 * 知识点拓展
 */
export function buildKnowledgeExpandPrompt(topic: string, module: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `你是行测知识点专家。请围绕给定知识点进行拓展，帮助学生构建知识网络。
请提供：
1. 核心概念解释
2. 相关知识点脉络（思维导图式）
3. 在行测中的常见考法
4. 易混淆点辨析
5. 记忆技巧和口诀
6. 预测可能出的变形题`,
    },
    {
      role: 'user',
      content: `模块：${module}\n知识点：${topic}`,
    },
  ];
}

/**
 * 举一反三 - 根据错题生成类似题目
 */
export function buildSimilarQuestionPrompt(
  question: string,
  answer: string,
  module: string,
  subType: string,
  explanation: string
): AIMessage[] {
  return [
    {
      role: 'system',
      content: `你是行测出题专家。根据给定的错题，生成3道同类型、同难度的练习题，帮助学生举一反三。

要求：
1. 每道题考查相同的知识点/题型，但换不同的角度
2. 难度与原题相当或稍有提升
3. 每道题都要有完整的题干、4个选项(A/B/C/D)、正确答案和解析
4. 解析中要指出该题与原题的共同知识点

请以如下JSON格式输出（确保JSON合法）：
[
  {
    "content": "题干内容",
    "options": [
      {"key": "A", "text": "选项A"},
      {"key": "B", "text": "选项B"},
      {"key": "C", "text": "选项C"},
      {"key": "D", "text": "选项D"}
    ],
    "answer": "正确答案字母",
    "explanation": "详细解析"
  }
]`,
    },
    {
      role: 'user',
      content: `原题：${question}\n正确答案：${answer}\n模块：${module}\n题型：${subType}\n原解析：${explanation}\n\n请生成3道类似的举一反三题目。`,
    },
  ];
}

/**
 * 每日AI复盘报告
 */
export function buildDailyReviewPrompt(
  date: string,
  totalQuestions: number,
  correctRate: number,
  timeSpent: number,
  moduleStats: { module: string; total: number; correct: number; avgTime: number }[],
  mistakes: { question: string; module: string; subType: string; errorType: string; wrongCount: number }[],
  recentTrend: { date: string; accuracy: number }[]
): AIMessage[] {
  const moduleStatsStr = moduleStats
    .map(m => `- ${m.module}: ${m.total}题, 正确${m.correct}题 (${m.total > 0 ? Math.round(m.correct / m.total * 100) : 0}%), 平均${m.avgTime.toFixed(0)}秒/题`)
    .join('\n');

  const mistakeStr = mistakes
    .map((m, i) => `${i + 1}. [${m.module}/${m.subType}] ${m.question.slice(0, 50)}... (错${m.wrongCount}次, 原因: ${m.errorType})`)
    .join('\n');

  const trendStr = recentTrend
    .map(t => `${t.date}: ${Math.round(t.accuracy * 100)}%`)
    .join(', ');

  return [
    {
      role: 'system',
      content: `你是一位专业的公务员考试行测辅导老师，正在给学生做每日学习复盘。
请根据今日的学习数据，生成一份专业、鼓励性的复盘报告。

报告需包含：
1. 【今日总结】整体表现评价（用鼓励但诚实的语气）
2. 【数据分析】各模块表现对比，找出优势和短板
3. 【错题诊断】分析错题模式，是知识盲点还是方法问题
4. 【进步追踪】与近期趋势对比，指出进步或退步
5. 【提分策略】针对今天暴露的问题，给出具体的学习建议
6. 【明日计划】推荐明天重点练习的模块和题型
7. 【心态调整】根据表现给予恰当的激励和心态建议

语气要求：像一位温暖但专业的老师，既要指出问题也要鼓励学生`,
    },
    {
      role: 'user',
      content: `日期：${date}
今日数据：共做${totalQuestions}题，正确率${Math.round(correctRate * 100)}%，用时${Math.round(timeSpent / 60)}分钟

各模块数据：
${moduleStatsStr}

今日错题（按严重程度排序）：
${mistakeStr}

近期正确率趋势：${trendStr}

请生成今日复盘报告。`,
    },
  ];
}

/**
 * 错题类型提醒 prompt
 */
export function buildMistakeAlertPrompt(
  subType: string,
  errorPattern: string,
  wrongCount: number
): AIMessage[] {
  return [
    {
      role: 'system',
      content: `你是行测辅导老师。学生在某个题型上反复犯错，请给出针对性的提醒和改进建议。
要求简短有力（100字以内），包含：
1. 提醒学生注意这个题型
2. 指出可能的错误原因
3. 给出一个具体的改进技巧`,
    },
    {
      role: 'user',
      content: `题型：${subType}\n错误模式：${errorPattern}\n已错${wrongCount}次`,
    },
  ];
}
