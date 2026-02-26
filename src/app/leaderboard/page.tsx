'use client';

import { useState, useEffect } from 'react';
import { getGameProfile, TITLES, ACHIEVEMENTS, getLevelProgress, xpForLevel } from '@/lib/gamification';
import { getProgress, getDailyStats } from '@/lib/storage';
import { getAuthState } from '@/lib/auth';

type TabType = 'xp' | 'accuracy' | 'streak' | 'achievements';

// Generate simulated competitors for a realistic leaderboard experience
function generateCompetitors() {
  const names = [
    '学霸小王', '公考达人', '上岸必胜', '刷题机器', '行测冲冲冲',
    '努力的小鱼', '每天进步', '坚持到底', '必上岸', '题海战术',
    '逻辑王者', '文科学霸', '数量之星', '常识百科', '资料高手',
    '判断达人', '言语大师', '速刷选手', '考公先锋', '智慧学子',
  ];
  const avatars = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '🧑‍💻', '🦊', '🐱', '🐼', '🦁', '🐯'];

  return names.map((name, i) => ({
    name,
    avatar: avatars[i % avatars.length],
    xp: Math.floor(Math.random() * 5000) + 200,
    level: Math.floor(Math.random() * 20) + 1,
    accuracy: Math.floor(Math.random() * 40) + 55,
    streak: Math.floor(Math.random() * 30) + 1,
    achievements: Math.floor(Math.random() * 6) + 1,
    totalQuestions: Math.floor(Math.random() * 2000) + 100,
  }));
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<TabType>('xp');
  const [profile, setProfile] = useState<ReturnType<typeof getGameProfile> | null>(null);
  const [competitors, setCompetitors] = useState<ReturnType<typeof generateCompetitors>>([]);
  const [myRank, setMyRank] = useState(1);

  useEffect(() => {
    const p = getGameProfile();
    setProfile(p);
    const progress = getProgress();
    const user = getAuthState().currentUser;

    // Create persistent competitors (seeded by today's date)
    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').join('');
    const comps = generateCompetitors();
    setCompetitors(comps);
  }, []);

  const getMyEntry = () => {
    if (!profile) return null;
    const user = getAuthState().currentUser;
    const progress = getProgress();
    return {
      name: user?.nickname || '我',
      avatar: user?.avatar || '🧑‍💻',
      xp: profile.xp,
      level: profile.level,
      accuracy: progress.totalAnswered > 0 ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0,
      streak: progress.streak,
      achievements: profile.achievements.length,
      totalQuestions: profile.totalQuestions,
    };
  };

  const getRankings = () => {
    const me = getMyEntry();
    if (!me) return [];
    const all = [...competitors, me];

    const sorted = all.sort((a, b) => {
      switch (tab) {
        case 'xp': return b.xp - a.xp;
        case 'accuracy': return b.accuracy - a.accuracy;
        case 'streak': return b.streak - a.streak;
        case 'achievements': return b.achievements - a.achievements;
        default: return 0;
      }
    });

    return sorted;
  };

  const rankings = getRankings();
  const me = getMyEntry();
  const myIdx = rankings.findIndex(r => r.name === me?.name);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'xp', label: '经验值', icon: '⭐' },
    { key: 'accuracy', label: '正确率', icon: '🎯' },
    { key: 'streak', label: '连续打卡', icon: '🔥' },
    { key: 'achievements', label: '成就', icon: '🏅' },
  ];

  const getValueForTab = (entry: ReturnType<typeof getMyEntry>) => {
    if (!entry) return '';
    switch (tab) {
      case 'xp': return `${entry.xp} XP`;
      case 'accuracy': return `${entry.accuracy}%`;
      case 'streak': return `${entry.streak}天`;
      case 'achievements': return `${entry.achievements}个`;
    }
  };

  const medal = (rank: number) => {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return `${rank + 1}`;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white text-center">
        <h1 className="text-2xl font-bold">🏆 排行榜</h1>
        <p className="text-sm opacity-80 mt-1">和其他考生比拼，激发学习动力</p>

        {me && (
          <div className="mt-4 inline-flex items-center gap-3 bg-white/20 rounded-xl px-5 py-3">
            <span className="text-3xl">{me.avatar}</span>
            <div className="text-left">
              <p className="font-bold">{me.name}</p>
              <p className="text-sm opacity-80">当前排名 #{myIdx + 1}</p>
            </div>
            <div className="text-right ml-4">
              <p className="text-xl font-black">{getValueForTab(me)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {rankings.length >= 3 && (
        <div className="flex items-end justify-center gap-3">
          {[1, 0, 2].map(idx => {
            const entry = rankings[idx];
            if (!entry) return null;
            const isMe = entry.name === me?.name;
            const heights = ['h-28', 'h-36', 'h-24'];
            const sizes = ['text-3xl', 'text-4xl', 'text-3xl'];
            return (
              <div key={idx} className={`flex flex-col items-center ${idx === 1 ? 'order-2' : idx === 0 ? 'order-1' : 'order-3'}`}>
                <span className={sizes[[1, 0, 2].indexOf(idx)]}>{entry.avatar}</span>
                <p className={`text-sm font-bold mt-1 ${isMe ? 'text-blue-600' : 'text-slate-700'}`}>{entry.name}</p>
                <p className="text-xs text-slate-500">{getValueForTab(entry)}</p>
                <div className={`${heights[[1, 0, 2].indexOf(idx)]} w-20 mt-2 rounded-t-xl flex items-start justify-center pt-2 ${
                  idx === 0 ? 'bg-gradient-to-t from-yellow-400 to-amber-300' :
                  idx === 1 ? 'bg-gradient-to-t from-slate-300 to-slate-200' :
                  'bg-gradient-to-t from-orange-300 to-orange-200'
                }`}>
                  <span className="text-2xl">{medal(idx)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full rankings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-sm text-slate-600">完整排名</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {rankings.map((entry, i) => {
            const isMe = entry.name === me?.name;
            return (
              <div key={i} className={`flex items-center gap-3 px-5 py-3 ${isMe ? 'bg-blue-50' : ''}`}>
                <span className={`w-8 text-center font-bold ${i < 3 ? 'text-lg' : 'text-sm text-slate-500'}`}>
                  {medal(i)}
                </span>
                <span className="text-xl">{entry.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-blue-600' : 'text-slate-700'}`}>
                    {entry.name} {isMe && <span className="text-xs font-normal text-blue-400">(我)</span>}
                  </p>
                  <p className="text-xs text-slate-400">Lv.{entry.level} · 做题{entry.totalQuestions}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{getValueForTab(entry)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 pb-4">
        💡 排行榜数据包含模拟对手，联网部署后将显示真实排名
      </p>
    </div>
  );
}
