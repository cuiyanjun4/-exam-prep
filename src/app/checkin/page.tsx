'use client';

import { useState, useEffect } from 'react';
import { getProgress, getDailyStats } from '@/lib/storage';
import { getGameProfile, getLeaderboard } from '@/lib/gamification';
import { UserProgress, DailyStats } from '@/types';
import { getAuthState } from '@/lib/auth';

interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  hasCheckin: boolean;
  questions: number;
  correct: number;
}

export default function CheckinPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [profile, setProfile] = useState<ReturnType<typeof getGameProfile> | null>(null);
  const [dailyStats, setDailyStats] = useState<Record<string, DailyStats>>({});
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);

  const [showLottery, setShowLottery] = useState(false);
  const [lotteryResult, setLotteryResult] = useState<string | null>(null);

  useEffect(() => {
    setProgress(getProgress());
    setProfile(getGameProfile());
    setDailyStats(getDailyStats());
    const today = new Date().toISOString().split('T')[0];
    const stats = getDailyStats();
    setTodayCheckedIn(!!stats[today] && stats[today].totalQuestions > 0);
  }, []);

  const handleLottery = () => {
    if (!profile || profile.xp < 100) {
      alert('积分不足，抽奖需要 100 XP');
      return;
    }
    
    // 模拟扣除积分
    // profile.xp -= 100;
    
    const prizes = [
      { name: '谢谢参与', prob: 0.4 },
      { name: '10 XP', prob: 0.3 },
      { name: '50 XP', prob: 0.15 },
      { name: '100 XP', prob: 0.1 },
      { name: '「好运连连」称号', prob: 0.04 },
      { name: '「天选之子」称号', prob: 0.01 },
    ];

    const rand = Math.random();
    let sum = 0;
    let won = prizes[0].name;
    for (const p of prizes) {
      sum += p.prob;
      if (rand <= sum) {
        won = p.name;
        break;
      }
    }

    setLotteryResult(won);
    setShowLottery(true);
  };

  const getCalendarDays = (): CalendarDay[] => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sunday
    const days: CalendarDay[] = [];

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonth.getDate() - i;
      const date = new Date(year, month - 1, d).toISOString().split('T')[0];
      days.push({ date, isCurrentMonth: false, hasCheckin: !!dailyStats[date], questions: dailyStats[date]?.totalQuestions || 0, correct: dailyStats[date]?.correctCount || 0 });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d).toISOString().split('T')[0];
      days.push({ date, isCurrentMonth: true, hasCheckin: !!dailyStats[date], questions: dailyStats[date]?.totalQuestions || 0, correct: dailyStats[date]?.correctCount || 0 });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d).toISOString().split('T')[0];
      days.push({ date, isCurrentMonth: false, hasCheckin: !!dailyStats[date], questions: dailyStats[date]?.totalQuestions || 0, correct: dailyStats[date]?.correctCount || 0 });
    }

    return days;
  };

  const prevMonth = () => setCurrentMonth(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCurrentMonth(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  const today = new Date().toISOString().split('T')[0];
  const checkinDays = Object.keys(dailyStats).filter(d => dailyStats[d].totalQuestions > 0).length;
  const monthCheckins = Object.keys(dailyStats).filter(d => {
    const [y, m] = d.split('-');
    return parseInt(y) === currentMonth.year && parseInt(m) - 1 === currentMonth.month && dailyStats[d].totalQuestions > 0;
  }).length;

  const user = getAuthState().currentUser;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔥 每日打卡</h1>
            <p className="text-sm opacity-80 mt-1">坚持每天做题，养成学习习惯</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black">{progress?.streak || 0}</p>
            <p className="text-xs opacity-80">连续打卡天数</p>
          </div>
        </div>

        {/* Streak badges */}
        <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
          {[3, 7, 14, 30, 60, 100].map(target => (
            <div key={target} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
              (progress?.streak || 0) >= target ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50'
            }`}>
              {(progress?.streak || 0) >= target ? '✅' : '🔒'} {target}天
            </div>
          ))}
        </div>
        {/* Today status */}
        <div className="mt-4 p-3 bg-white/20 rounded-xl flex items-center justify-between">
          {todayCheckedIn ? (
            <>
              <span className="font-bold">✅ 今日已打卡</span>
              <span className="text-sm">
                做题 {dailyStats[today]?.totalQuestions || 0} 道 | 正确 {dailyStats[today]?.correctCount || 0} 道
              </span>
            </>
          ) : (
            <>
              <span className="font-bold">⏳ 今日未打卡</span>
              <a href="/practice" className="px-4 py-1.5 bg-white text-orange-600 rounded-lg text-sm font-bold">去做题 →</a>
            </>
          )}
        </div>
      </div>

      {/* 抽奖区域 */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold mb-1">🎁 幸运抽奖</h3>
          <p className="text-sm text-purple-100">每次抽奖消耗 100 XP，有机会获得稀有称号！</p>
          <p className="text-xs text-purple-200 mt-2">当前积分: {profile?.xp || 0} XP</p>
        </div>
        <button 
          onClick={handleLottery}
          className="px-6 py-3 bg-yellow-400 text-purple-900 font-bold rounded-xl hover:bg-yellow-300 hover:scale-105 transition-all shadow-lg"
        >
          抽奖 (-100 XP)
        </button>
      </div>

      {/* 抽奖结果弹窗 */}
      {showLottery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl transform animate-bounce-in">
            <div className="text-6xl mb-4">
              {lotteryResult === '谢谢参与' ? '😢' : '🎉'}
            </div>
            <h3 className="text-2xl font-black mb-2 text-slate-800 dark:text-slate-100">
              {lotteryResult === '谢谢参与' ? '很遗憾' : '恭喜中奖！'}
            </h3>
            <p className="text-lg text-purple-600 font-bold mb-6">
              {lotteryResult}
            </p>
            <button 
              onClick={() => setShowLottery(false)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200"
            >
              确定
            </button>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-blue-600">{checkinDays}</p>
          <p className="text-xs text-slate-500 mt-1">累计打卡</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-orange-600">{progress?.streak || 0}</p>
          <p className="text-xs text-slate-500 mt-1">连续天数</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-green-600">{progress?.totalAnswered || 0}</p>
          <p className="text-xs text-slate-500 mt-1">总做题数</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-2xl font-black text-purple-600">
            {progress?.totalAnswered ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0}%
          </p>
          <p className="text-xs text-slate-500 mt-1">总正确率</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-3 py-1 rounded-lg hover:bg-slate-100 text-slate-600">←</button>
          <h3 className="font-bold text-lg">{currentMonth.year}年{currentMonth.month + 1}月</h3>
          <button onClick={nextMonth} className="px-3 py-1 rounded-lg hover:bg-slate-100 text-slate-600">→</button>
        </div>
        <p className="text-sm text-slate-500 mb-3 text-center">本月打卡 <b className="text-orange-600">{monthCheckins}</b> 天</p>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {getCalendarDays().map((day, i) => (
            <div
              key={i}
              className={`relative p-2 rounded-lg text-center text-sm transition-colors ${
                !day.isCurrentMonth ? 'text-slate-300' :
                day.date === today ? 'bg-blue-50 font-bold text-blue-600 ring-2 ring-blue-200' :
                day.hasCheckin ? 'bg-green-50 text-green-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
              title={day.hasCheckin ? `做题${day.questions}道，正确${day.correct}道` : ''}
            >
              {parseInt(day.date.split('-')[2])}
              {day.hasCheckin && day.isCurrentMonth && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px]">🔥</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly XP chart */}
      {profile && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold mb-3">📈 近7日经验值</h3>
          <div className="flex items-end gap-2 h-32">
            {profile.weeklyXP.slice().reverse().map((xp, i) => {
              const max = Math.max(...profile.weeklyXP, 1);
              const height = (xp / max) * 100;
              const labels = ['6天前', '5天前', '4天前', '3天前', '前天', '昨天', '今天'];
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500">{xp}</span>
                  <div
                    className="w-full bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-md transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[10px] text-slate-400">{labels[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
