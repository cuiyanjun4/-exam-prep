'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MajorBlock, BLOCK_MODULES, BLOCK_INFO, Module } from '@/types';
import { getProgress } from '@/lib/storage';
import { getRecords } from '@/lib/storage';
import { getMistakesByBlock, getMistakeStats } from '@/lib/mistakeManager';
import { getTypeInfoByModule } from '@/data/questionTypes';

const BLOCKS: MajorBlock[] = ['文科专项', '理科专项', '逻辑专项'];

export default function SpecialTrainingPage() {
  const [selectedBlock, setSelectedBlock] = useState<MajorBlock | null>(null);
  const [blockStats, setBlockStats] = useState<Record<string, { total: number; correct: number; avgTime: number }>>({});
  const [mistakeStats, setMistakeStats] = useState<ReturnType<typeof getMistakeStats> | null>(null);

  useEffect(() => {
    const progress = getProgress();
    const records = getRecords();
    const stats: Record<string, { total: number; correct: number; avgTime: number }> = {};

    for (const block of BLOCKS) {
      const modules = BLOCK_MODULES[block];
      let total = 0, correct = 0, totalTime = 0;

      for (const mod of modules) {
        const mp = progress.moduleProgress[mod];
        if (mp) {
          total += mp.answered;
          correct += mp.correct;
          totalTime += mp.avgTime * mp.answered;
        }
      }

      stats[block] = {
        total,
        correct,
        avgTime: total > 0 ? totalTime / total : 0,
      };
    }

    setBlockStats(stats);
    setMistakeStats(getMistakeStats());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🎯 三大块专项训练</h1>
        <p className="text-slate-500 mt-1">文科 · 理科 · 逻辑 — 各个击破，精准提分</p>
      </div>

      {/* 三大块选择卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BLOCKS.map(block => {
          const info = BLOCK_INFO[block];
          const stats = blockStats[block] || { total: 0, correct: 0, avgTime: 0 };
          const accuracy = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
          const mistakes = mistakeStats?.byBlock[block] || 0;

          return (
            <div
              key={block}
              onClick={() => setSelectedBlock(selectedBlock === block ? null : block)}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                selectedBlock === block
                  ? `border-${info.color}-500 bg-${info.color}-50 shadow-lg`
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className="text-4xl mb-3">{info.icon}</div>
              <h3 className="text-xl font-bold text-slate-800">{block}</h3>
              <p className="text-sm text-slate-500 mt-1">{info.description}</p>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">{stats.total}</div>
                  <div className="text-xs text-slate-400">已做题</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${accuracy >= 70 ? 'text-green-600' : accuracy >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                    {accuracy}%
                  </div>
                  <div className="text-xs text-slate-400">正确率</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-500">{mistakes}</div>
                  <div className="text-xs text-slate-400">错题数</div>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-400">
                建议用时 {info.targetTime} 分钟 · 含 {BLOCK_MODULES[block].length} 个模块
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中块的详细信息 */}
      {selectedBlock && (
        <div className="space-y-4 animate-fadeIn">
          {/* 模块详情 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {BLOCK_INFO[selectedBlock].icon} {selectedBlock} - 模块详情
            </h3>

            {BLOCK_MODULES[selectedBlock].map(mod => {
              const typeInfos = getTypeInfoByModule(mod);

              return (
                <div key={mod} className="mb-6 last:mb-0">
                  <h4 className="font-semibold text-slate-700 mb-3 text-base">{mod}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {typeInfos.map(info => (
                      <div key={info.subType} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-700">{info.subType}</span>
                          <span className="text-xs text-slate-400">⏱ {info.recommendedTime}秒/题</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{info.description}</p>

                        <div className="space-y-1">
                          <div>
                            <span className="text-xs text-red-500 font-medium">⚠ 常见陷阱：</span>
                            <span className="text-xs text-slate-500">{info.commonTraps.slice(0, 2).join('、')}</span>
                          </div>
                          <div>
                            <span className="text-xs text-green-600 font-medium">✅ 关键技巧：</span>
                            <span className="text-xs text-slate-500">{info.keyTechniques.slice(0, 2).join('、')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href={`/practice?block=${encodeURIComponent(selectedBlock)}`}
              className="flex flex-col items-center p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <span className="text-2xl mb-1">📝</span>
              <span className="text-sm font-medium">开始练习</span>
            </Link>
            <Link
              href={`/speed?block=${encodeURIComponent(selectedBlock)}`}
              className="flex flex-col items-center p-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
            >
              <span className="text-2xl mb-1">⚡</span>
              <span className="text-sm font-medium">限时速刷</span>
            </Link>
            <Link
              href={`/mistakes?block=${encodeURIComponent(selectedBlock)}`}
              className="flex flex-col items-center p-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              <span className="text-2xl mb-1">❌</span>
              <span className="text-sm font-medium">错题攻克</span>
            </Link>
            <Link
              href={`/ai?mode=review&block=${encodeURIComponent(selectedBlock)}`}
              className="flex flex-col items-center p-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              <span className="text-2xl mb-1">🤖</span>
              <span className="text-sm font-medium">AI复盘</span>
            </Link>
          </div>

          {/* 错题热区 */}
          {mistakeStats && (
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">🔥 错题热区</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mistakeStats.topWeakSubTypes
                  .filter(w => {
                    const [mod] = w.key.split('-');
                    return BLOCK_MODULES[selectedBlock].includes(mod as Module);
                  })
                  .map(w => (
                    <div key={w.key} className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-3">
                      <span className="text-sm text-slate-700">{w.key.replace('-', ' · ')}</span>
                      <span className="text-sm font-bold text-red-600">{w.count} 次错误</span>
                    </div>
                  ))
                }
                {mistakeStats.topWeakSubTypes.filter(w => {
                  const [mod] = w.key.split('-');
                  return BLOCK_MODULES[selectedBlock].includes(mod as Module);
                }).length === 0 && (
                  <div className="text-sm text-slate-400 col-span-2 text-center py-4">
                    暂无错题数据，开始练习后会自动记录 ✨
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 学习建议 */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
        <h3 className="text-lg font-bold text-slate-800 mb-3">💡 专项训练建议</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <div>
            <h4 className="font-semibold mb-1">📖 文科专项</h4>
            <ul className="space-y-1">
              <li>• 常识靠日常积累，每天15分钟</li>
              <li>• 言语注意转折词和主旨句</li>
              <li>• 成语积累要配合语境练习</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">🔢 理科专项</h4>
            <ul className="space-y-1">
              <li>• 数量关系优先学会代入和特值</li>
              <li>• 资料分析必练速算技巧</li>
              <li>• 先做资料再做数量更高效</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">🧠 逻辑专项</h4>
            <ul className="space-y-1">
              <li>• 图形推理背规律，多做多见</li>
              <li>• 定义判断抠关键词一一对应</li>
              <li>• 逻辑判断掌握矛盾法和假设法</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
