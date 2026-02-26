'use client';

import { useState, useEffect, useCallback } from 'react';
import { Question, Module } from '@/types';
import { getRandomQuestions } from '@/data';
import { getGameProfile } from '@/lib/gamification';
import Link from 'next/link';

type PKState = 'idle' | 'matching' | 'playing' | 'finished';

interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  combo: number;
}

const PK_MODULES: Module[] = ['资料分析', '言语理解'];
const PK_TIME_LIMIT = 180; // 3分钟
const PK_QUESTION_COUNT = 10;

export default function PKPage() {
  const [state, setState] = useState<PKState>('idle');
  const [selectedModule, setSelectedModule] = useState<Module>('资料分析');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PK_TIME_LIMIT);
  
  const [me, setMe] = useState<Player>({ id: 'me', name: '我', avatar: '🧑‍💻', score: 0, combo: 0 });
  const [opponent, setOpponent] = useState<Player | null>(null);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 初始化玩家信息
  useEffect(() => {
    const profile = getGameProfile();
    setMe(prev => ({
      ...prev,
      name: profile.title + '玩家',
      avatar: profile.titleIcon || '🧑‍💻'
    }));
  }, []);

  // 匹配对手逻辑 (模拟)
  const startMatch = () => {
    setState('matching');
    setTimeout(() => {
      setOpponent({
        id: 'opp',
        name: ['行测卷王', '上岸必胜', '资料分析大师', '言语小天才'][Math.floor(Math.random() * 4)],
        avatar: ['🦊', '🐱', '🐼', '🦁'][Math.floor(Math.random() * 4)],
        score: 0,
        combo: 0
      });
      
      // 加载题目
      const qs = getRandomQuestions(PK_QUESTION_COUNT, selectedModule);
      setQuestions(qs);
      setCurrentIndex(0);
      setTimeLeft(PK_TIME_LIMIT);
      setMe(prev => ({ ...prev, score: 0, combo: 0 }));
      setState('playing');
    }, 2000);
  };

  // 倒计时逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (state === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setState('finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state, timeLeft]);

  // 模拟对手答题
  useEffect(() => {
    let oppTimer: NodeJS.Timeout;
    if (state === 'playing' && opponent) {
      // 对手每 10-20 秒答一题
      const nextAnswerTime = Math.random() * 10000 + 10000;
      oppTimer = setTimeout(() => {
        setOpponent(prev => {
          if (!prev) return prev;
          // 70% 概率答对
          const isCorrect = Math.random() > 0.3;
          if (isCorrect) {
            return { ...prev, score: prev.score + 10 + prev.combo * 2, combo: prev.combo + 1 };
          } else {
            return { ...prev, combo: 0 };
          }
        });
      }, nextAnswerTime);
    }
    return () => clearTimeout(oppTimer);
  }, [state, opponent, timeLeft]); // 依赖 timeLeft 触发循环

  const handleAnswer = (key: string) => {
    if (selectedAnswer || state !== 'playing') return;
    
    setSelectedAnswer(key);
    setShowResult(true);
    
    const currentQ = questions[currentIndex];
    const isCorrect = key === currentQ.answer;
    
    setMe(prev => {
      if (isCorrect) {
        return { ...prev, score: prev.score + 10 + prev.combo * 2, combo: prev.combo + 1 };
      } else {
        return { ...prev, combo: 0 };
      }
    });

    // 1秒后进入下一题
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setState('finished');
      }
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ==================== 渲染空闲/匹配状态 ====================
  if (state === 'idle' || state === 'matching') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-6">⚔️</div>
        <h1 className="text-3xl font-bold mb-4">行测巅峰对决</h1>
        <p className="text-slate-500 mb-8">实时匹配对手，3分钟限时竞速，连击得分翻倍！</p>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
          <h3 className="font-bold mb-4">选择对战科目</h3>
          <div className="flex justify-center gap-4">
            {PK_MODULES.map(m => (
              <button
                key={m}
                onClick={() => setSelectedModule(m)}
                disabled={state === 'matching'}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  selectedModule === m 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {state === 'idle' ? (
          <button 
            onClick={startMatch}
            className="px-12 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xl font-bold rounded-full hover:scale-105 transition-transform shadow-xl shadow-red-500/30"
          >
            开始匹配
          </button>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-red-500 font-bold animate-pulse">正在寻找旗鼓相当的对手...</p>
          </div>
        )}
      </div>
    );
  }

  // ==================== 渲染对战/结算状态 ====================
  const currentQ = questions[currentIndex];
  const isWin = me.score > (opponent?.score || 0);
  const isDraw = me.score === (opponent?.score || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 顶部对战信息栏 */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center justify-between relative overflow-hidden">
        {/* 我方 */}
        <div className="flex items-center gap-4 z-10">
          <div className="text-4xl bg-white/10 w-16 h-16 rounded-full flex items-center justify-center border-2 border-blue-400">
            {me.avatar}
          </div>
          <div>
            <p className="font-bold text-blue-400">{me.name}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{me.score}</span>
              <span className="text-xs text-slate-400">分</span>
            </div>
            {me.combo > 1 && <p className="text-xs text-yellow-400 font-bold animate-bounce">{me.combo} 连击 🔥</p>}
          </div>
        </div>

        {/* VS & 倒计时 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
          <div className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-500 mb-1">
            VS
          </div>
          <div className={`text-xl font-mono font-bold bg-black/50 px-4 py-1 rounded-full ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* 敌方 */}
        <div className="flex items-center gap-4 z-10 text-right flex-row-reverse">
          <div className="text-4xl bg-white/10 w-16 h-16 rounded-full flex items-center justify-center border-2 border-red-400">
            {opponent?.avatar}
          </div>
          <div>
            <p className="font-bold text-red-400">{opponent?.name}</p>
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-3xl font-black">{opponent?.score}</span>
              <span className="text-xs text-slate-400">分</span>
            </div>
            {opponent && opponent.combo > 1 && <p className="text-xs text-yellow-400 font-bold animate-bounce">{opponent.combo} 连击 🔥</p>}
          </div>
        </div>

        {/* 进度条背景 */}
        <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all" style={{ width: `${(me.score / (me.score + (opponent?.score || 1))) * 100}%` }} />
        <div className="absolute bottom-0 right-0 h-1 bg-red-500 transition-all" style={{ width: `${((opponent?.score || 0) / (me.score + (opponent?.score || 1))) * 100}%` }} />
      </div>

      {/* 结算界面 */}
      {state === 'finished' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-xl border border-slate-100 dark:border-slate-700">
          <div className="text-6xl mb-4">
            {isWin ? '🏆' : isDraw ? '🤝' : '💔'}
          </div>
          <h2 className={`text-4xl font-black mb-2 ${isWin ? 'text-yellow-500' : isDraw ? 'text-slate-500' : 'text-slate-400'}`}>
            {isWin ? '胜利！' : isDraw ? '平局' : '惜败'}
          </h2>
          <p className="text-slate-500 mb-8">
            {isWin ? '太强了！你战胜了对手，获得了 50 XP 奖励！' : '就差一点点，下次一定能赢！'}
          </p>
          
          <div className="flex justify-center gap-12 mb-10">
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">你的得分</p>
              <p className="text-4xl font-bold text-blue-500">{me.score}</p>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">对手得分</p>
              <p className="text-4xl font-bold text-red-500">{opponent?.score}</p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={() => setState('idle')} className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200">
              返回大厅
            </button>
            <button onClick={startMatch} className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/30">
              再来一局
            </button>
          </div>
        </div>
      ) : (
        /* 答题区域 */
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-500">第 {currentIndex + 1} / {questions.length} 题</span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{currentQ.subType}</span>
          </div>
          
          <div className="p-6">
            <p className="text-lg leading-relaxed mb-8 whitespace-pre-wrap">{currentQ.content}</p>
            
            <div className="space-y-3">
              {currentQ.options.map(opt => {
                let btnClass = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20';
                
                if (showResult) {
                  if (opt.key === currentQ.answer) {
                    btnClass = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
                  } else if (opt.key === selectedAnswer) {
                    btnClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';
                  } else {
                    btnClass = 'border-slate-200 dark:border-slate-700 opacity-50';
                  }
                }

                return (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswer(opt.key)}
                    disabled={showResult}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${btnClass}`}
                  >
                    <span className="font-bold mr-3">{opt.key}.</span>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
