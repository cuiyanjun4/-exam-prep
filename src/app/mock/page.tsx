'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllQuestions, getQuestionsByModule, getRandomQuestions } from '@/data';
import { addRecord } from '@/lib/storage';
import { recordAnswer } from '@/lib/gamification';
import { Question, Module, AnswerRecord } from '@/types';

type ExamStage = 'config' | 'exam' | 'result';
type ExamPreset = 'full' | 'half' | 'module' | 'custom';

interface ExamConfig {
  preset: ExamPreset;
  totalQuestions: number;
  timeLimit: number; // minutes
  modules: Module[];
}

interface ExamAnswer {
  questionId: string;
  userAnswer: string;
  timeSpent: number;
  isCorrect: boolean;
}

const MODULE_LIST: Module[] = ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析', '政治理论'];

const PRESETS: Record<ExamPreset, { label: string; icon: string; desc: string; questions: number; time: number }> = {
  full: { label: '全真模拟', icon: '📋', desc: '120题 / 120分钟，还原真实行测', questions: 120, time: 120 },
  half: { label: '半卷冲刺', icon: '⚡', desc: '60题 / 60分钟，高效冲刺练习', questions: 60, time: 60 },
  module: { label: '模块专练', icon: '🎯', desc: '选择特定模块集中突破', questions: 30, time: 30 },
  custom: { label: '自定义', icon: '⚙️', desc: '自由设置题数和时间', questions: 50, time: 50 },
};

export default function MockExamPage() {
  const [stage, setStage] = useState<ExamStage>('config');
  const [config, setConfig] = useState<ExamConfig>({ preset: 'full', totalQuestions: 120, timeLimit: 120, modules: [...MODULE_LIST] });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [showSheet, setShowSheet] = useState(false);
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer
  useEffect(() => {
    if (stage !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handlePresetChange = (preset: ExamPreset) => {
    const p = PRESETS[preset];
    setConfig(c => ({
      ...c,
      preset,
      totalQuestions: p.questions,
      timeLimit: p.time,
      modules: preset === 'module' ? [MODULE_LIST[0]] : [...MODULE_LIST],
    }));
  };

  const startExam = () => {
    let pool: Question[] = [];
    if (config.modules.length === MODULE_LIST.length) {
      pool = getAllQuestions();
    } else {
      for (const m of config.modules) {
        pool.push(...getQuestionsByModule(m));
      }
    }
    // Shuffle and take
    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, config.totalQuestions);
    if (shuffled.length === 0) return;
    setQuestions(shuffled);
    setAnswers(new Array(shuffled.length).fill(null).map((_, i) => ({
      questionId: shuffled[i].id,
      userAnswer: '',
      timeSpent: 0,
      isCorrect: false,
    })));
    setTimeLeft(config.timeLimit * 60);
    setQuestionStartTime(Date.now());
    setCurrentIndex(0);
    setMarkedQuestions(new Set());
    setStage('exam');
  };

  const selectAnswer = (key: string) => {
    const now = Date.now();
    const spent = Math.round((now - questionStartTime) / 1000);
    setAnswers(prev => {
      const next = [...prev];
      next[currentIndex] = {
        ...next[currentIndex],
        userAnswer: key,
        timeSpent: next[currentIndex].timeSpent + spent,
        isCorrect: key === questions[currentIndex].answer,
      };
      return next;
    });
    setQuestionStartTime(now);
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
    setQuestionStartTime(Date.now());
    setShowSheet(false);
  };

  const toggleMark = () => {
    setMarkedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  const handleFinish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Record answers into storage
    answers.forEach((ans, i) => {
      if (ans.userAnswer) {
        const q = questions[i];
        const rec: AnswerRecord = {
          questionId: q.id,
          userAnswer: ans.userAnswer,
          isCorrect: ans.userAnswer === q.answer,
          timeSpent: ans.timeSpent,
          timestamp: Date.now(),
          module: q.module,
          subType: q.subType,
        };
        addRecord(rec);
        recordAnswer(rec.isCorrect, rec.timeSpent);
      }
    });
    setStage('result');
  }, [answers, questions]);

  // Result analysis
  const getResultStats = () => {
    const answered = answers.filter(a => a.userAnswer);
    const correct = answered.filter(a => a.isCorrect);
    const totalTime = answers.reduce((s, a) => s + a.timeSpent, 0);
    const moduleBreakdown: Record<string, { total: number; correct: number; time: number }> = {};
    questions.forEach((q, i) => {
      if (!moduleBreakdown[q.module]) moduleBreakdown[q.module] = { total: 0, correct: 0, time: 0 };
      moduleBreakdown[q.module].total++;
      if (answers[i]?.isCorrect) moduleBreakdown[q.module].correct++;
      moduleBreakdown[q.module].time += answers[i]?.timeSpent || 0;
    });

    return {
      total: questions.length,
      answered: answered.length,
      correct: correct.length,
      accuracy: answered.length > 0 ? Math.round((correct.length / answered.length) * 100) : 0,
      score: Math.round((correct.length / questions.length) * 100),
      totalTime,
      avgTime: answered.length > 0 ? Math.round(totalTime / answered.length) : 0,
      unanswered: questions.length - answered.length,
      moduleBreakdown,
    };
  };

  // ==================== CONFIG ====================
  if (stage === 'config') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">📋 模拟考试</h1>
          <p className="text-slate-500 mt-2">全真模拟行测考试，检验复习成果</p>
        </div>

        {/* Preset cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.entries(PRESETS) as [ExamPreset, typeof PRESETS[ExamPreset]][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                config.preset === key
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 hover:border-blue-300 bg-white'
              }`}
            >
              <span className="text-2xl">{p.icon}</span>
              <p className="font-semibold mt-2">{p.label}</p>
              <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
            </button>
          ))}
        </div>

        {/* Module selection for module preset */}
        {(config.preset === 'module' || config.preset === 'custom') && (
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-semibold mb-3">选择模块</h3>
            <div className="flex flex-wrap gap-2">
              {MODULE_LIST.map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setConfig(c => {
                      const has = c.modules.includes(m);
                      return {
                        ...c,
                        modules: has ? c.modules.filter(x => x !== m) : [...c.modules, m],
                      };
                    });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.modules.includes(m)
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom settings */}
        {config.preset === 'custom' && (
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">题目数量</label>
              <input
                type="number"
                min={10} max={200}
                value={config.totalQuestions}
                onChange={e => setConfig(c => ({ ...c, totalQuestions: parseInt(e.target.value) || 50 }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1">时限（分钟）</label>
              <input
                type="number"
                min={5} max={180}
                value={config.timeLimit}
                onChange={e => setConfig(c => ({ ...c, timeLimit: parseInt(e.target.value) || 50 }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Start button */}
        <div className="text-center">
          <button
            onClick={startExam}
            disabled={config.modules.length === 0}
            className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            🚀 开始考试（{config.totalQuestions}题 / {config.timeLimit}分钟）
          </button>
          <p className="text-xs text-slate-400 mt-2">考试开始后将无法暂停，请确保有充足时间</p>
        </div>
      </div>
    );
  }

  // ==================== EXAM ====================
  if (stage === 'exam' && questions.length > 0) {
    const q = questions[currentIndex];
    const currentAnswer = answers[currentIndex]?.userAnswer;
    const progress = answers.filter(a => a.userAnswer).length;
    const isUrgent = timeLeft < 300; // less than 5 min

    return (
      <div className="max-w-4xl mx-auto relative">
        {/* Top bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 z-30 px-4 py-3 flex items-center justify-between -mx-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700">
              {currentIndex + 1} / {questions.length}
            </span>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(progress / questions.length) * 100}%` }} />
            </div>
          </div>
          <div className={`font-mono font-bold text-lg ${isUrgent ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
          <div className="flex gap-2">
            <button onClick={toggleMark} className={`px-3 py-1.5 rounded-lg text-sm ${markedQuestions.has(currentIndex) ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
              {markedQuestions.has(currentIndex) ? '🔖 已标记' : '🏷️ 标记'}
            </button>
            <button onClick={() => setShowSheet(true)} className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 text-slate-600">
              📄 答题卡
            </button>
          </div>
        </div>

        {/* Question */}
        <div className="mt-6 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">{q.module}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-500">{q.subType}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">
              {q.difficulty === 1 ? '简单' : q.difficulty === 2 ? '中等' : '困难'}
            </span>
          </div>
          <p className="text-base leading-7 text-slate-800 whitespace-pre-line">{q.content}</p>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-3">
          {q.options.map(opt => (
            <button
              key={opt.key}
              onClick={() => selectAnswer(opt.key)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                currentAnswer === opt.key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-blue-300 bg-white text-slate-700'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full mr-3 text-sm font-bold ${
                currentAnswer === opt.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {opt.key}
              </span>
              {opt.text}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pb-6">
          <button
            onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-2.5 rounded-lg bg-slate-100 text-slate-600 font-medium disabled:opacity-40"
          >
            ← 上一题
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => goToQuestion(currentIndex + 1)}
              className="px-6 py-2.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600"
            >
              下一题 →
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm(`确认交卷？已完成 ${progress}/${questions.length} 题`)) handleFinish();
              }}
              className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:shadow-lg"
            >
              ✅ 交卷
            </button>
          )}
        </div>

        {/* Answer sheet modal */}
        {showSheet && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSheet(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">答题卡</h3>
                <button onClick={() => setShowSheet(false)} className="text-slate-400 text-xl">✕</button>
              </div>
              <div className="flex gap-3 text-xs text-slate-500 mb-4">
                <span>🟦 已答 {progress}</span>
                <span>⬜ 未答 {questions.length - progress}</span>
                <span>🔖 标记 {markedQuestions.size}</span>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToQuestion(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center relative ${
                      i === currentIndex ? 'ring-2 ring-blue-500' : ''
                    } ${
                      answers[i]?.userAnswer
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {i + 1}
                    {markedQuestions.has(i) && <span className="absolute -top-1 -right-1 text-[8px]">🔖</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowSheet(false);
                  if (confirm(`确认交卷？已完成 ${progress}/${questions.length} 题`)) handleFinish();
                }}
                className="mt-4 w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold"
              >
                ✅ 提交交卷
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== RESULT ====================
  if (stage === 'result') {
    const stats = getResultStats();
    const getGrade = (score: number) => {
      if (score >= 80) return { label: '优秀', color: 'text-green-600', bg: 'bg-green-50' };
      if (score >= 60) return { label: '良好', color: 'text-blue-600', bg: 'bg-blue-50' };
      if (score >= 40) return { label: '及格', color: 'text-amber-600', bg: 'bg-amber-50' };
      return { label: '需努力', color: 'text-red-600', bg: 'bg-red-50' };
    };
    const grade = getGrade(stats.score);

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <p className="text-sm opacity-80 mb-2">你的得分</p>
          <p className="text-6xl font-black">{stats.score}</p>
          <p className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-bold ${grade.bg} ${grade.color}`}>{grade.label}</p>
          <div className="grid grid-cols-4 gap-4 mt-6 text-sm">
            <div><p className="opacity-70">总题数</p><p className="text-xl font-bold">{stats.total}</p></div>
            <div><p className="opacity-70">已答</p><p className="text-xl font-bold">{stats.answered}</p></div>
            <div><p className="opacity-70">正确</p><p className="text-xl font-bold">{stats.correct}</p></div>
            <div><p className="opacity-70">正确率</p><p className="text-xl font-bold">{stats.accuracy}%</p></div>
          </div>
        </div>

        {/* Time analysis */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold mb-3">⏱ 时间分析</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">总用时</p>
              <p className="text-lg font-bold">{formatTime(stats.totalTime)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">平均每题</p>
              <p className="text-lg font-bold">{stats.avgTime}秒</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">未作答</p>
              <p className="text-lg font-bold text-red-500">{stats.unanswered}题</p>
            </div>
          </div>
        </div>

        {/* Module breakdown */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold mb-3">📊 模块分析</h3>
          <div className="space-y-3">
            {Object.entries(stats.moduleBreakdown).map(([mod, data]) => {
              const rate = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              return (
                <div key={mod} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-slate-600 flex-shrink-0">{mod}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${rate >= 70 ? 'bg-green-400' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${rate}%` }} />
                  </div>
                  <span className="text-sm font-bold w-16 text-right">{data.correct}/{data.total}</span>
                  <span className={`text-sm font-bold w-12 text-right ${rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {rate}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wrong answers review */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold mb-3">❌ 错题回顾（前10题）</h3>
          <div className="space-y-4">
            {answers
              .map((ans, i) => ({ ans, q: questions[i], i }))
              .filter(({ ans }) => ans.userAnswer && !ans.isCorrect)
              .slice(0, 10)
              .map(({ ans, q, i }) => (
                <div key={i} className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm text-slate-700 mb-2">
                    <span className="font-bold text-red-600">第{i + 1}题</span> [{q.module}] {q.content.slice(0, 80)}...
                  </p>
                  <p className="text-xs text-red-500">你的答案: {ans.userAnswer} | 正确答案: {q.answer}</p>
                  <p className="text-xs text-slate-500 mt-1">{q.explanation.slice(0, 100)}...</p>
                </div>
              ))}
            {answers.filter(a => a.userAnswer && !a.isCorrect).length === 0 && (
              <p className="text-center text-sm text-green-600 py-4">🎉 全部正确，太棒了！</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center pb-8">
          <button onClick={() => setStage('config')} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600">
            📋 再考一次
          </button>
          <button onClick={() => window.location.href = '/analytics'} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200">
            📊 查看分析
          </button>
          <button onClick={() => window.location.href = '/mistakes'} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200">
            ❌ 错题本
          </button>
        </div>
      </div>
    );
  }

  return null;
}
