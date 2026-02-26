'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProgress, getDailyStats, getCardsForReview } from '@/lib/storage';
import { UserProgress, Module } from '@/types';
import { getModuleQuestionCounts } from '@/data';
import { getAccuracyTrend, estimateScore } from '@/lib/analytics';
import { getRecords } from '@/lib/storage';
import { getGameProfile, getLevelProgress, xpForLevel, GameProfile } from '@/lib/gamification';
import { getRandomQuote } from '@/lib/motivation';

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
  const [quote, setQuote] = useState<{text: string, author: string} | null>(null);

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
    setQuote(getRandomQuote());
  }, []);

  const accuracy = progress && progress.totalAnswered > 0
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* ====== Hero: 个人档案 + 等级 ====== */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-1 flex items-center gap-2">
                <span>🚀</span> 考公行测题库
              </h1>
              <p className="text-blue-100 text-sm font-medium">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            {game && (
              <div className="text-right bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-inner">
                <div className="flex items-center gap-2 text-xl font-bold">
                  <span className="text-2xl drop-shadow-md">{game.titleIcon}</span>
                  <span className="bg-gradient-to-r from-yellow-200 to-amber-400 bg-clip-text text-transparent">{game.title}</span>
                </div>
                <p className="text-blue-100 text-sm mt-0.5 font-medium">Lv.{game.level} 达人</p>
              </div>
            )}
          </div>

          {/* XP Progress Bar */}
          {game && (
            <div className="mt-6 bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="flex justify-between text-sm text-blue-100 mb-2 font-medium">
                <span className="flex items-center gap-1">✨ 经验值 {game.xp} XP</span>
                <span>距离 Lv.{game.level + 1} 还需 {xpForLevel(game.level) - Math.floor(levelProg * xpForLevel(game.level))} XP</span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${Math.round(levelProg * 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors group">
              <p className="text-3xl font-black group-hover:scale-110 transition-transform origin-left">{progress?.totalAnswered || 0}</p>
              <p className="text-blue-100 text-sm mt-1 font-medium">已做题</p>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors group">
              <p className="text-3xl font-black group-hover:scale-110 transition-transform origin-left">{accuracy}%</p>
              <p className="text-blue-100 text-sm mt-1 font-medium">正确率</p>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors group">
              <p className="text-3xl font-black text-yellow-300 group-hover:scale-110 transition-transform origin-left">{score || '--'}</p>
              <p className="text-blue-100 text-sm mt-1 font-medium">预估分</p>
            </div>
            <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors group">
              <p className="text-3xl font-black text-green-300 group-hover:scale-110 transition-transform origin-left">{progress?.streak || 0}</p>
              <p className="text-blue-100 text-sm mt-1 font-medium">连续打卡(天)</p>
            </div>
          </div>

          {/* 每日励志 */}
          {quote && (
            <div className="mt-6 pt-4 border-t border-white/20 flex items-start gap-3">
              <span className="text-yellow-300 text-2xl animate-bounce">💡</span>
              <div className="flex-1">
                <p className="text-base text-white font-medium italic leading-relaxed">"{quote.text}"</p>
                <p className="text-sm text-blue-200 mt-1 text-right font-semibold">— {quote.author}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== 今日任务 + 打卡 ====== */}
      <div className="grid lg:grid-cols-3 gap-5">
        <Link href="/practice" className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all flex items-center gap-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-800/30 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-3 transition-all shadow-sm">📝</div>
          <div>
            <p className="font-bold text-lg text-slate-800 dark:text-slate-100">开始刷题</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">智能选题 · 即时解析</p>
          </div>
        </Link>
        
        {reviewCount > 0 ? (
          <Link href="/mistakes" className="group bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl p-6 border border-red-100 dark:border-red-800/30 hover:border-red-300 hover:shadow-xl hover:shadow-red-500/10 transition-all flex items-center gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-red-100/50 dark:bg-red-900/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:-rotate-3 transition-all shadow-sm">🔄</div>
            <div>
              <p className="font-bold text-lg text-red-700 dark:text-red-400">复习错题</p>
              <p className="text-sm text-red-500 dark:text-red-300 mt-0.5 font-medium">{reviewCount} 道到期复习</p>
            </div>
          </Link>
        ) : (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-100 dark:border-green-800/30 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-green-100/50 dark:bg-green-900/20 rounded-bl-full -z-10" />
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-sm">✅</div>
            <div>
              <p className="font-bold text-lg text-green-700 dark:text-green-400">无到期复习</p>
              <p className="text-sm text-green-500 dark:text-green-300 mt-0.5 font-medium">保持好状态</p>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex items-center gap-5 relative overflow-hidden group hover:shadow-xl hover:shadow-purple-500/10 transition-all">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 dark:bg-purple-900/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
          <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/50 dark:to-purple-800/30 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all shadow-sm">📅</div>
          <div>
            <p className="font-bold text-lg text-slate-800 dark:text-slate-100">连续打卡</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5"><span className="text-purple-600 dark:text-purple-400 font-black text-xl">{progress?.streak || 0}</span> 天</p>
          </div>
        </div>
      </div>

      {/* ====== 六大模块 ====== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="text-blue-500">🎯</span> 核心模块
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(({ key, icon, gradient }) => {
            const mp = progress?.moduleProgress[key];
            const total = questionCounts[key] || 0;
            const answered = mp?.answered || 0;
            const acc = mp && mp.answered > 0 ? Math.round((mp.correct / mp.answered) * 100) : 0;
            const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

            return (
              <Link key={key} href={`/practice?module=${key}`} className="group relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
                    {icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{key}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{answered}/{total} 题</p>
                  </div>
                  <div className="ml-auto flex flex-col items-end">
                    <span className={`text-lg font-black ${acc >= 80 ? 'text-green-500' : acc >= 60 ? 'text-blue-500' : 'text-orange-500'}`}>{acc}%</span>
                    <span className="text-[10px] text-slate-400 font-medium">正确率</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                  <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out relative`} style={{ width: `${pct}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                  </div>
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
