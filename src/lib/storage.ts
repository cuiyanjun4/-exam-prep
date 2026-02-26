'use client';

import { AnswerRecord, ReviewCard, DailyStats, UserProgress, AppSettings, CornellNote, Module } from '@/types';

const KEYS = {
  RECORDS: 'exam-records',
  REVIEWS: 'exam-reviews',
  DAILY_STATS: 'exam-daily-stats',
  PROGRESS: 'exam-progress',
  SETTINGS: 'exam-settings',
  FAVORITES: 'exam-favorites',
  CORNELL_NOTES: 'exam-cornell-notes',
};

// ==================== 通用读写 ====================

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ==================== 做题记录 ====================

export function getRecords(): AnswerRecord[] {
  return getItem<AnswerRecord[]>(KEYS.RECORDS, []);
}

export function addRecord(record: AnswerRecord): void {
  const records = getRecords();
  records.push(record);
  setItem(KEYS.RECORDS, records);
  updateDailyStats(record);
  updateProgress(record);
}

export function getRecordsByQuestion(questionId: string): AnswerRecord[] {
  return getRecords().filter(r => r.questionId === questionId);
}

export function getMistakeQuestionIds(): string[] {
  const records = getRecords();
  const mistakes = new Set<string>();
  const corrected = new Set<string>();
  
  // 按时间排序，最新的在前
  const sorted = [...records].sort((a, b) => b.timestamp - a.timestamp);
  
  for (const r of sorted) {
    if (!corrected.has(r.questionId)) {
      if (!r.isCorrect) {
        mistakes.add(r.questionId);
      } else {
        corrected.add(r.questionId);
      }
    }
  }
  
  return Array.from(mistakes);
}

// ==================== 间隔重复 ====================

export function getReviewCards(): ReviewCard[] {
  return getItem<ReviewCard[]>(KEYS.REVIEWS, []);
}

export function setReviewCards(cards: ReviewCard[]): void {
  setItem(KEYS.REVIEWS, cards);
}

export function getCardsForReview(): ReviewCard[] {
  const today = new Date().toISOString().split('T')[0];
  return getReviewCards().filter(c => c.nextReview <= today);
}

export function upsertReviewCard(card: ReviewCard): void {
  const cards = getReviewCards();
  const idx = cards.findIndex(c => c.questionId === card.questionId);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  setReviewCards(cards);
}

// ==================== 收藏 ====================

export function getFavorites(): string[] {
  return getItem<string[]>(KEYS.FAVORITES, []);
}

// ==================== 自定义题目 ====================

export function getCustomQuestions(): any[] {
  return getItem<any[]>('exam-custom-questions', []);
}

export function saveCustomQuestions(questions: any[]): void {
  const existing = getCustomQuestions();
  setItem('exam-custom-questions', [...existing, ...questions]);
}

export function toggleFavorite(questionId: string): boolean {
  const favs = getFavorites();
  const idx = favs.indexOf(questionId);
  if (idx >= 0) {
    favs.splice(idx, 1);
    setItem(KEYS.FAVORITES, favs);
    return false;
  } else {
    favs.push(questionId);
    setItem(KEYS.FAVORITES, favs);
    return true;
  }
}

export function isFavorite(questionId: string): boolean {
  return getFavorites().includes(questionId);
}

// ==================== 每日统计 ====================

export function getDailyStats(): Record<string, DailyStats> {
  return getItem<Record<string, DailyStats>>(KEYS.DAILY_STATS, {});
}

function updateDailyStats(record: AnswerRecord): void {
  const stats = getDailyStats();
  const today = new Date().toISOString().split('T')[0];
  
  if (!stats[today]) {
    stats[today] = {
      date: today,
      totalQuestions: 0,
      correctCount: 0,
      totalTime: 0,
      moduleStats: {
        '政治理论': { total: 0, correct: 0 },
        '常识判断': { total: 0, correct: 0 },
        '言语理解': { total: 0, correct: 0 },
        '数量关系': { total: 0, correct: 0 },
        '判断推理': { total: 0, correct: 0 },
        '资料分析': { total: 0, correct: 0 },
      },
    };
  }
  
  const day = stats[today];
  day.totalQuestions++;
  if (record.isCorrect) day.correctCount++;
  day.totalTime += record.timeSpent;
  day.moduleStats[record.module].total++;
  if (record.isCorrect) day.moduleStats[record.module].correct++;
  
  setItem(KEYS.DAILY_STATS, stats);
}

// ==================== 用户进度 ====================

export function getProgress(): UserProgress {
  const modules: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
  const defaultProgress: UserProgress = {
    totalAnswered: 0,
    totalCorrect: 0,
    streak: 0,
    lastActiveDate: '',
    moduleProgress: {} as UserProgress['moduleProgress'],
  };
  
  for (const m of modules) {
    defaultProgress.moduleProgress[m] = { answered: 0, correct: 0, avgTime: 0 };
  }
  
  return getItem<UserProgress>(KEYS.PROGRESS, defaultProgress);
}

function updateProgress(record: AnswerRecord): void {
  const progress = getProgress();
  const today = new Date().toISOString().split('T')[0];
  
  progress.totalAnswered++;
  if (record.isCorrect) progress.totalCorrect++;
  
  // 更新连续打卡
  if (progress.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (progress.lastActiveDate === yesterdayStr) {
      progress.streak++;
    } else if (progress.lastActiveDate !== today) {
      progress.streak = 1;
    }
    progress.lastActiveDate = today;
  }
  
  // 更新模块进度
  const mp = progress.moduleProgress[record.module];
  mp.answered++;
  if (record.isCorrect) mp.correct++;
  mp.avgTime = (mp.avgTime * (mp.answered - 1) + record.timeSpent) / mp.answered;
  
  setItem(KEYS.PROGRESS, progress);
}

// ==================== 设置 ====================

export const defaultSettings: AppSettings = {
  theme: 'light',
  questionsPerSession: 20,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  aiConfig: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
  },
  showTimer: true,
  autoNextQuestion: false,
  speedMode: {
    defaultTimePerQuestion: 60,
    showCountdown: true,
    soundAlert: true,
  },
  flowGuide: {
    enabled: true,
    warmupMinutes: 5,
    focusMinutes: 20,
    breakMinutes: 5,
  },
};

export function getSettings(): AppSettings {
  return getItem<AppSettings>(KEYS.SETTINGS, defaultSettings);
}

export function setSettings(settings: AppSettings): void {
  setItem(KEYS.SETTINGS, settings);
}

// ==================== 康奈尔笔记 ====================

export function getCornellNotes(): CornellNote[] {
  return getItem<CornellNote[]>(KEYS.CORNELL_NOTES, []);
}

export function addCornellNote(note: CornellNote): void {
  const notes = getCornellNotes();
  notes.push(note);
  setItem(KEYS.CORNELL_NOTES, notes);
}

export function updateCornellNote(note: CornellNote): void {
  const notes = getCornellNotes();
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
    setItem(KEYS.CORNELL_NOTES, notes);
  }
}

export function deleteCornellNote(id: string): void {
  const notes = getCornellNotes().filter(n => n.id !== id);
  setItem(KEYS.CORNELL_NOTES, notes);
}

// ==================== 数据导出/导入 ====================

export function exportAllData(): string {
  const data = {
    records: getRecords(),
    reviews: getReviewCards(),
    dailyStats: getDailyStats(),
    progress: getProgress(),
    favorites: getFavorites(),
    cornellNotes: getCornellNotes(),
    settings: getSettings(),
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.records) setItem(KEYS.RECORDS, data.records);
    if (data.reviews) setItem(KEYS.REVIEWS, data.reviews);
    if (data.dailyStats) setItem(KEYS.DAILY_STATS, data.dailyStats);
    if (data.progress) setItem(KEYS.PROGRESS, data.progress);
    if (data.favorites) setItem(KEYS.FAVORITES, data.favorites);
    if (data.cornellNotes) setItem(KEYS.CORNELL_NOTES, data.cornellNotes);
    if (data.settings) setItem(KEYS.SETTINGS, data.settings);
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
