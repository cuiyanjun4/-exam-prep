'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Question } from '@/types';
import { loadAllQuestions } from '@/lib/questions';
import { addRecord } from '@/lib/storage';
import { getPresetsForTier, saveSpeedSession, getSpeedRating, getBestRecords, SpeedModePreset, SpeedTier, SPEED_TIERS } from '@/lib/speedMode';
import { BLOCK_MODULES, MajorBlock } from '@/types';
import { recommendPhase, getMotivationTip } from '@/lib/flowGuide';

type SpeedState = 'select' | 'countdown' | 'playing' | 'finished';

export default function SpeedPage() {
  const [state, setState] = useState<SpeedState>('select');
  const [selectedTier, setSelectedTier] = useState<SpeedTier>(1);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<SpeedModePreset | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [questionTimeSpent, setQuestionTimeSpent] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [motivation, setMotivation] = useState('');
  const [bestRecords, setBestRecords] = useState<ReturnType<typeof getBestRecords>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const questionStartRef = useRef<number>(0);

  useEffect(() => {
    loadAllQuestions().then(setAllQuestions);
    setBestRecords(getBestRecords());
  }, []);

  // 倒计时
  useEffect(() => {
    if (state !== 'countdown') return;
    if (countdown <= 0) {
      setState('playing');
      startTimeRef.current = Date.now();
      questionStartRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [state, countdown]);

  // 总计时器
  useEffect(() => {
    if (state !== 'playing') return;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = (selectedPreset?.timeLimit || 0) - elapsed;
      setTotalTimeLeft(Math.max(0, remaining));
      setQuestionTimeSpent(Math.floor((Date.now() - questionStartRef.current) / 1000));

      if (remaining <= 0) {
        finishSession();
      }
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, selectedPreset]);

  const selectPreset = (preset: SpeedModePreset) => {
    setSelectedPreset(preset);

    // 筛选对应的题目
    let filtered: Question[] = [];
    if (preset.mode === 'block') {
      const modules = BLOCK_MODULES[preset.target as MajorBlock] || [];
      filtered = allQuestions.filter(q => modules.includes(q.module));
    } else if (preset.mode === 'module') {
      filtered = allQuestions.filter(q => q.module === preset.target);
    } else {
      filtered = allQuestions.filter(q => q.subType === preset.target);
    }

    // 随机选题
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, preset.questionCount);
    setSessionQuestions(selected);
    setCurrentIdx(0);
    setCorrectCount(0);
    setQuestionTimes([]);
    setCountdown(3);
    setState('countdown');
  };

  const handleAnswer = useCallback((answer: string) => {
    if (state !== 'playing' || selectedAnswer) return;

    const q = sessionQuestions[currentIdx];
    if (!q) return;

    const timeSpent = Math.floor((Date.now() - questionStartRef.current) / 1000);
    const isCorrect = answer === q.answer;

    setSelectedAnswer(answer);
    if (isCorrect) setCorrectCount(c => c + 1);
    setQuestionTimes(t => [...t, timeSpent]);

    // 保存记录
    addRecord({
      questionId: q.id,
      userAnswer: answer,
      isCorrect,
      timeSpent,
      timestamp: Date.now(),
      module: q.module,
      subType: q.subType,
    });

    // 更新心流提示
    const recentAccuracy = (correctCount + (isCorrect ? 1 : 0)) / (currentIdx + 1);
    const minutesSinceStart = (Date.now() - startTimeRef.current) / 60000;
    const phase = recommendPhase(recentAccuracy, minutesSinceStart, currentIdx + 1);
    setMotivation(getMotivationTip(phase.phase, recentAccuracy, 0));

    // 自动进入下一题
    setTimeout(() => {
      if (currentIdx + 1 >= sessionQuestions.length) {
        finishSession();
      } else {
        setCurrentIdx(i => i + 1);
        setSelectedAnswer('');
        questionStartRef.current = Date.now();
      }
    }, 800);
  }, [state, selectedAnswer, currentIdx, sessionQuestions, correctCount]);

  const finishSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('finished');

    if (!selectedPreset) return;

    const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const avgTime = questionTimes.length > 0
      ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
      : 0;

    saveSpeedSession({
      id: Date.now().toString(36),
      startTime: startTimeRef.current,
      endTime: Date.now(),
      mode: selectedPreset.mode,
      target: selectedPreset.target,
      totalQuestions: sessionQuestions.length,
      answeredCount: currentIdx + (selectedAnswer ? 1 : 0),
      correctCount,
      avgTimePerQuestion: avgTime,
      timeLimit: selectedPreset.timeLimit,
      questionTimes,
      isPR: false,
    });
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ==================== 选择模式 ====================
  if (state === 'select') {
    const { blocks, modules } = getPresetsForTier(selectedTier);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">⚡ 限时速刷</h1>
          <p className="text-slate-500 mt-1">在限定时间内快速完成题目，提升做题速度和效率</p>
        </div>

        {/* 难度等级选择 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-700 mb-3">⚙️ 选择训练强度</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SPEED_TIERS.map(tier => (
              <button
                key={tier.tier}
                onClick={() => setSelectedTier(tier.tier)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedTier === tier.tier
                    ? `${tier.borderColor} ${tier.bgColor} shadow-md`
                    : 'border-slate-100 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-lg ${tier.color}`}>
                    {tier.icon} {tier.label} {tier.name}
                  </span>
                  {selectedTier === tier.tier && (
                    <span className="text-blue-500">✓</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{tier.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 三大块速刷 */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">🎯 专项速刷</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {blocks.map(preset => {
              const key = `${preset.mode}:${preset.target}`;
              const best = bestRecords[key];
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  disabled={allQuestions.length === 0}
                  className="p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all text-left disabled:opacity-50 flex flex-col h-full"
                >
                  <div className="text-3xl mb-2">{preset.icon}</div>
                  <h3 className="text-lg font-bold text-slate-800">{preset.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 flex-grow">{preset.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <span>{preset.questionCount}题</span>
                    <span>{formatTime(preset.timeLimit)}</span>
                    <span>{preset.targetTimePerQuestion}秒/题</span>
                  </div>
                  {best && (
                    <div className="mt-2 text-xs bg-green-50 text-green-600 px-2 py-1 rounded w-full">
                      🏆 最佳: {Math.round(best.correctCount / best.totalQuestions * 100)}% / {best.avgTimePerQuestion.toFixed(0)}秒/题
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 各模块速刷 */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">📝 模块速刷</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {modules.map(preset => {
              const key = `${preset.mode}:${preset.target}`;
              const best = bestRecords[key];
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  disabled={allQuestions.length === 0}
                  className="p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all text-center disabled:opacity-50 flex flex-col items-center h-full"
                >
                  <div className="text-2xl mb-1">{preset.icon}</div>
                  <h4 className="text-sm font-bold text-slate-700">{preset.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{preset.questionCount}题 · {formatTime(preset.timeLimit)}</p>
                  <div className="mt-auto pt-2 w-full">
                    {best && (
                      <div className="text-xs text-green-600">
                        🏆 {Math.round(best.correctCount / best.totalQuestions * 100)}%
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 提示 */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h3 className="font-semibold text-amber-800 mb-2">💡 速刷技巧</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• 不确定的题快速排除后直觉选择，不要纠结</li>
            <li>• 建议先做资料分析（分值高、确定性强）</li>
            <li>• 数量关系如果超时直接猜C跳过</li>
            <li>• 常识判断30秒内必须作答</li>
          </ul>
        </div>
      </div>
    );
  }

  // ==================== 倒计时 ====================
  if (state === 'countdown') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-8xl font-bold text-blue-600 animate-pulse">{countdown}</div>
          <p className="text-xl text-slate-500 mt-4">准备开始...</p>
          <p className="text-sm text-slate-400 mt-2">{selectedPreset?.name} · {selectedPreset?.questionCount}题 · 限时{formatTime(selectedPreset?.timeLimit || 0)}</p>
        </div>
      </div>
    );
  }

  // ==================== 做题中 ====================
  const currentQ = sessionQuestions[currentIdx];

  if (state === 'playing' && currentQ) {
    const progress = ((currentIdx) / sessionQuestions.length) * 100;
    const timePercent = selectedPreset ? (totalTimeLeft / selectedPreset.timeLimit) * 100 : 100;
    const isTimeWarning = timePercent < 20;
    const targetTime = selectedPreset?.targetTimePerQuestion || 60;
    const isQuestionSlow = questionTimeSpent > targetTime;
    const rating = getSpeedRating(questionTimeSpent, targetTime);

    return (
      <div className="space-y-4">
        {/* Top bar */}
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              {selectedPreset?.icon} {selectedPreset?.name}
            </span>
            <span className={`text-2xl font-bold font-mono ${isTimeWarning ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
              {formatTime(totalTimeLeft)}
            </span>
            <span className="text-sm text-slate-500">
              {currentIdx + 1}/{sessionQuestions.length}
            </span>
          </div>

          {/* 总进度条 */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 时间进度条 */}
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 rounded-full ${isTimeWarning ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${timePercent}%` }}
            />
          </div>
        </div>

        {/* 心流提示 */}
        {motivation && (
          <div className="text-center text-sm text-blue-600 bg-blue-50 py-2 rounded-lg">
            {motivation}
          </div>
        )}

        {/* 题目 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded">
              {currentQ.module} · {currentQ.subType}
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono ${isQuestionSlow ? 'text-red-500' : 'text-slate-500'}`}>
                {questionTimeSpent}s
              </span>
              <span className={`text-xs font-bold ${rating.color}`}>
                {rating.rating}
              </span>
            </div>
          </div>

          <p className="text-base text-slate-800 leading-relaxed mb-4">{currentQ.content}</p>

          <div className="space-y-2">
            {currentQ.options.map(opt => {
              let btnClass = 'border-slate-200 hover:border-blue-400 hover:bg-blue-50';

              if (selectedAnswer) {
                if (opt.key === currentQ.answer) {
                  btnClass = 'border-green-500 bg-green-50 text-green-700';
                } else if (opt.key === selectedAnswer && selectedAnswer !== currentQ.answer) {
                  btnClass = 'border-red-500 bg-red-50 text-red-700';
                } else {
                  btnClass = 'border-slate-100 bg-slate-50 text-slate-400';
                }
              }

              return (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={!!selectedAnswer}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${btnClass}`}
                >
                  <span className="font-medium mr-2">{opt.key}.</span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* 跳过按钮 */}
        <div className="flex justify-center">
          <button
            onClick={() => handleAnswer('SKIP')}
            className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2"
          >
            跳过此题 →
          </button>
        </div>

        {/* 当前统计 */}
        <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
          <span>✅ {correctCount}</span>
          <span>❌ {currentIdx - correctCount + (selectedAnswer && selectedAnswer !== sessionQuestions[currentIdx]?.answer ? 1 : 0)}</span>
          <span>📊 {currentIdx > 0 ? Math.round(correctCount / currentIdx * 100) : 0}%</span>
        </div>
      </div>
    );
  }

  // ==================== 结果 ====================
  if (state === 'finished') {
    const answered = questionTimes.length;
    const accuracy = answered > 0 ? Math.round(correctCount / answered * 100) : 0;
    const avgTime = answered > 0 ? questionTimes.reduce((a, b) => a + b, 0) / answered : 0;
    const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const rating = selectedPreset ? getSpeedRating(avgTime, selectedPreset.targetTimePerQuestion) : null;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">
            {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '💪' : '📚'}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">速刷完成！</h1>
          <p className="text-slate-500 mt-1">{selectedPreset?.name}</p>
        </div>

        {/* 评级 */}
        {rating && (
          <div className="text-center">
            <span className={`text-5xl font-bold ${rating.color}`}>{rating.rating}</span>
            <p className={`text-lg font-medium ${rating.color} mt-1`}>{rating.label}</p>
          </div>
        )}

        {/* 成绩卡片 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{answered}/{sessionQuestions.length}</div>
              <div className="text-sm text-slate-400">完成题数</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${accuracy >= 70 ? 'text-green-600' : 'text-red-500'}`}>{accuracy}%</div>
              <div className="text-sm text-slate-400">正确率</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{avgTime.toFixed(1)}s</div>
              <div className="text-sm text-slate-400">平均用时</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{formatTime(totalTime)}</div>
              <div className="text-sm text-slate-400">总用时</div>
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setState('select');
              setSelectedPreset(null);
              setBestRecords(getBestRecords());
            }}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
          >
            返回选择
          </button>
          <button
            onClick={() => {
              if (selectedPreset) selectPreset(selectedPreset);
            }}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            再来一轮 ⚡
          </button>
        </div>
      </div>
    );
  }

  return null;
}
