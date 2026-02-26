'use client';

import { useState, useEffect } from 'react';
import { getAuthState, getCurrentUser, logout, changePassword, updateProfile, AVATARS } from '@/lib/auth';
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

      {/* Account Settings */}
      <AccountSettingsSection user={user} onProfileUpdate={(u) => setUser(u)} />

      {/* Account actions */}
      <div className="flex gap-3 justify-center pb-8">
        <button onClick={handleLogout} className="px-6 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
          🚪 退出登录
        </button>
      </div>
    </div>
  );
}

// ==================== 账户设置组件 ====================
function AccountSettingsSection({ user, onProfileUpdate }: { user: User; onProfileUpdate: (u: User) => void }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');
  const [nickname, setNickname] = useState(user.nickname);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar);
  const [targetScore, setTargetScore] = useState(user.targetScore || 70);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleProfileSave = () => {
    const result = updateProfile({ nickname, bio, avatar, targetScore });
    if (result) {
      setMsg({ type: 'success', text: '✅ 个人信息已更新' });
      const auth = getAuthState();
      if (auth.currentUser) onProfileUpdate(auth.currentUser);
    } else {
      setMsg({ type: 'error', text: '❌ 更新失败' });
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handlePasswordChange = () => {
    if (newPwd !== confirmPwd) {
      setMsg({ type: 'error', text: '❌ 两次输入的新密码不一致' });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const result = changePassword(oldPwd, newPwd);
    setMsg({ type: result.success ? 'success' : 'error', text: result.success ? '✅ ' + result.message : '❌ ' + result.message });
    if (result.success) { setOldPwd(''); setNewPwd(''); setConfirmPwd(''); }
    setTimeout(() => setMsg(null), 3000);
  };

  const tabs = [
    { key: 'profile' as const, label: '👤 个人信息', icon: '👤' },
    { key: 'password' as const, label: '🔑 修改密码', icon: '🔑' },
    { key: 'security' as const, label: '🛡️ 账户安全', icon: '🛡️' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setMsg(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {msg && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">头像</label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-2xl p-2 rounded-lg transition-all ${avatar === a ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' : 'hover:bg-slate-100'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">昵称</label>
                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">目标分数</label>
                <input type="number" value={targetScore} onChange={e => setTargetScore(Number(e.target.value))} min={0} max={200}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">个人简介</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="写点什么介绍自己..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 resize-none" />
            </div>
            <button onClick={handleProfileSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              保存修改
            </button>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4 max-w-sm">
            <p className="text-sm text-slate-500">修改密码后需要重新登录</p>
            <div>
              <label className="block text-sm text-slate-600 mb-1">当前密码</label>
              <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="输入当前密码"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">新密码</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="至少4个字符"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">确认新密码</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="再次输入新密码"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={handlePasswordChange} disabled={!oldPwd || !newPwd || !confirmPwd}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              确认修改密码
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">用户名</p>
                <p className="text-xs text-slate-400">注册后不可修改</p>
              </div>
              <span className="text-sm text-slate-600 font-mono bg-white px-3 py-1 rounded border">@{user.username}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">账户角色</p>
                <p className="text-xs text-slate-400">{user.role === 'admin' ? '拥有管理员权限' : '普通学员权限'}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {user.role === 'admin' ? '🛡️ 管理员' : '📝 学员'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">注册时间</p>
                <p className="text-xs text-slate-400">账户创建日期</p>
              </div>
              <span className="text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">最后登录</p>
                <p className="text-xs text-slate-400">上次活跃时间</p>
              </div>
              <span className="text-sm text-slate-600">{new Date(user.lastLoginAt).toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">AI 配置</p>
                <p className="text-xs text-slate-400">{user.aiConfig ? '已配置个人 API Key' : '未配置'}</p>
              </div>
              <Link href="/settings" className="text-xs text-blue-500 hover:underline">前往设置 →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
