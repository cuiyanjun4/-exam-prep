'use client';

import { useState, useEffect } from 'react';
import { getRecords, getDailyStats, getProgress } from '@/lib/storage';
import { Module, AnswerRecord, UserProgress } from '@/types';
import { getModuleAccuracy, getWeakModules, estimateScore, getAvgTimePerModule, getRecentStats } from '@/lib/analytics';

const ALL_MODULES: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];

const moduleColors: Record<string, string> = {
  '政治理论': '#ec4899',
  '常识判断': '#8b5cf6',
  '言语理解': '#3b82f6',
  '数量关系': '#22c55e',
  '判断推理': '#f59e0b',
  '资料分析': '#ef4444',
};

export default function AnalyticsPage() {
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [moduleAcc, setModuleAcc] = useState<Record<Module, number>>({} as Record<Module, number>);
  const [weakModules, setWeakModules] = useState<{ module: Module; accuracy: number; count: number }[]>([]);
  const [score, setScore] = useState(0);
  const [avgTimes, setAvgTimes] = useState<Record<Module, number>>({} as Record<Module, number>);
  const [recentStats, setRecentStats] = useState<{ date: string; total: number; correct: number }[]>([]);

  useEffect(() => {
    const r = getRecords();
    setRecords(r);
    setProgress(getProgress());
    setModuleAcc(getModuleAccuracy(r));
    setWeakModules(getWeakModules(r));
    setScore(estimateScore(r));
    setAvgTimes(getAvgTimePerModule(r));

    const daily = getDailyStats();
    const recent = getRecentStats(daily, 14);
    setRecentStats(recent.map(s => ({
      date: s.date,
      total: s.totalQuestions,
      correct: s.correctCount,
    })));
  }, []);

  const totalTime = records.reduce((sum, r) => sum + r.timeSpent, 0);
  const avgTimePerQ = records.length > 0 ? Math.round(totalTime / records.length) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">📊 数据分析</h1>

      {records.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-lg font-medium text-slate-600">还没有做题数据</p>
          <p className="text-sm text-slate-400 mt-1">做几道题后数据就会出现</p>
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-blue-600">{records.length}</p>
              <p className="text-xs text-slate-400">做题总数</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-green-600">
                {records.length > 0 ? Math.round(records.filter(r => r.isCorrect).length / records.length * 100) : 0}%
              </p>
              <p className="text-xs text-slate-400">总正确率</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-amber-600">{score}</p>
              <p className="text-xs text-slate-400">预估分数</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-purple-600">{avgTimePerQ}s</p>
              <p className="text-xs text-slate-400">平均用时</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
              <p className="text-2xl font-bold text-red-600">{progress?.streak || 0}</p>
              <p className="text-xs text-slate-400">连续天数</p>
            </div>
          </div>

          {/* Module Accuracy Radar-like */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h2 className="font-semibold mb-4">🎯 各模块正确率</h2>
              <div className="space-y-3">
                {ALL_MODULES.map(m => (
                  <div key={m} className="flex items-center gap-3">
                    <span className="text-sm w-20 flex-shrink-0">{m}</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${moduleAcc[m] || 0}%`,
                          backgroundColor: moduleColors[m],
                        }}
                      />
                      <span className="absolute right-2 top-0.5 text-xs font-semibold text-slate-600">
                        {moduleAcc[m] || 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h2 className="font-semibold mb-4">⏱️ 各模块平均用时</h2>
              <div className="space-y-3">
                {ALL_MODULES.map(m => (
                  <div key={m} className="flex items-center gap-3">
                    <span className="text-sm w-20 flex-shrink-0">{m}</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all bg-slate-400"
                        style={{ width: `${Math.min((avgTimes[m] || 0) / 120 * 100, 100)}%` }}
                      />
                      <span className="absolute right-2 top-0.5 text-xs font-semibold text-slate-600">
                        {avgTimes[m] || 0}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weak modules */}
          {weakModules.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-slate-100">
              <h2 className="font-semibold mb-4">⚠️ 薄弱环节（正确率从低到高）</h2>
              <div className="space-y-2">
                {weakModules.map((wm, i) => (
                  <div key={wm.module} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                    <span className={`text-lg font-bold ${i === 0 ? 'text-red-500' : i === 1 ? 'text-orange-500' : 'text-slate-500'}`}>
                      #{i + 1}
                    </span>
                    <span className="font-medium flex-1">{wm.module}</span>
                    <span className="text-sm text-slate-500">{wm.count}题</span>
                    <span className={`text-sm font-bold ${wm.accuracy < 50 ? 'text-red-600' : wm.accuracy < 70 ? 'text-orange-600' : 'text-green-600'}`}>
                      {wm.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="bg-white rounded-xl p-5 border border-slate-100">
            <h2 className="font-semibold mb-4">📅 最近14天做题量</h2>
            <div className="flex items-end gap-1 h-32">
              {recentStats.map((s, i) => {
                const maxTotal = Math.max(...recentStats.map(s => s.total), 1);
                const height = s.total > 0 ? Math.max((s.total / maxTotal) * 100, 5) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {s.total > 0 && (
                      <span className="text-xs text-slate-400">{s.total}</span>
                    )}
                    <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                      <div
                        className="w-full bg-blue-400 rounded-t-sm"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400" style={{ fontSize: '10px' }}>{s.date.slice(8)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
