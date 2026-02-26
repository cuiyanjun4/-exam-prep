'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProgress, getDailyStats, getCardsForReview } from '@/lib/storage';
import { UserProgress, Module } from '@/types';
import { getModuleQuestionCounts } from '@/data';
import { getAccuracyTrend, estimateScore } from '@/lib/analytics';
import { getRecords } from '@/lib/storage';
import { getGameProfile, getLevelProgress, xpForLevel, GameProfile } from '@/lib/gamification';

const MODULES: { key: Module; icon: string; gradient: string }[] = [
  { key: '政治理论', icon: '🏛️', gradient: 'from-red-500 to-red-600' },
  { key: '常识判断', icon: '📚', gradient: 'from-purple-500 to-purple-600' },
  { key: '言语理解', icon: '💬', gradient: 'from-blue-500 to-blue-600' },
  { key: '数量关系', icon: '🔢', gradient: 'from-emerald-500 to-emerald-600' },
  { key: '判断推理', icon: '🧩', gradient: 'from-amber-500 to-amber-600' },
  { key: '资料分析', icon: '📊', gradient: 'from-rose-500 to-rose-600' },
];

export default function HomePage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [trend, setTrend] = useState<{ date: string; accuracy: number }[]>([]);
  const [score, setScore] = useState(0);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [game, setGame] = useState<GameProfile | null>(null);
  const [levelProg, setLevelProg] = useState(0);

  useEffect(() => {
    setProgress(getProgress());
    setReviewCount(getCardsForReview().length);
    const dailyStats = getDailyStats();
    setTrend(getAccuracyTrend(dailyStats, 7));
    const records = getRecords();
    setScore(estimateScore(records));
    setQuestionCounts(getModuleQuestionCounts());
    const gp = getGameProfile();
    setGame(gp);
    setLevelProg(getLevelProgress(gp));
  }, []);

  const accuracy = progress && progress.totalAnswered > 0
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ====== Hero: 个人档案 + 等级 ====== */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">考公行测题库</h1>
              <p className="text-blue-200 text-sm mt-0.5">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            {game && (
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-lg font-bold">
                  <span>{game.titleIcon}</span>
                  <span>{game.title}</span>
                </div>
                <p className="text-blue-200 text-xs mt-0.5">Lv.{game.level}</p>
              </div>
            )}
          </div>

          {/* XP Progress Bar */}
          {game && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-blue-200 mb-1">
                <span>经验值 {game.xp} XP</span>
                <span>升至 Lv.{game.level + 1} 还需 {xpForLevel(game.level) - Math.floor(levelProg * xpForLevel(game.level))} XP</span>
              </div>
              <div className="h-2 bg-blue-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.round(levelProg * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
              <p className="text-2xl font-bold">{progress?.totalAnswered || 0}</p>
              <p className="text-blue-200 text-xs">已做题</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-blue-200 text-xs">正确率</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
              <p className="text-2xl font-bold">{score || '--'}</p>
              <p className="text-blue-200 text-xs">预估分</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
              <p className="text-2xl font-bold">{game?.combo || 0}<span className="text-sm font-normal text-yellow-300">🔥</span></p>
              <p className="text-blue-200 text-xs">连击</p>
            </div>
          </div>
        </div>
      </div>

      {/* ====== 今日任务 + 打卡 ====== */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Link href="/practice" className="group bg-white rounded-xl p-5 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📝</div>
          <div>
            <p className="font-semibold text-slate-800">开始刷题</p>
            <p className="text-sm text-slate-500">智能选题 · 即时解析</p>
          </div>
        </Link>
        {reviewCount > 0 ? (
          <Link href="/mistakes" className="group bg-red-50 rounded-xl p-5 border border-red-100 hover:border-red-300 hover:shadow-md transition-all flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🔄</div>
            <div>
              <p className="font-semibold text-red-700">复习错题</p>
              <p className="text-sm text-red-500">{reviewCount} 道到期复习</p>
            </div>
          </Link>
        ) : (
          <div className="bg-green-50 rounded-xl p-5 border border-green-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">✅</div>
            <div>
              <p className="font-semibold text-green-700">无到期复习</p>
              <p className="text-sm text-green-500">保持好状态</p>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl p-5 border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl">📅</div>
          <div>
            <p className="font-semibold text-slate-800">连续打卡</p>
            <p className="text-sm text-slate-500"><span className="text-purple-600 font-bold text-lg">{progress?.streak || 0}</span> 天</p>
          </div>
        </div>
      </div>

      {/* ====== 六大模块 ====== */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">六大模块</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map(({ key, icon, gradient }) => {
            const mp = progress?.moduleProgress[key];
            const total = questionCounts[key] || 0;
            const answered = mp?.answered || 0;
            const acc = mp && mp.answered > 0 ? Math.round((mp.correct / mp.answered) * 100) : 0;
            const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

            return (
              <Link key={key} href={`/practice?module=${key}`} className="group relative bg-white rounded-xl p-4 border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{key}</p>
                    <p className="text-xs text-slate-400">{answered}/{total} 题</p>
                  </div>
                  <span className="ml-auto text-xs font-medium text-slate-500">{acc}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ====== 7天趋势 ====== */}
      {trend.length > 0 && trend.some(t => t.accuracy > 0) && (
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">最近7天正确率</h2>
          <div className="flex items-end gap-2 h-28">
            {trend.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500 font-medium">{t.accuracy}%</span>
                <div className="w-full bg-slate-50 rounded-t overflow-hidden" style={{ height: '80px' }}>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${t.accuracy}%`,
                      marginTop: `${100 - t.accuracy}%`,
                      background: t.accuracy >= 80 ? '#22c55e' : t.accuracy >= 60 ? '#3b82f6' : '#f59e0b',
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400">{t.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== 周XP图 (游戏化) ====== */}
      {game && game.weeklyXP.some(x => x > 0) && (
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-4">本周经验值</h2>
          <div className="flex items-end gap-2 h-28">
            {['日', '一', '二', '三', '四', '五', '六'].map((day, i) => {
              const xp = game.weeklyXP[6 - i] || 0;
              const maxXP = Math.max(...game.weeklyXP, 1);
              const pct = Math.round((xp / maxXP) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-amber-600 font-medium">{xp > 0 ? `+${xp}` : ''}</span>
                  <div className="w-full bg-amber-50 rounded-t overflow-hidden" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-gradient-to-t from-amber-400 to-yellow-300 rounded-t transition-all"
                      style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">周{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====== 快速入口 ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/special', icon: '🎯', name: '专项突破', desc: '文科·理科·逻辑', gradient: 'from-indigo-500 to-indigo-600' },
          { href: '/speed', icon: '⚡', name: '限时速刷', desc: '三级提速训练', gradient: 'from-amber-500 to-amber-600' },
          { href: '/practice?mode=exam', icon: '⏱️', name: '模拟考试', desc: '120分钟实战', gradient: 'from-rose-500 to-rose-600' },
          { href: '/ai', icon: '🤖', name: 'AI 复盘', desc: '智能分析弱点', gradient: 'from-violet-500 to-violet-600' },
        ].map(item => (
          <Link key={item.href} href={item.href} className={`bg-gradient-to-br ${item.gradient} text-white rounded-xl p-4 hover:shadow-lg transition-shadow`}>
            <span className="text-xl">{item.icon}</span>
            <p className="font-semibold mt-1.5 text-sm">{item.name}</p>
            <p className="text-xs text-white/70">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* ====== 成就概览 ====== */}
      {game && game.achievements.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-slate-100">
          <h2 className="text-base font-semibold text-slate-800 mb-3">已解锁成就 ({game.achievements.length})</h2>
          <div className="flex flex-wrap gap-2">
            {game.achievements.slice(0, 8).map(id => {
              const iconMap: Record<string, string> = {
                first_question: '🎯', fifty_questions: '📝', hundred_club: '💯', five_hundred: '🛤️',
                thousand_warrior: '⚔️', ten_streak: '🔥', twenty_streak: '🔥', fifty_streak: '💥', daily_grind: '💪',
              };
              return (
                <span key={id} className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-xl border border-amber-200">
                  {iconMap[id] || '🏅'}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
