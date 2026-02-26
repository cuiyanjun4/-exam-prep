'use client';

import { useState, useEffect } from 'react';
import { getAuthState, getCurrentUser, logout } from '@/lib/auth';
import { getProgress, getDailyStats, getRecords, getFavorites } from '@/lib/storage';
import { getGameProfile, getLevelProgress, xpForLevel, TITLES, ACHIEVEMENTS } from '@/lib/gamification';
import { User, UserProgress, Module } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MODULE_ICONS: Record<Module, string> = {
  '常识判断': '📚',
  '言语理解': '📝',
  '数量关系': '🔢',
  '判断推理': '🧠',
  '资料分析': '📊',
  '政治理论': '🏛️',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [gameProfile, setGameProfile] = useState<ReturnType<typeof getGameProfile> | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [recentDays, setRecentDays] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const auth = getAuthState();
    if (!auth.currentUser) {
      router.push('/auth');
      return;
    }
    setUser(auth.currentUser);
    setProgress(getProgress());
    setGameProfile(getGameProfile());
    setFavCount(getFavorites().length);

    const stats = getDailyStats();
    const days = Object.keys(stats).filter(d => stats[d].totalQuestions > 0);
    setTotalDays(days.length);

    // Last 7 days
    const recent: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      recent.push({ date: dateStr, count: stats[dateStr]?.totalQuestions || 0 });
    }
    setRecentDays(recent);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user || !progress || !gameProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-slate-500">请先登录</p>
          <Link href="/auth" className="mt-3 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">去登录</Link>
        </div>
      </div>
    );
  }

  const levelProgress = getLevelProgress(gameProfile);
  const nextLevelXP = xpForLevel(gameProfile.level);
  const accuracy = progress.totalAnswered > 0 ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0;

  const quickLinks = [
    { href: '/practice', icon: '📝', label: '继续刷题', color: 'bg-blue-50 text-blue-600' },
    { href: '/mock', icon: '📋', label: '模拟考试', color: 'bg-purple-50 text-purple-600' },
    { href: '/mistakes', icon: '❌', label: '错题本', color: 'bg-red-50 text-red-600' },
    { href: '/favorites', icon: '⭐', label: '收藏夹', color: 'bg-amber-50 text-amber-600' },
    { href: '/checkin', icon: '🔥', label: '每日打卡', color: 'bg-orange-50 text-orange-600' },
    { href: '/analytics', icon: '📊', label: '数据分析', color: 'bg-green-50 text-green-600' },
    { href: '/settings', icon: '⚙️', label: '系统设置', color: 'bg-slate-50 text-slate-600' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <span className="text-5xl">{user.avatar}</span>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{user.nickname}</h1>
            <p className="text-sm opacity-80">@{user.username} · {user.role === 'admin' ? '🛡️ 管理员' : '📝 学员'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-lg">{gameProfile.titleIcon}</span>
              <span className="text-sm font-medium">{gameProfile.title}</span>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">Lv.{gameProfile.level}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black">{gameProfile.xp}</p>
            <p className="text-xs opacity-70">总经验值</p>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs opacity-70 mb-1">
            <span>Lv.{gameProfile.level}</span>
            <span>Lv.{gameProfile.level + 1}</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all" style={{ width: `${levelProgress * 100}%` }} />
          </div>
          <p className="text-xs opacity-60 mt-1 text-right">还需 {Math.round(nextLevelXP * (1 - levelProgress))} XP 升级</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-blue-600">{progress.totalAnswered}</p>
          <p className="text-xs text-slate-500 mt-1">总做题数</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-green-600">{accuracy}%</p>
          <p className="text-xs text-slate-500 mt-1">正确率</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-orange-600">{progress.streak}</p>
          <p className="text-xs text-slate-500 mt-1">连续打卡</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-purple-600">{totalDays}</p>
          <p className="text-xs text-slate-500 mt-1">学习天数</p>
        </div>
      </div>

      {/* Activity heatmap (last 7 days) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="font-semibold mb-3">📈 近7日做题量</h3>
        <div className="flex items-end gap-3 h-24">
          {recentDays.map((day, i) => {
            const max = Math.max(...recentDays.map(d => d.count), 1);
            const height = (day.count / max) * 100;
            const label = new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' });
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500">{day.count}</span>
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all"
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <span className="text-[10px] text-slate-400">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module progress */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="font-semibold mb-3">📊 模块进度</h3>
        <div className="space-y-3">
          {(Object.entries(progress.moduleProgress) as [Module, { answered: number; correct: number; avgTime: number }][]).map(([mod, data]) => {
            const rate = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;
            return (
              <div key={mod} className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{MODULE_ICONS[mod]}</span>
                <span className="w-16 text-xs font-medium text-slate-600 flex-shrink-0">{mod}</span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${rate >= 70 ? 'bg-green-400' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-20 text-right">{data.answered}题 · {rate}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="font-semibold mb-3">🏅 成就 ({gameProfile.achievements.length}/{ACHIEVEMENTS.length})</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {ACHIEVEMENTS.map(ach => {
            const unlocked = gameProfile.achievements.includes(ach.id);
            return (
              <div key={ach.id} className={`text-center p-3 rounded-xl border ${unlocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <span className="text-2xl">{ach.icon}</span>
                <p className="text-xs font-medium mt-1">{ach.name}</p>
                <p className="text-[10px] text-slate-400">{ach.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="font-semibold mb-3">⚡ 快捷入口</h3>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${link.color} hover:shadow-md transition-all`}>
              <span className="text-2xl">{link.icon}</span>
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Account actions */}
      <div className="flex gap-3 justify-center pb-8">
        <button onClick={handleLogout} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
          🚪 退出登录
        </button>
      </div>
    </div>
  );
}
