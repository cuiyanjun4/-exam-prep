'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Question, Module, AnswerRecord } from '@/types';
import { getAllQuestions, getQuestionsByModule, getRandomQuestions } from '@/data';
import { addRecord, toggleFavorite, isFavorite } from '@/lib/storage';
import { createReviewCard, calculateSM2, autoQuality } from '@/lib/sm2';
import { upsertReviewCard } from '@/lib/storage';
import { recordAnswer, XPEvent, GameProfile, getGameProfile, getLevelProgress } from '@/lib/gamification';
import { getEncouragement, checkReminders, Reminder, startStudySession, recordStudyActivity, getStudySession, getDifficultyState, updateDifficulty } from '@/lib/motivation';
import Link from 'next/link';

const modules: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
const EXAM_QUESTION_COUNT = 100; // 模拟考试题量
const EXAM_TIME_LIMIT = 120 * 60; // 120分钟

function PracticeContent() {
  const searchParams = useSearchParams();
  const moduleParam = searchParams.get('module') as Module | null;
  const modeParam = searchParams.get('mode');
  const isExamMode = modeParam === 'exam';

  const [selectedModule, setSelectedModule] = useState<Module | 'all'>(moduleParam || 'all');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 });
  const [feynmanNote, setFeynmanNote] = useState('');
  const [showFeynman, setShowFeynman] = useState(false);
  const [fav, setFav] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [xpEvents, setXpEvents] = useState<XPEvent[]>([]);
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [encouragementMsg, setEncouragementMsg] = useState<string | null>(null);
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);

  // ===== 模拟考试专用状态 =====
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [examFinished, setExamFinished] = useState(false);
  const [examReviewIdx, setExamReviewIdx] = useState<number | null>(null);
  const [showExamGrid, setShowExamGrid] = useState(false);

  // Timer（考试模式倒计时，其他模式正计时）
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRunning && !examFinished) {
      interval = setInterval(() => {
        setTimer(t => {
          if (isExamMode) {
            const newT = t + 1;
            if (newT >= EXAM_TIME_LIMIT) {
              handleSubmitExam();
            }
            return newT;
          }
          return t + 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, examFinished, isExamMode]);

  // Load questions
  const loadQuestions = useCallback(() => {
    startStudySession(); // 开始新的学习会话
    let qs: Question[];
    if (modeParam === 'random') {
      qs = getRandomQuestions(20);
    } else if (isExamMode) {
      qs = getRandomQuestions(EXAM_QUESTION_COUNT);
    } else if (selectedModule === 'all') {
      qs = getAllQuestions();
    } else {
      qs = getQuestionsByModule(selectedModule);
    }

    // 渐进难度引导（仅在普通刷题模式下生效）
    if (!isExamMode && modeParam !== 'random') {
      const diffState = getDifficultyState();
      // 优先筛选符合当前难度的题目
      const targetDiffQs = qs.filter(q => q.difficulty === diffState.currentDifficulty);
      if (targetDiffQs.length > 0) {
        // 随机打乱
        qs = targetDiffQs.sort(() => Math.random() - 0.5);
      }
    }

    setQuestions(qs);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setStartTime(Date.now());
    setSessionStats({ total: 0, correct: 0 });
    setTimer(0);
    setIsRunning(true);
    setExamAnswers({});
    setExamFinished(false);
    setExamReviewIdx(null);
    setShowExamGrid(false);
  }, [selectedModule, modeParam, isExamMode]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (questions[currentIndex]) {
      setFav(isFavorite(questions[currentIndex].id));
    }
  }, [currentIndex, questions]);

  const currentQ = questions[currentIndex];

  // ===== 考试模式：提交试卷 =====
  const handleSubmitExam = useCallback(() => {
    setIsRunning(false);
    setExamFinished(true);

    // 批量保存所有答题记录
    questions.forEach((q, idx) => {
      const userAnswer = examAnswers[idx];
      if (userAnswer) {
        const isCorrect = userAnswer === q.answer;
        const record: AnswerRecord = {
          questionId: q.id,
          userAnswer,
          isCorrect,
          timeSpent: Math.round(timer / questions.length),
          timestamp: Date.now(),
          module: q.module,
          subType: q.subType,
        };
        addRecord(record);

        const quality = autoQuality(isCorrect, record.timeSpent, 60);
        let card = createReviewCard(q.id);
        card = calculateSM2(card, quality);
        upsertReviewCard(card);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, examAnswers, timer]);

  // ===== 考试模式：选择答案（不显示对错） =====
  const handleExamAnswer = (key: string) => {
    setExamAnswers(prev => ({ ...prev, [currentIndex]: key }));
  };

  // ===== 普通模式：选择答案（立即显示对错） =====
  const handleAnswer = (key: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(key);
    setShowExplanation(true);
    setIsRunning(false);

    const isCorrect = key === currentQ.answer;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const record: AnswerRecord = {
      questionId: currentQ.id,
      userAnswer: key,
      isCorrect,
      timeSpent,
      timestamp: Date.now(),
      module: currentQ.module,
      subType: currentQ.subType,
    };
    addRecord(record);

    const quality = autoQuality(isCorrect, timeSpent, 60);
    let card = createReviewCard(currentQ.id);
    card = calculateSM2(card, quality);
    upsertReviewCard(card);

    setSessionStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
    }));

    // 游戏化积分
    const gameResult = recordAnswer(isCorrect, timeSpent, 60);
    setXpEvents(gameResult.events);
    setGameProfile(gameResult.profile);

    // 智能提醒与鼓励
    const session = recordStudyActivity(getStudySession());
    const msg = getEncouragement(isCorrect, gameResult.profile.combo, session.questionsThisSession);
    setEncouragementMsg(msg);

    // 渐进难度更新
    if (!isExamMode && modeParam !== 'random') {
      updateDifficulty(isCorrect);
    }

    const reminders = checkReminders();
    if (reminders.length > 0) {
      // 优先显示高优先级提醒
      const sorted = reminders.sort((a, b) => (a.priority === 'high' ? -1 : 1));
      setActiveReminder(sorted[0]);
    }
  };

  // ===== 考试模式：导航 =====
  const goToQuestion = (idx: number) => {
    setCurrentIndex(idx);
    setShowExamGrid(false);
  };

  const nextQuestion = () => {
    if (isExamMode) {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
      return;
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setStartTime(Date.now());
      setFeynmanNote('');
      setShowFeynman(false);
      setIsRunning(true);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (!isExamMode) {
        setSelectedAnswer(null);
        setShowExplanation(false);
      }
    }
  };

  const handleToggleFavorite = () => {
    const result = toggleFavorite(currentQ.id);
    setFav(result);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ===== 考试结果统计 =====
  const examResults = useMemo(() => {
    if (!examFinished) return null;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    const moduleStats: Record<string, { total: number; correct: number; wrong: number }> = {};
    const wrongQuestions: { idx: number; q: Question; userAnswer: string }[] = [];

    questions.forEach((q, idx) => {
      const userAns = examAnswers[idx];
      if (!moduleStats[q.module]) moduleStats[q.module] = { total: 0, correct: 0, wrong: 0 };
      moduleStats[q.module].total++;

      if (!userAns) {
        unanswered++;
      } else if (userAns === q.answer) {
        correct++;
        moduleStats[q.module].correct++;
      } else {
        wrong++;
        moduleStats[q.module].wrong++;
        wrongQuestions.push({ idx, q, userAnswer: userAns });
      }
    });

    // 错误集中分析
    const subTypeErrors: Record<string, number> = {};
    wrongQuestions.forEach(({ q }) => {
      const key = `${q.module}-${q.subType}`;
      subTypeErrors[key] = (subTypeErrors[key] || 0) + 1;
    });
    const topErrors = Object.entries(subTypeErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return { correct, wrong, unanswered, moduleStats, wrongQuestions, topErrors };
  }, [examFinished, questions, examAnswers]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-500">暂无题目</p>
        <p className="text-slate-400 mt-2">请先在设置中导入题目</p>
      </div>
    );
  }

  // ==================== 考试模式：结果页 ====================
  if (isExamMode && examFinished && examResults) {
    const accuracy = questions.length > 0
      ? Math.round((examResults.correct / questions.length) * 100) : 0;

    // 查看具体题目解析
    if (examReviewIdx !== null) {
      const rq = questions[examReviewIdx];
      const userAns = examAnswers[examReviewIdx];
      const isCorrect = userAns === rq.answer;
      return (
        <div className="space-y-4 max-w-3xl mx-auto">
          <button onClick={() => setExamReviewIdx(null)}
            className="text-sm text-blue-600 hover:text-blue-800">← 返回成绩单</button>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{rq.module}</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{rq.subType}</span>
              <span className={`text-xs font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                {isCorrect ? '✅ 正确' : '❌ 错误'}
              </span>
              <span className="text-xs text-slate-400">第{examReviewIdx + 1}题</span>
            </div>
            <p className="text-base leading-7 whitespace-pre-wrap mb-4">{rq.content}</p>
            <div className="space-y-2 mb-4">
              {rq.options.map(opt => {
                let cls = 'border-slate-200';
                if (opt.key === rq.answer) cls = 'border-green-500 bg-green-50 text-green-800';
                else if (opt.key === userAns && !isCorrect) cls = 'border-red-500 bg-red-50 text-red-800 line-through';
                else cls = 'border-slate-200 opacity-60';
                return (
                  <div key={opt.key} className={`px-4 py-2.5 rounded-lg border-2 ${cls}`}>
                    <span className="font-semibold mr-2">{opt.key}.</span>{opt.text}
                  </div>
                );
              })}
            </div>
            {!isCorrect && userAns && (
              <div className="text-sm text-red-600 mb-2">你的选择：<b>{userAns}</b>　正确答案：<b className="text-green-600">{rq.answer}</b></div>
            )}
            {!userAns && <div className="text-sm text-amber-600 mb-2">未作答　正确答案：<b className="text-green-600">{rq.answer}</b></div>}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-slate-600 mb-1">📖 解析</h4>
              <p className="text-sm leading-6 whitespace-pre-wrap">{rq.explanation}</p>
            </div>
            {rq.relatedKnowledge && (
              <div className="bg-blue-50 rounded-lg p-4 mt-3">
                <h4 className="font-semibold text-sm text-blue-700 mb-1">🔗 关联知识</h4>
                <p className="text-sm leading-6 text-blue-800">{rq.relatedKnowledge}</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              {examReviewIdx > 0 && (
                <button onClick={() => setExamReviewIdx(examReviewIdx - 1)}
                  className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">← 上一题</button>
              )}
              {examReviewIdx < questions.length - 1 && (
                <button onClick={() => setExamReviewIdx(examReviewIdx + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">下一题 →</button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {/* 标题 */}
        <div className="text-center">
          <div className="text-5xl mb-3">{accuracy >= 70 ? '🎉' : accuracy >= 50 ? '💪' : '📚'}</div>
          <h1 className="text-2xl font-bold">模拟考试成绩单</h1>
          <p className="text-slate-500 text-sm mt-1">用时 {formatTime(timer)} · 共{questions.length}题</p>
        </div>

        {/* 总分概览 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{accuracy}%</div>
              <div className="text-xs text-slate-400 mt-1">正确率</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{examResults.correct}</div>
              <div className="text-xs text-slate-400 mt-1">正确</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-500">{examResults.wrong}</div>
              <div className="text-xs text-slate-400 mt-1">错误</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-500">{examResults.unanswered}</div>
              <div className="text-xs text-slate-400 mt-1">未作答</div>
            </div>
          </div>
        </div>

        {/* 各模块分析 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="font-bold text-sm text-slate-700 mb-3">📊 各模块表现</h3>
          <div className="space-y-3">
            {Object.entries(examResults.moduleStats).map(([mod, stats]) => {
              const rate = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
              return (
                <div key={mod}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{mod}</span>
                    <span className={rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'}>
                      {stats.correct}/{stats.total} ({rate}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 错误集中区域 */}
        {examResults.topErrors.length > 0 && (
          <div className="bg-red-50 rounded-xl p-5 border border-red-100">
            <h3 className="font-bold text-sm text-red-700 mb-3">🔥 错误集中区域</h3>
            <div className="space-y-2">
              {examResults.topErrors.map(([area, count]) => (
                <div key={area} className="flex items-center justify-between text-sm">
                  <span className="text-red-800">{area}</span>
                  <span className="text-red-600 font-bold">{count}题</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 错题列表 */}
        {examResults.wrongQuestions.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-700 mb-3">❌ 错题回顾 ({examResults.wrongQuestions.length}题)</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {examResults.wrongQuestions.map(({ idx, q, userAnswer }) => (
                <button key={idx} onClick={() => setExamReviewIdx(idx)}
                  className="w-full text-left px-4 py-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800 line-clamp-1 flex-1">
                      <span className="text-xs text-slate-400 mr-2">#{idx + 1}</span>
                      {q.content.slice(0, 60)}...
                    </span>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="text-xs text-red-500">选{userAnswer}</span>
                      <span className="text-xs text-green-600">正确{q.answer}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 全部题目回顾 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200">
          <h3 className="font-bold text-sm text-slate-700 mb-3">📋 全部题目</h3>
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q, idx) => {
              const ua = examAnswers[idx];
              let bg = 'bg-slate-200 text-slate-500'; // 未作答
              if (ua === q.answer) bg = 'bg-green-500 text-white';
              else if (ua) bg = 'bg-red-500 text-white';
              return (
                <button key={idx} onClick={() => setExamReviewIdx(idx)}
                  className={`w-8 h-8 rounded text-xs font-medium ${bg} hover:opacity-80`}>
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> 正确</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> 错误</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200" /> 未答</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button onClick={loadQuestions} className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium">
            再考一次
          </button>
          <Link href="/ai" className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-center font-medium">
            AI 复盘
          </Link>
          <Link href="/" className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-center font-medium">
            回首页
          </Link>
        </div>
      </div>
    );
  }

  // ==================== 普通模式：练习完成 ====================
  if (!isExamMode && currentIndex >= questions.length) {
    const accuracy = sessionStats.total > 0
      ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <h2 className="text-2xl font-bold mb-4">🎉 本轮练习完成！</h2>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-sm text-slate-500">总题数</p><p className="text-2xl font-bold">{sessionStats.total}</p></div>
            <div><p className="text-sm text-slate-500">正确</p><p className="text-2xl font-bold text-green-600">{sessionStats.correct}</p></div>
            <div><p className="text-sm text-slate-500">正确率</p><p className="text-2xl font-bold text-blue-600">{accuracy}%</p></div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={loadQuestions} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">再来一轮</button>
            <Link href="/ai" className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-center">AI 复盘</Link>
            <Link href="/" className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-center">回首页</Link>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 做题界面 ====================
  const examTimeLeft = isExamMode ? Math.max(0, EXAM_TIME_LIMIT - timer) : 0;
  const examTimeWarning = isExamMode && examTimeLeft < 600; // 最后10分钟

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">
          {modeParam === 'random' ? '📝 随机练习' : isExamMode ? '📋 模拟考试' : '📝 刷题中心'}
        </h1>
        <div className="flex items-center gap-3">
          {isExamMode ? (
            <span className={`text-sm font-mono font-bold ${examTimeWarning ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
              ⏱️ {formatTime(examTimeLeft)}
            </span>
          ) : (
            <span className="text-sm text-slate-500">⏱️ {formatTime(timer)}</span>
          )}
          <span className="text-sm text-slate-500">{currentIndex + 1}/{questions.length}</span>
          {!isExamMode && (
            <span className="text-sm text-green-600">✓{sessionStats.correct}/{sessionStats.total}</span>
          )}
          {isExamMode && (
            <span className="text-sm text-blue-600">已答{Object.keys(examAnswers).length}/{questions.length}</span>
          )}
        </div>
      </div>

      {/* 考试模式进度条 */}
      {isExamMode && (
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>答题进度</span>
            <span>{Math.round(Object.keys(examAnswers).length / questions.length * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(Object.keys(examAnswers).length / questions.length) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <button onClick={() => setShowExamGrid(!showExamGrid)}
              className="text-xs text-blue-600 hover:text-blue-800">
              {showExamGrid ? '收起答题卡' : '📋 答题卡'}
            </button>
            <button onClick={handleSubmitExam}
              className="text-xs px-3 py-1 bg-red-500 text-white rounded-full hover:bg-red-600">
              交卷
            </button>
          </div>

          {/* 答题卡 */}
          {showExamGrid && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="grid grid-cols-10 gap-1.5">
                {questions.map((_, idx) => {
                  const answered = examAnswers[idx] !== undefined;
                  const isCurrent = idx === currentIndex;
                  let bg = 'bg-slate-100 text-slate-400';
                  if (isCurrent) bg = 'bg-blue-600 text-white';
                  else if (answered) bg = 'bg-blue-100 text-blue-700';
                  return (
                    <button key={idx} onClick={() => goToQuestion(idx)}
                      className={`w-7 h-7 rounded text-xs font-medium ${bg} hover:opacity-80`}>
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600" /> 当前</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-100" /> 已答</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100" /> 未答</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Module Filter（非考试模式） */}
      {!modeParam && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedModule('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selectedModule === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            全部
          </button>
          {modules.map(m => (
            <button key={m} onClick={() => setSelectedModule(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${selectedModule === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden transition-all">
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full font-bold tracking-wide shadow-sm">{currentQ.module}</span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full font-medium shadow-sm">{currentQ.subType}</span>
              {!isExamMode && (
                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full shadow-sm flex items-center gap-1">
                  <span className="text-[10px]">难度</span>
                  {'⭐'.repeat(currentQ.difficulty)}
                </span>
              )}
            </div>
            {!isExamMode && (
              <button onClick={handleToggleFavorite}
                className={`text-2xl transition-all hover:scale-125 active:scale-90 ${fav ? 'text-yellow-400 drop-shadow-md animate-bounce' : 'text-slate-300 hover:text-yellow-400'}`}>
                {fav ? '⭐' : '☆'}
              </button>
            )}
          </div>

          <div className="p-6 md:p-8">
            <p className="text-lg text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap font-medium">{currentQ.content}</p>
          </div>

          {/* 选项 */}
          <div className="px-6 pb-8 space-y-3">
            {currentQ.options.map(opt => {
              if (isExamMode) {
                // 考试模式：只显示选中状态，不显示对错
                const isSelected = examAnswers[currentIndex] === opt.key;
                return (
                  <button key={opt.key} onClick={() => handleExamAnswer(opt.key)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 group
                      ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 shadow-md shadow-blue-500/10 scale-[1.01]' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:shadow-sm'}`}>
                    <div className="flex items-start">
                      <span className={`font-bold text-lg mr-4 mt-0.5 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-blue-500'}`}>{opt.key}.</span>
                      <span className="text-base leading-relaxed">{opt.text}</span>
                    </div>
                  </button>
                );
              }

              // 普通模式
              let optClass = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:shadow-sm';
              let icon = null;
              
              if (selectedAnswer) {
                if (opt.key === currentQ.answer) {
                  optClass = 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 shadow-md shadow-green-500/10 scale-[1.01] z-10 relative';
                  icon = <span className="text-green-500 text-xl ml-auto animate-bounce">✓</span>;
                }
                else if (opt.key === selectedAnswer && opt.key !== currentQ.answer) {
                  optClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 shadow-md shadow-red-500/10 scale-[1.01] z-10 relative animate-[shake_0.5s_ease-in-out]';
                  icon = <span className="text-red-500 text-xl ml-auto">✗</span>;
                }
                else {
                  optClass = 'border-slate-200 dark:border-slate-700 opacity-40 scale-95';
                }
              }
              return (
                <button key={opt.key} onClick={() => handleAnswer(opt.key)} disabled={!!selectedAnswer}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-300 flex items-center ${optClass}`}>
                  <div className="flex items-start flex-1">
                    <span className={`font-bold text-lg mr-4 mt-0.5 ${selectedAnswer ? '' : 'text-slate-400'}`}>{opt.key}.</span>
                    <span className="text-base leading-relaxed">{opt.text}</span>
                  </div>
                  {icon}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 考试模式：上下题导航 */}
      {isExamMode && (
        <div className="flex items-center justify-between">
          <button onClick={prevQuestion} disabled={currentIndex <= 0}
            className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-40 text-sm font-medium">
            ← 上一题
          </button>
          <span className="text-sm text-slate-400">{currentIndex + 1} / {questions.length}</span>
          {currentIndex < questions.length - 1 ? (
            <button onClick={nextQuestion}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              下一题 →
            </button>
          ) : (
            <button onClick={handleSubmitExam}
              className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium">
              交卷 ✓
            </button>
          )}
        </div>
      )}

      {/* 普通模式：解析 */}
      {!isExamMode && showExplanation && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-lg ${selectedAnswer === currentQ.answer ? '✅' : '❌'}`}>
              {selectedAnswer === currentQ.answer ? '✅ 正确！' : '❌ 错误'}
            </span>
            <span className="text-sm text-slate-500">
              正确答案：<span className="font-bold text-green-600">{currentQ.answer}</span>
            </span>
          </div>

          {/* XP 浮动提示 */}
          {xpEvents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {xpEvents.map((ev, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${ev.xp > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                  {ev.xp > 0 ? '+' : ''}{ev.xp} XP {ev.label}
                </span>
              ))}
              {gameProfile && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                  {gameProfile.titleIcon} Lv.{gameProfile.level} · {gameProfile.combo > 0 ? `${gameProfile.combo}连击🔥` : ''}
                </span>
              )}
            </div>
          )}

          {/* 智能鼓励 */}
          {encouragementMsg && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-lg p-3 flex items-center gap-3">
              <span className="text-xl">✨</span>
              <p className="text-sm text-amber-800 font-medium">{encouragementMsg}</p>
            </div>
          )}

          {/* 智能提醒 */}
          {activeReminder && (
            <div className={`rounded-lg p-4 flex items-start gap-3 border ${
              activeReminder.priority === 'high' ? 'bg-red-50 border-red-100' :
              activeReminder.priority === 'medium' ? 'bg-orange-50 border-orange-100' :
              'bg-blue-50 border-blue-100'
            }`}>
              <span className="text-2xl">{activeReminder.icon}</span>
              <div className="flex-1">
                <h4 className={`text-sm font-bold mb-1 ${
                  activeReminder.priority === 'high' ? 'text-red-800' :
                  activeReminder.priority === 'medium' ? 'text-orange-800' :
                  'text-blue-800'
                }`}>{activeReminder.title}</h4>
                <p className={`text-xs leading-relaxed ${
                  activeReminder.priority === 'high' ? 'text-red-600' :
                  activeReminder.priority === 'medium' ? 'text-orange-600' :
                  'text-blue-600'
                }`}>{activeReminder.message}</p>
                {activeReminder.action && (
                  <button onClick={() => setActiveReminder(null)} className={`mt-2 text-xs px-3 py-1.5 rounded-full font-medium ${
                    activeReminder.priority === 'high' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                    activeReminder.priority === 'medium' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                    'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}>
                    {activeReminder.action}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-slate-600 mb-2">📖 详细解析</h3>
            <p className="text-sm leading-6 whitespace-pre-wrap">{currentQ.explanation}</p>
          </div>
          {currentQ.relatedKnowledge && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-blue-700 mb-2">🔗 关联知识</h3>
              <p className="text-sm leading-6 text-blue-800">{currentQ.relatedKnowledge}</p>
            </div>
          )}
          <div className="border-t border-slate-100 pt-4">
            <button onClick={() => setShowFeynman(!showFeynman)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              🧑‍🏫 费曼学习法 {showFeynman ? '▲' : '▼'}
            </button>
            {showFeynman && (
              <div className="mt-3">
                <textarea value={feynmanNote} onChange={(e) => setFeynmanNote(e.target.value)}
                  placeholder="试着用最简单的话解释这道题为什么选这个答案..."
                  className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400" />
              </div>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <div className="text-sm text-slate-400">用时 {Math.round((Date.now() - startTime) / 1000)}s</div>
            <button onClick={nextQuestion}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              {currentIndex < questions.length - 1 ? '下一题 →' : '完成'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500">加载中...</div>}>
      <PracticeContent />
    </Suspense>
  );
}
