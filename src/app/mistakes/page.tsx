'use client';

import { useState, useEffect } from 'react';
import { getMistakeQuestionIds, getRecordsByQuestion, getRecords, getCardsForReview } from '@/lib/storage';
import { getQuestionsByIds } from '@/data';
import { Question, Module, MajorBlock, BLOCK_MODULES, ReviewCard } from '@/types';
import { getMistakeCategories, getMistakesByBlock, getMistakeStats, updateMistakeStatus, autoClassifyMistake } from '@/lib/mistakeManager';
import { getTypeInfo } from '@/data/questionTypes';
import { exportMistakes } from '@/lib/pdf-export';
import Link from 'next/link';

type ViewMode = 'block' | 'module' | 'errorType' | 'all';

export default function MistakesPage() {
  const [mistakeQuestions, setMistakeQuestions] = useState<Question[]>([]);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('block');
  const [filterModule, setFilterModule] = useState<Module | 'all'>('all');
  const [filterBlock, setFilterBlock] = useState<MajorBlock | 'all'>('all');
  const [filterErrorType, setFilterErrorType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getMistakeStats> | null>(null);

  useEffect(() => {
    const ids = getMistakeQuestionIds();
    const qs = getQuestionsByIds(ids);
    setMistakeQuestions(qs);
    setReviewCards(getCardsForReview());

    // 自动分类已有错题
    const records = getRecords();
    const cats = getMistakeCategories();
    for (const q of qs) {
      const existing = cats.find(c => c.questionId === q.id);
      if (!existing) {
        const wrongRecords = records.filter(r => r.questionId === q.id && !r.isCorrect);
        if (wrongRecords.length > 0) {
          autoClassifyMistake(q, wrongRecords[wrongRecords.length - 1], records);
        }
      }
    }
    setStats(getMistakeStats());
  }, []);

  const modules: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
  const blocks: MajorBlock[] = ['文科专项', '理科专项', '逻辑专项'];
  const errorTypes = ['知识盲点', '粗心大意', '方法错误', '时间不足', '理解偏差'];
  const errorTypeIcons: Record<string, string> = {
    '知识盲点': '🕳️',
    '粗心大意': '😤',
    '方法错误': '🔧',
    '时间不足': '⏰',
    '理解偏差': '🤔',
  };

  // 根据视图模式过滤
  const getFilteredQuestions = () => {
    let filtered = [...mistakeQuestions];
    const cats = getMistakeCategories();

    if (filterBlock !== 'all') {
      const blockModules = BLOCK_MODULES[filterBlock];
      filtered = filtered.filter(q => blockModules.includes(q.module));
    }

    if (filterModule !== 'all') {
      filtered = filtered.filter(q => q.module === filterModule);
    }

    if (filterErrorType !== 'all') {
      const catIds = cats.filter(c => c.errorType === filterErrorType).map(c => c.questionId);
      filtered = filtered.filter(q => catIds.includes(q.id));
    }

    return filtered;
  };

  const filteredQuestions = getFilteredQuestions();
  const cats = getMistakeCategories();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">❌ 智能错题本</h1>
          <p className="text-slate-500 text-sm mt-1">自动分类 · 错因分析 · 举一反三 · 心流引导</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportMistakes(filteredQuestions.map(q => ({
              content: q.content, options: q.options, answer: q.answer,
              explanation: q.explanation, module: q.module, subType: q.subType,
            })))}
            className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
          >
            📄 导出PDF
          </button>
          {reviewCards.length > 0 && (
            <Link href="/practice?mode=review" className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200 transition-colors">
              🔄 {reviewCards.length} 道待复习
            </Link>
          )}
          <span className="text-sm text-slate-500">共 {mistakeQuestions.length} 道错题</span>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.total}</div>
            <div className="text-xs text-slate-400">总错题数</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.byReviewStatus.pending}</div>
            <div className="text-xs text-slate-400">待复习</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.byReviewStatus.reviewing}</div>
            <div className="text-xs text-slate-400">复习中</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.byReviewStatus.mastered}</div>
            <div className="text-xs text-slate-400">已掌握</div>
          </div>
        </div>
      )}

      {/* 视图切换 + 过滤器 */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
        {/* 视图模式 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">查看方式：</span>
          {[
            { key: 'block' as ViewMode, label: '📦 按三大块', },
            { key: 'module' as ViewMode, label: '📂 按模块' },
            { key: 'errorType' as ViewMode, label: '🏷️ 按错因' },
            { key: 'all' as ViewMode, label: '📋 全部' },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => {
                setViewMode(v.key);
                setFilterBlock('all');
                setFilterModule('all');
                setFilterErrorType('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === v.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* 三大块过滤 */}
        {viewMode === 'block' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterBlock('all')}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                filterBlock === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              全部
            </button>
            {blocks.map(b => (
              <button
                key={b}
                onClick={() => setFilterBlock(b)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  filterBlock === b ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {b} ({stats?.byBlock[b] || 0})
              </button>
            ))}
          </div>
        )}

        {/* 模块过滤 */}
        {viewMode === 'module' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterModule('all')}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                filterModule === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              全部
            </button>
            {modules.map(m => (
              <button
                key={m}
                onClick={() => setFilterModule(m)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  filterModule === m ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {m} ({mistakeQuestions.filter(q => q.module === m).length})
              </button>
            ))}
          </div>
        )}

        {/* 错因过滤 */}
        {viewMode === 'errorType' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterErrorType('all')}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                filterErrorType === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              全部
            </button>
            {errorTypes.map(et => (
              <button
                key={et}
                onClick={() => setFilterErrorType(et)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  filterErrorType === et ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {errorTypeIcons[et]} {et} ({stats?.byErrorType[et] || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 错题热区提醒 */}
      {stats && stats.topWeakSubTypes.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <h3 className="text-sm font-semibold text-red-700 mb-2">🔥 错题热区 — 这些题型需要重点关注</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topWeakSubTypes.map(w => (
              <span key={w.key} className="px-3 py-1 bg-white text-red-600 rounded-full text-xs border border-red-200">
                {w.key.replace('-', ' · ')}：{w.count}次错误
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 错题列表 */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-lg font-medium text-slate-600">
            {mistakeQuestions.length === 0 ? '还没有错题，继续保持！' : '该筛选条件下暂无错题'}
          </p>
          <Link href="/practice" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            去做题
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map(q => {
            const records = getRecordsByQuestion(q.id);
            const wrongCount = records.filter(r => !r.isCorrect).length;
            const isExpanded = expandedId === q.id;
            const cat = cats.find(c => c.questionId === q.id);
            const typeInfo = getTypeInfo(q.module, q.subType);

            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{q.module}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{q.subType}</span>
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">错 {wrongCount} 次</span>
                        {cat && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            cat.errorType === '知识盲点' ? 'bg-purple-50 text-purple-600' :
                            cat.errorType === '粗心大意' ? 'bg-yellow-50 text-yellow-600' :
                            cat.errorType === '方法错误' ? 'bg-orange-50 text-orange-600' :
                            cat.errorType === '时间不足' ? 'bg-cyan-50 text-cyan-600' :
                            'bg-indigo-50 text-indigo-600'
                          }`}>
                            {errorTypeIcons[cat.errorType]} {cat.errorType}
                          </span>
                        )}
                        {cat && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            cat.reviewStatus === 'mastered' ? 'bg-green-50 text-green-600' :
                            cat.reviewStatus === 'reviewing' ? 'bg-blue-50 text-blue-600' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {cat.reviewStatus === 'mastered' ? '✅ 已掌握' :
                             cat.reviewStatus === 'reviewing' ? '📖 复习中' : '⏳ 待复习'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2 text-slate-700">{q.content}</p>
                    </div>
                    <span className="text-slate-400 text-sm flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50">
                    {/* 选项 */}
                    <div className="space-y-1">
                      {q.options.map(opt => (
                        <p
                          key={opt.key}
                          className={`text-sm px-3 py-1.5 rounded ${opt.key === q.answer ? 'bg-green-100 text-green-800 font-medium' : ''}`}
                        >
                          {opt.key}. {opt.text}
                        </p>
                      ))}
                    </div>

                    {/* 解析 */}
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">✅ 正确答案：{q.answer}</p>
                      <p className="text-sm leading-6 whitespace-pre-wrap">{q.explanation}</p>
                    </div>

                    {/* 题型提醒 */}
                    {typeInfo && (
                      <div className="bg-amber-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ 此题型常见陷阱</p>
                        <ul className="text-xs text-amber-600 space-y-0.5">
                          {typeInfo.commonTraps.map((trap, i) => (
                            <li key={i}>• {trap}</li>
                          ))}
                        </ul>
                        <p className="text-xs font-semibold text-green-700 mt-2 mb-1">💡 关键技巧</p>
                        <ul className="text-xs text-green-600 space-y-0.5">
                          {typeInfo.keyTechniques.map((tech, i) => (
                            <li key={i}>• {tech}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 关联知识 */}
                    {q.relatedKnowledge && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-600 mb-1">🔗 关联知识</p>
                        <p className="text-sm text-blue-800">{q.relatedKnowledge}</p>
                      </div>
                    )}

                    {/* 费曼笔记 */}
                    {records.some(r => r.feynmanNote) && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-purple-600 mb-1">🧑‍🏫 我的费曼笔记</p>
                        {records.filter(r => r.feynmanNote).map((r, i) => (
                          <p key={i} className="text-sm text-purple-800">{r.feynmanNote}</p>
                        ))}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Link
                        href={`/ai?mode=explain&questionId=${q.id}`}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs hover:bg-purple-200 transition-colors"
                      >
                        🤖 AI 详细解析
                      </Link>
                      <Link
                        href={`/ai?mode=similar&questionId=${q.id}`}
                        className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs hover:bg-orange-200 transition-colors"
                      >
                        🔄 举一反三
                      </Link>
                      <Link
                        href={`/ai?mode=knowledge&topic=${encodeURIComponent(q.subType)}&module=${encodeURIComponent(q.module)}`}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200 transition-colors"
                      >
                        📚 知识拓展
                      </Link>
                      {cat && cat.reviewStatus !== 'mastered' && (
                        <button
                          onClick={() => {
                            updateMistakeStatus(q.id, 'mastered');
                            setStats(getMistakeStats());
                          }}
                          className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition-colors"
                        >
                          ✅ 标记已掌握
                        </button>
                      )}
                      {cat && cat.reviewStatus === 'mastered' && (
                        <button
                          onClick={() => {
                            updateMistakeStatus(q.id, 'pending');
                            setStats(getMistakeStats());
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition-colors"
                        >
                          ↩️ 重新学习
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 学习引导提示 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
        <h3 className="font-semibold text-slate-800 mb-2">🧠 错题高效复习流程</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-white/70 rounded-lg p-3">
            <p className="font-medium text-blue-700">1️⃣ 看题回忆</p>
            <p className="text-xs text-slate-500 mt-1">遮住答案，尝试回忆解题思路</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <p className="font-medium text-green-700">2️⃣ 费曼复述</p>
            <p className="text-xs text-slate-500 mt-1">用自己的话讲解这道题的解法</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <p className="font-medium text-orange-700">3️⃣ 举一反三</p>
            <p className="text-xs text-slate-500 mt-1">用AI生成类似题，检验是否真正掌握</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <p className="font-medium text-purple-700">4️⃣ 归纳总结</p>
            <p className="text-xs text-slate-500 mt-1">总结该题型的通用解法和规律</p>
          </div>
        </div>
      </div>
    </div>
  );
}
