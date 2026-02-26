'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSettings, getRecords, getMistakeQuestionIds, getDailyStats, getProgress } from '@/lib/storage';
import { getQuestionById } from '@/data';
import { chatWithAI, buildExplainPrompt, buildReviewPrompt, buildFeynmanCheckPrompt, buildKnowledgeExpandPrompt, buildSimilarQuestionPrompt, buildDailyReviewPrompt, PROVIDER_LABELS, PROVIDER_META, PROVIDER_MODELS } from '@/lib/ai';
import { AIConfig, AIMessage, AIProvider, Module } from '@/types';
import { getMistakeCategories, getTopPriorityMistakes } from '@/lib/mistakeManager';
import Link from 'next/link';

type ChatMode = 'explain' | 'review' | 'feynman' | 'knowledge' | 'similar' | 'daily' | 'free';

const MODE_INFO: Record<ChatMode, { icon: string; label: string; desc: string; gradient: string }> = {
  daily:     { icon: '📅', label: '每日复盘', desc: '今日AI学习报告',  gradient: 'from-purple-500 to-indigo-600' },
  review:    { icon: '📊', label: '复盘分析', desc: '分析做题数据',    gradient: 'from-blue-500 to-cyan-500' },
  similar:   { icon: '🔄', label: '举一反三', desc: '错题变式训练',    gradient: 'from-orange-500 to-amber-500' },
  explain:   { icon: '📖', label: '题目解析', desc: '深度逐项分析',    gradient: 'from-emerald-500 to-teal-500' },
  feynman:   { icon: '🧑‍🏫', label: '费曼验证', desc: '检验你的理解',  gradient: 'from-pink-500 to-rose-500' },
  knowledge: { icon: '🔗', label: '知识拓展', desc: '构建知识网络',    gradient: 'from-sky-500 to-blue-500' },
  free:      { icon: '💬', label: '自由问答', desc: '想问什么都行',    gradient: 'from-slate-500 to-slate-600' },
};

function AIPageContent() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('free');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const settings = getSettings();
    setConfig(settings.aiConfig);

    // Handle URL params for direct actions
    const mode = searchParams.get('mode');
    const questionId = searchParams.get('questionId');
    const topic = searchParams.get('topic');
    const module = searchParams.get('module');

    if (mode === 'explain' && questionId) {
      handleExplainQuestion(questionId, settings.aiConfig);
    } else if (mode === 'similar' && questionId) {
      handleSimilarQuestion(questionId, settings.aiConfig);
    } else if (mode === 'knowledge' && topic && module) {
      handleKnowledgeExpand(topic, module, settings.aiConfig);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  // 直接解析某道题
  const handleExplainQuestion = async (questionId: string, aiConfig: AIConfig) => {
    const q = getQuestionById(questionId);
    if (!q) return;
    setChatMode('explain');
    const optionsStr = q.options.map(o => `${o.key}. ${o.text}`).join('\n');
    setMessages([{ role: 'user', content: `请详细解析这道题：\n${q.content}\n\n${optionsStr}` }]);
    const prompt = buildExplainPrompt(q.content, optionsStr, q.answer);
    await doSendMessage(aiConfig, prompt);
  };

  // 举一反三
  const handleSimilarQuestion = async (questionId: string, aiConfig: AIConfig) => {
    const q = getQuestionById(questionId);
    if (!q) return;
    setChatMode('similar');
    setMessages([{ role: 'user', content: `🔄 请为这道错题生成举一反三的类似题目：\n${q.content.slice(0, 100)}...` }]);
    const prompt = buildSimilarQuestionPrompt(q.content, q.answer, q.module, q.subType, q.explanation);
    await doSendMessage(aiConfig, prompt);
  };

  // 知识拓展
  const handleKnowledgeExpand = async (topic: string, module: string, aiConfig: AIConfig) => {
    setChatMode('knowledge');
    setMessages([{ role: 'user', content: `📚 请拓展知识点：${module} - ${topic}` }]);
    const prompt = buildKnowledgeExpandPrompt(topic, module);
    await doSendMessage(aiConfig, prompt);
  };

  // 每日 AI 复盘
  const handleDailyReview = async () => {
    setChatMode('daily');
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = getDailyStats();
    const todayStats = dailyStats[today];
    const records = getRecords();
    const progress = getProgress();
    const topMistakes = getTopPriorityMistakes(8);

    if (!todayStats || todayStats.totalQuestions === 0) {
      setMessages([{ role: 'assistant', content: '今天还没有做题记录。先去刷几道题，我再帮你做每日复盘！\n\n建议今日目标：至少做 20 题 📝' }]);
      return;
    }

    // 构建模块统计
    const modules: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
    const moduleStats = modules.map(m => ({
      module: m,
      total: todayStats.moduleStats[m]?.total || 0,
      correct: todayStats.moduleStats[m]?.correct || 0,
      avgTime: progress.moduleProgress[m]?.avgTime || 0,
    })).filter(m => m.total > 0);

    // 构建错题信息
    const mistakeInfo = topMistakes.map(mc => {
      const q = getQuestionById(mc.questionId);
      return {
        question: q?.content.slice(0, 60) || '???',
        module: mc.module,
        subType: mc.subType,
        errorType: mc.errorType,
        wrongCount: mc.wrongCount,
      };
    });

    // 最近10天的正确率趋势
    const recentDays: { date: string; accuracy: number }[] = [];
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dailyStats[dateStr];
      if (dayData && dayData.totalQuestions > 0) {
        recentDays.push({
          date: dateStr,
          accuracy: dayData.correctCount / dayData.totalQuestions,
        });
      }
    }

    setMessages([{ role: 'user', content: `📅 请生成今日 (${today}) 的 AI 复盘报告` }]);

    const prompt = buildDailyReviewPrompt(
      today,
      todayStats.totalQuestions,
      todayStats.correctCount / todayStats.totalQuestions,
      todayStats.totalTime,
      moduleStats,
      mistakeInfo,
      recentDays
    );
    await doSendMessage(config!, prompt);
  };

  const doSendMessage = async (aiConfig: AIConfig, msgs: AIMessage[]) => {
    if (!aiConfig?.apiKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ 请先在 [设置页面](/settings) 配置AI API Key后再使用此功能。\n\n支持的AI服务：OpenAI、通义千问、文心一言、DeepSeek、自定义API。'
      }]);
      return;
    }

    setLoading(true);
    setStreamText('');

    try {
      const response = await chatWithAI(aiConfig, msgs, (text) => {
        setStreamText(text);
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response || streamText }]);
      setStreamText('');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ AI调用失败：${errorMsg}\n\n请检查API Key是否正确，或稍后再试。`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!config) return;

    const msgs: AIMessage[] = [
      { role: 'system', content: '你是一位专业的公务员考试行测辅导老师。请用中文回答。' },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: input }
    ];

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    await doSendMessage(config, msgs);
  };

  const handleQuickAction = async (mode: ChatMode) => {
    setChatMode(mode);

    if (mode === 'daily') {
      handleDailyReview();
      return;
    }

    if (mode === 'review') {
      const records = getRecords();
      const recent = records.slice(-50);
      const total = recent.length;
      const correct = recent.filter(r => r.isCorrect).length;
      const mistakes = recent
        .filter(r => !r.isCorrect)
        .map(r => {
          const q = getQuestionById(r.questionId);
          return q ? {
            question: q.content.slice(0, 100),
            userAnswer: r.userAnswer,
            correctAnswer: q.answer,
            module: q.module,
          } : null;
        })
        .filter(Boolean) as { question: string; userAnswer: string; correctAnswer: string; module: string }[];

      if (total === 0) {
        setMessages([{ role: 'assistant', content: '你还没有做过题，先去[刷题中心](/practice)做几道题吧！' }]);
        return;
      }

      const prompt = buildReviewPrompt(total, correct, mistakes.slice(0, 10));
      setMessages([{ role: 'user', content: `请分析我最近的${total}道做题记录（正确${correct}道，错误${total - correct}道）` }]);
      await doSendMessage(config!, prompt);
      return;
    }

    if (mode === 'similar') {
      const mistakeIds = getMistakeQuestionIds();
      if (mistakeIds.length === 0) {
        setMessages([{ role: 'assistant', content: '你还没有错题！先去做题，有了错题后我就能帮你举一反三了 📝' }]);
        return;
      }
      // 随机选一道错题举一反三
      const randomId = mistakeIds[Math.floor(Math.random() * mistakeIds.length)];
      handleSimilarQuestion(randomId, config!);
      return;
    }

    // 其他模式的引导消息
    const guideMessages: Record<string, string> = {
      explain: '请发送你想要详细解析的题目内容和选项，我来帮你分析。\n\n也可以从错题本直接点击"AI详细解析"按钮。',
      feynman: '请发送：\n1. 题目内容\n2. 正确答案\n3. 你用自己话的理解\n\n我来检查你的理解是否准确！（费曼学习法验证）',
      knowledge: '请输入你想拓展的知识点和所属模块，比如"常识判断-货币政策"，我来详细拓展。',
      free: '你好！我是你的行测AI辅导助手，你可以问我任何关于行测的问题 🎓\n\n比如：\n- 某个题型的解题技巧\n- 某个知识点的详解\n- 备考计划建议\n- 错题分析建议\n\n有什么可以帮你？',
    };

    setMessages([{ role: 'assistant', content: guideMessages[mode] || guideMessages.free }]);
  };

  const clearChat = () => {
    setMessages([]);
    setStreamText('');
    setChatMode('free');
  };

  const currentMode = MODE_INFO[chatMode];
  const providerMeta = config?.provider ? PROVIDER_META[config.provider] : null;

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">🤖</span> AI 智能辅导中心
              </h1>
              <p className="text-white/70 text-sm mt-1">AI解析 · 智能复盘 · 举一反三 · 知识图谱 · 费曼验证</p>
            </div>
            <div className="text-right">
              {config?.apiKey ? (
                <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                  <p className="text-xs text-white/60">当前模型</p>
                  <p className="text-sm font-semibold">
                    {providerMeta?.icon} {PROVIDER_LABELS[config.provider]}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">{config.model}</p>
                </div>
              ) : (
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 bg-red-500/30 backdrop-blur-sm rounded-xl px-4 py-2.5 hover:bg-red-500/40 transition-colors"
                >
                  <span className="text-sm">⚠️ 未配置AI</span>
                  <span className="text-xs text-white/60">→ 去设置</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector - Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {(Object.keys(MODE_INFO) as ChatMode[]).map(mode => {
          const info = MODE_INFO[mode];
          const isActive = chatMode === mode;
          return (
            <button
              key={mode}
              onClick={() => handleQuickAction(mode)}
              className={`relative rounded-xl p-3.5 transition-all text-left group overflow-hidden ${
                isActive
                  ? `bg-gradient-to-br ${info.gradient} text-white shadow-lg scale-[1.02]`
                  : 'bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md'
              }`}
            >
              {isActive && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full animate-pulse" />}
              <span className="text-xl block">{info.icon}</span>
              <p className={`font-semibold text-sm mt-1.5 ${isActive ? 'text-white' : 'text-slate-700'}`}>{info.label}</p>
              <p className={`text-xs mt-0.5 ${isActive ? 'text-white/75' : 'text-slate-400'}`}>{info.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Smart Suggestions - Priority Mistakes */}
      {chatMode === 'free' && (() => {
        const topMistakes = getTopPriorityMistakes(5);
        return topMistakes.length > 0 ? (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
            <h3 className="text-sm font-semibold text-orange-700 mb-2.5 flex items-center gap-1.5">
              <span>🔥</span> 高频错题 — 一键举一反三
            </h3>
            <div className="flex flex-wrap gap-2">
              {topMistakes.map(mc => {
                const q = getQuestionById(mc.questionId);
                return q ? (
                  <button
                    key={mc.questionId}
                    onClick={() => handleSimilarQuestion(mc.questionId, config!)}
                    className="px-3 py-2 bg-white text-orange-600 rounded-lg text-xs border border-orange-200 hover:bg-orange-100 hover:shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-[10px] font-bold">{mc.wrongCount}</span>
                    {q.module}·{q.subType}
                  </button>
                ) : null;
              })}
            </div>
          </div>
        ) : null;
      })()}

      {/* Chat Area - Redesigned */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden" style={{ minHeight: '450px', maxHeight: '650px' }}>
        {/* Chat Header Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentMode.gradient} flex items-center justify-center text-white text-sm`}>
              {currentMode.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-700">{currentMode.label}</p>
              <p className="text-xs text-slate-400">{currentMode.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <span className="text-xs text-slate-400">{messages.length} 条消息</span>
            )}
            <button
              onClick={clearChat}
              className="text-xs px-2.5 py-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              清空对话
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <p className="text-slate-500 text-sm">选择上方功能卡片开始对话</p>
              <p className="text-slate-400 text-xs mt-1">或直接在下方输入您的问题</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-600'
              }`}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              {/* Bubble */}
              <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-md'
                  : 'bg-slate-50 text-slate-700 rounded-tl-md border border-slate-100'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {streamText && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-sm shrink-0 text-purple-600">
                🤖
              </div>
              <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-tl-md bg-slate-50 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap border border-slate-100">
                {streamText}
                <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />
              </div>
            </div>
          )}

          {loading && !streamText && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-sm shrink-0">
                🤖
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-slate-400 ml-2">AI 思考中...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area - Enhanced */}
        <div className="border-t border-slate-100 p-4 bg-white">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && input.trim() && !loading) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="输入你的问题... (Shift+Enter 换行)"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none resize-none bg-slate-50/50 min-h-[44px] max-h-[120px]"
                rows={1}
                disabled={loading}
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all shrink-0"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
              ) : (
                '发送 ↑'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Provider Info Card */}
      {config?.apiKey && providerMeta && (
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{providerMeta.icon}</span>
            <div>
              <p className="text-sm font-medium text-slate-700">{PROVIDER_LABELS[config.provider]}</p>
              <p className="text-xs text-slate-400">{providerMeta.description}</p>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            切换模型 →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-400 text-sm">加载AI辅导中心...</p>
        </div>
      </div>
    }>
      <AIPageContent />
    </Suspense>
  );
}
