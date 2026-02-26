'use client';

import { useState, useEffect } from 'react';
import { getGameProfile } from '@/lib/gamification';
import Link from 'next/link';

interface WorkshopIdea {
  id: string;
  title: string;
  description: string;
  author: string;
  votes: number;
  status: 'pending' | 'approved' | 'implemented';
  createdAt: string;
}

// 模拟数据
const MOCK_IDEAS: WorkshopIdea[] = [
  {
    id: '1',
    title: '地狱模式：错一题重头开始',
    description: '连续答对50题才能通关，一旦答错直接清零重来，极度考验心态和稳定性。',
    author: '行测狂魔',
    votes: 342,
    status: 'implemented',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: '盲盒刷题：隐藏选项',
    description: '题目出现后，先自己想答案，点击后才显示选项，防止过度依赖排除法。',
    author: '逻辑大师',
    votes: 215,
    status: 'approved',
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    title: '双人接力赛',
    description: '两人组队，每人轮流答一题，连击共享，错题扣除双方积分。',
    author: '上岸小分队',
    votes: 189,
    status: 'pending',
    createdAt: '2024-02-20',
  },
];

export default function WorkshopPage() {
  const [profile, setProfile] = useState<ReturnType<typeof getGameProfile> | null>(null);
  const [ideas, setIdeas] = useState<WorkshopIdea[]>(MOCK_IDEAS);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    setProfile(getGameProfile());
  }, []);

  const REQUIRED_XP = 10000;
  const canSubmit = profile && profile.xp >= REQUIRED_XP;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !newTitle || !newDesc) return;

    const newIdea: WorkshopIdea = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      author: profile.title + ' ' + (profile.level >= 10 ? '大佬' : '玩家'),
      votes: 1,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setIdeas([newIdea, ...ideas]);
    setShowForm(false);
    setNewTitle('');
    setNewDesc('');
    
    // 扣除积分 (实际应用中应该调用扣除积分的API)
    alert('提交成功！已消耗 10000 积分。');
  };

  const handleVote = (id: string) => {
    setIdeas(ideas.map(idea => 
      idea.id === id ? { ...idea, votes: idea.votes + 1 } : idea
    ));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">🛠️ 创意工坊</h1>
          <p className="text-purple-100 mb-6">
            攒够 10,000 积分，即可提交你的专属学习模式创意！高赞创意将被官方采纳并实装。
          </p>
          
          <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm inline-flex">
            <div className="text-center">
              <p className="text-xs text-purple-200 mb-1">当前积分</p>
              <p className="text-2xl font-bold text-yellow-400">{profile?.xp || 0} <span className="text-sm font-normal text-white">XP</span></p>
            </div>
            <div className="w-px h-10 bg-white/20 mx-2" />
            <div>
              {canSubmit ? (
                <button 
                  onClick={() => setShowForm(true)}
                  className="px-6 py-2 bg-yellow-400 text-purple-900 font-bold rounded-lg hover:bg-yellow-300 transition-colors shadow-lg"
                >
                  💡 提交创意 (-10000 XP)
                </button>
              ) : (
                <div className="text-sm text-purple-200">
                  <p>距离提交创意还差</p>
                  <p className="font-bold text-white">{REQUIRED_XP - (profile?.xp || 0)} XP</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 提交表单 */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-purple-100 dark:border-purple-900/30 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200">提交新模式创意</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">模式名称</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="例如：地狱模式、盲盒刷题..."
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">详细规则说明</label>
              <textarea 
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="详细描述这个模式的玩法、规则、奖惩机制等..."
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none"
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                取消
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
              >
                确认提交
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 创意列表 */}
      <div className="grid gap-4">
        {ideas.map(idea => (
          <div key={idea.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex gap-5">
            {/* 投票区 */}
            <div className="flex flex-col items-center justify-center shrink-0 w-16">
              <button 
                onClick={() => handleVote(idea.id)}
                className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors mb-1"
              >
                ▲
              </button>
              <span className="font-bold text-lg text-slate-700 dark:text-slate-300">{idea.votes}</span>
            </div>

            {/* 内容区 */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{idea.title}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  idea.status === 'implemented' ? 'bg-green-100 text-green-700' :
                  idea.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {idea.status === 'implemented' ? '✅ 已实装' :
                   idea.status === 'approved' ? '⏳ 开发中' : '💡 投票中'}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                {idea.description}
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">👤</span>
                  <span>{idea.author}</span>
                </div>
                <span>{idea.createdAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
