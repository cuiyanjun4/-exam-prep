'use client';

import { useState, useEffect } from 'react';
import { Module } from '@/types';
import { getProgress, getDailyStats } from '@/lib/storage';

const ALL_MODULES: Module[] = ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析', '政治理论'];
const MODULE_ICONS: Record<Module, string> = {
  '常识判断': '📚', '言语理解': '📝', '数量关系': '🔢',
  '判断推理': '🧠', '资料分析': '📊', '政治理论': '🏛️',
};

interface StudyPlan {
  id: string;
  name: string;
  modules: Module[];
  dailyGoal: number; // questions per day
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
  schedule: { day: string; module: Module; goal: number; done: number }[];
}

const PRESETS = [
  { name: '30天冲刺计划', icon: '🔥', days: 30, dailyGoal: 60, desc: '每日60题，覆盖全部模块' },
  { name: '60天稳步提升', icon: '📈', days: 60, dailyGoal: 40, desc: '每日40题，循序渐进' },
  { name: '90天全面备考', icon: '🎯', days: 90, dailyGoal: 30, desc: '每日30题，打好基础' },
];

export default function StudyPlanPage() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', modules: [...ALL_MODULES], dailyGoal: 40, days: 60 });
  const [stats, setStats] = useState<Record<string, { totalQuestions: number }>>({});

  useEffect(() => {
    const saved = localStorage.getItem('study-plans');
    if (saved) setPlans(JSON.parse(saved));
    setStats(getDailyStats());
  }, []);

  const savePlans = (p: StudyPlan[]) => {
    setPlans(p);
    localStorage.setItem('study-plans', JSON.stringify(p));
  };

  const createPlan = (preset?: typeof PRESETS[0]) => {
    const config = preset || newPlan;
    const todayDate = new Date();
    const schedule: StudyPlan['schedule'] = [];

    for (let i = 0; i < (preset?.days || newPlan.days); i++) {
      const date = new Date(todayDate);
      date.setDate(date.getDate() + i);
      const dayStr = date.toISOString().split('T')[0];
      const modules = preset ? ALL_MODULES : newPlan.modules;
      const mod = modules[i % modules.length];
      const dailyStat = stats[dayStr];
      schedule.push({
        day: dayStr,
        module: mod,
        goal: Math.ceil(config.dailyGoal / modules.length),
        done: dailyStat?.totalQuestions || 0,
      });
    }

    const plan: StudyPlan = {
      id: Date.now().toString(),
      name: preset?.name || newPlan.name || '自定义计划',
      modules: preset ? ALL_MODULES : newPlan.modules,
      dailyGoal: config.dailyGoal,
      targetDate: schedule[schedule.length - 1].day,
      createdAt: new Date().toISOString(),
      schedule,
    };

    savePlans([plan, ...plans]);
    setShowCreate(false);
  };

  const deletePlan = (id: string) => {
    savePlans(plans.filter(p => p.id !== id));
  };

  const today = new Date().toISOString().split('T')[0];
  const activePlan = plans[0];
  const todaySchedule = activePlan?.schedule.filter(s => s.day === today);
  const totalDone = activePlan?.schedule.reduce((s, d) => s + d.done, 0) || 0;
  const totalGoal = activePlan?.schedule.reduce((s, d) => s + d.goal, 0) || 1;
  const daysLeft = activePlan ? activePlan.schedule.filter(s => s.day >= today).length : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📅 学习计划</h1>
            <p className="text-sm opacity-80 mt-1">制定科学的备考计划，有目标地学习</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-bold text-sm hover:bg-emerald-50"
          >
            + 新建计划
          </button>
        </div>

        {activePlan && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{daysLeft}</p>
              <p className="text-xs opacity-80">剩余天数</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{activePlan.dailyGoal}</p>
              <p className="text-xs opacity-80">每日目标</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{Math.round((totalDone / totalGoal) * 100)}%</p>
              <p className="text-xs opacity-80">总完成率</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick presets */}
      {!activePlan && !showCreate && (
        <div className="grid grid-cols-3 gap-4">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => createPlan(p)}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group"
            >
              <span className="text-3xl">{p.icon}</span>
              <h3 className="font-bold mt-2 group-hover:text-emerald-600">{p.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
              <p className="text-sm font-bold text-emerald-600 mt-2">{p.days}天 · 每日{p.dailyGoal}题</p>
            </button>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold">创建自定义学习计划</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">计划名称</label>
              <input
                value={newPlan.name}
                onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))}
                placeholder="如：我的冲刺计划"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">每日目标(题)</label>
              <input
                type="number" min={10} max={200}
                value={newPlan.dailyGoal}
                onChange={e => setNewPlan(p => ({ ...p, dailyGoal: parseInt(e.target.value) || 40 }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-1">天数</label>
            <input
              type="number" min={7} max={365}
              value={newPlan.days}
              onChange={e => setNewPlan(p => ({ ...p, days: parseInt(e.target.value) || 60 }))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">包含模块</label>
            <div className="flex flex-wrap gap-2">
              {ALL_MODULES.map(m => (
                <button
                  key={m}
                  onClick={() => setNewPlan(p => ({
                    ...p,
                    modules: p.modules.includes(m) ? p.modules.filter(x => x !== m) : [...p.modules, m],
                  }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    newPlan.modules.includes(m) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {MODULE_ICONS[m]} {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => createPlan()} className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold">创建计划</button>
            <button onClick={() => setShowCreate(false)} className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg">取消</button>
          </div>
        </div>
      )}

      {/* Active plan detail */}
      {activePlan && (
        <>
          {/* Today's tasks */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-semibold mb-3">📌 今日任务</h3>
            {todaySchedule && todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.map((task, i) => {
                  const progress = Math.min((stats[today]?.totalQuestions || 0) / (activePlan.dailyGoal || 1), 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl">{MODULE_ICONS[task.module]}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.module}</p>
                        <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${progress * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">{stats[today]?.totalQuestions || 0}/{activePlan.dailyGoal}</span>
                      <a href="/practice" className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100">去做题</a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">今日无安排</p>
            )}
          </div>

          {/* Weekly overview */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">📊 本周概览</h3>
              <button onClick={() => deletePlan(activePlan.id)} className="text-xs text-red-500 hover:text-red-700">删除计划</button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {activePlan.schedule.slice(0, 7).map((s, i) => {
                const isToday = s.day === today;
                const done = stats[s.day]?.totalQuestions || 0;
                const pct = Math.min(done / (s.goal || 1), 1);
                return (
                  <div key={i} className={`text-center p-2 rounded-lg ${isToday ? 'bg-emerald-50 ring-2 ring-emerald-200' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400">{new Date(s.day).toLocaleDateString('zh-CN', { weekday: 'short' })}</p>
                    <p className="text-xs font-bold mt-1">{s.day.slice(5)}</p>
                    <div className={`w-8 h-8 rounded-full mx-auto mt-1 flex items-center justify-center text-xs font-bold ${
                      pct >= 1 ? 'bg-emerald-500 text-white' : pct > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {pct >= 1 ? '✓' : `${Math.round(pct * 100)}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* All plans */}
      {plans.length > 1 && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold mb-3">📋 历史计划</h3>
          <div className="space-y-2">
            {plans.slice(1).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-slate-400">创建于 {p.createdAt.split('T')[0]}</p>
                </div>
                <button onClick={() => deletePlan(p.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
