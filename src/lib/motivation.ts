'use client';

// ==================== 励志宣言 & 智能提醒系统 ====================

const KEYS = {
  MOTIVATION_STATE: 'exam-motivation-state',
  STUDY_SESSION: 'exam-study-session',
};

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

// ==================== 励志名言库 ====================

export const MOTIVATIONAL_QUOTES = [
  // 经典励志
  { text: '千里之行，始于足下。', author: '老子', category: 'classic' },
  { text: '不积跬步，无以至千里；不积小流，无以成江海。', author: '荀子', category: 'classic' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来。', author: '古训', category: 'classic' },
  { text: '书山有路勤为径，学海无涯苦作舟。', author: '韩愈', category: 'classic' },
  { text: '吃得苦中苦，方为人上人。', author: '古训', category: 'classic' },
  { text: '有志者事竟成，破釜沉舟，百二秦关终属楚。', author: '蒲松龄', category: 'classic' },
  { text: '苦心人天不负，卧薪尝胆，三千越甲可吞吴。', author: '蒲松龄', category: 'classic' },
  { text: '天将降大任于斯人也，必先苦其心志，劳其筋骨。', author: '孟子', category: 'classic' },

  // 考公专属
  { text: '今天多刷一道题，明天离上岸就近一步。', author: '考公人', category: 'exam' },
  { text: '行测不是天赋，是积累；申论不是运气，是训练。', author: '上岸前辈', category: 'exam' },
  { text: '别人在刷短视频的时候，你在刷题，这就是差距。', author: '考公人', category: 'exam' },
  { text: '上岸的人不一定最聪明，但一定是最坚持的。', author: '考公真理', category: 'exam' },
  { text: '每天进步一点点，考试那天就是质变的时刻。', author: '学习格言', category: 'exam' },
  { text: '现在流的汗，都是你将来不流的泪。', author: '考公人', category: 'exam' },
  { text: '你所浪费的今天，是昨天落榜者奢望的明天。', author: '考公哲学', category: 'exam' },
  { text: '刷题千遍，其义自见。量变终会引发质变。', author: '刷题之道', category: 'exam' },
  { text: '考公不是独木桥，是你通向稳定人生的高速公路。', author: '过来人', category: 'exam' },
  { text: '别怕错，每一道错题都是在给你指路。', author: '学习心理学', category: 'exam' },

  // 激励坚持
  { text: '坚持不是因为容易，而是因为值得。', author: '激励格言', category: 'persist' },
  { text: '成功的路上并不拥挤，因为坚持的人不多。', author: '人生哲理', category: 'persist' },
  { text: '当你想放弃的时候，想想当初为什么开始。', author: '心灵鸡汤', category: 'persist' },
  { text: '没有白走的路，每一步都算数。', author: '人生信条', category: 'persist' },
  { text: '你的对手在看书，你的闺蜜在刷题，你怎么好意思休息？', author: '考公社', category: 'persist' },
  { text: '今天的努力，是为了明天有更好的选择。', author: '人生哲学', category: 'persist' },

  // 轻松幽默
  { text: '题目虐我千百遍，我待题目如初恋。', author: '考公段子', category: 'humor' },
  { text: '做题做到头秃，但上岸后头发会长回来的！', author: '考公玩笑', category: 'humor' },
  { text: '不怕题难，就怕你不做。做了就有机会，不做连机会都没有。', author: '真理', category: 'humor' },
  { text: '考公人的快乐：选对答案的那一刻。', author: '小确幸', category: 'humor' },
];

// ==================== 鼓励话术（答题后动态） ====================

export const ENCOURAGEMENTS = {
  correct: [
    '太棒了！又答对一题 🎉',
    '正确！你的实力在稳步提升 💪',
    '完美！继续保持这个状态 ⭐',
    '答对了！积少成多，上岸指日可待 🚀',
    '厉害！这题不简单呢 👏',
    'Nice！你离目标又近了一步 🎯',
    '秒杀！这个知识点你已经掌握了 ✅',
    '正确率在提升，继续加油 📈',
  ],
  wrong: [
    '别灰心，这道题帮你发现了一个知识盲点 📝',
    '错了也没关系，记住解析下次就不会错了 💡',
    '失败是成功之母，加油 💪',
    '这道题有点难度，多看看解析 📖',
    '没关系，错题是最好的老师 🎓',
    '别气馁！就连学霸也会做错题 😊',
    '错了一道不要紧，关键是从中学到东西 🌱',
  ],
  combo: [
    '连击！你进入了心流状态 🔥',
    '连击加成！手感太好了 ⚡',
    '势如破竹！保持专注 🏆',
    '连续正确！你就是行测之王 👑',
  ],
  milestone: [
    '里程碑！今天已经做了 {count} 题，给自己鼓个掌 👏',
    '今日 {count} 题达成！你是最努力的考公人 🌟',
    '刷题 {count} 道，你的努力不会被辜负 💎',
  ],
};

// ==================== 智能提醒系统 ====================

export interface StudySession {
  startTime: number;          // 本次学习开始时间
  lastActivityTime: number;   // 最后活动时间
  questionsThisSession: number; // 本场次答题数
  totalStudyMinutes: number;  // 今日累计学习分钟
  lastRestReminder: number;   // 上次休息提醒时间
  lastMealReminder: number;   // 上次饮食提醒时间
  lastMotivation: number;     // 上次励志推送时间
}

function getDefaultSession(): StudySession {
  const now = Date.now();
  return {
    startTime: now,
    lastActivityTime: now,
    questionsThisSession: 0,
    totalStudyMinutes: 0,
    lastRestReminder: now,
    lastMealReminder: 0,
    lastMotivation: now,
  };
}

export function getStudySession(): StudySession {
  return getItem<StudySession>(KEYS.STUDY_SESSION, getDefaultSession());
}

export function saveStudySession(session: StudySession): void {
  setItem(KEYS.STUDY_SESSION, session);
}

export function startStudySession(): StudySession {
  const session = getDefaultSession();
  saveStudySession(session);
  return session;
}

export function recordStudyActivity(session: StudySession): StudySession {
  session.lastActivityTime = Date.now();
  session.questionsThisSession++;
  saveStudySession(session);
  return session;
}

// ==================== 提醒类型 ====================

export interface Reminder {
  id: string;
  type: 'rest' | 'meal' | 'motivation' | 'milestone' | 'encouragement' | 'comeback';
  icon: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: string; // 按钮文字
}

/**
 * 检查当前是否到了吃饭时间
 */
function getMealTimeReminder(): Reminder | null {
  const hour = new Date().getHours();
  const minute = new Date().getMinutes();
  const session = getStudySession();
  const now = Date.now();

  // 已经在30分钟内提醒过了
  if (now - session.lastMealReminder < 30 * 60 * 1000) return null;

  // 午饭 11:30-12:30
  if (hour === 11 && minute >= 30 || hour === 12 && minute <= 30) {
    session.lastMealReminder = now;
    saveStudySession(session);
    return {
      id: 'meal-lunch',
      type: 'meal',
      icon: '🍚',
      title: '午饭时间到！',
      message: '大脑需要能量补充，先去吃午饭吧～吃饱了才有力气刷题！',
      priority: 'high',
      action: '好的，去吃饭',
    };
  }

  // 晚饭 17:30-18:30
  if (hour === 17 && minute >= 30 || hour === 18 && minute <= 30) {
    session.lastMealReminder = now;
    saveStudySession(session);
    return {
      id: 'meal-dinner',
      type: 'meal',
      icon: '🍜',
      title: '晚饭时间到！',
      message: '不要饿着肚子学习哦，营养均衡才能高效备考～',
      priority: 'high',
      action: '去吃晚饭',
    };
  }

  return null;
}

/**
 * 检查是否需要休息提醒
 */
function getRestReminder(session: StudySession): Reminder | null {
  const now = Date.now();
  const studyDuration = (now - session.startTime) / (60 * 1000); // 分钟

  // 45分钟提醒一次
  if (now - session.lastRestReminder < 45 * 60 * 1000) return null;

  if (studyDuration >= 45) {
    session.lastRestReminder = now;
    saveStudySession(session);

    if (studyDuration >= 120) {
      return {
        id: 'rest-long',
        type: 'rest',
        icon: '😴',
        title: '该休息啦！',
        message: `你已经连续学习 ${Math.floor(studyDuration)} 分钟了！长时间学习效率会下降，起来走走、喝杯水、做做眼保健操吧～`,
        priority: 'high',
        action: '休息10分钟',
      };
    }

    return {
      id: 'rest-short',
      type: 'rest',
      icon: '☕',
      title: '休息一下吧',
      message: `已经学习了 ${Math.floor(studyDuration)} 分钟，适当休息能让效率更高哦！站起来活动一下吧～`,
      priority: 'medium',
      action: '休息5分钟',
    };
  }

  return null;
}

/**
 * 获取深夜学习提醒
 */
function getLateNightReminder(): Reminder | null {
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 6) {
    return {
      id: 'late-night',
      type: 'rest',
      icon: '🌙',
      title: '夜深了，该休息了',
      message: '熬夜学习效率很低，而且伤身体。早点睡，明天精神满满地继续刷题！充足的睡眠是高效备考的基础。',
      priority: 'high',
      action: '好的，去睡觉',
    };
  }
  return null;
}

/**
 * 获取随机励志名言
 */
export function getRandomQuote(): typeof MOTIVATIONAL_QUOTES[0] {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

/**
 * 获取答题鼓励
 */
export function getEncouragement(isCorrect: boolean, combo: number, todayCount: number): string {
  // 里程碑鼓励
  if (todayCount > 0 && todayCount % 25 === 0) {
    const milestones = ENCOURAGEMENTS.milestone;
    return milestones[Math.floor(Math.random() * milestones.length)].replace('{count}', String(todayCount));
  }

  // 连击鼓励
  if (isCorrect && combo > 0 && combo % 5 === 0) {
    const combos = ENCOURAGEMENTS.combo;
    return combos[Math.floor(Math.random() * combos.length)];
  }

  const pool = isCorrect ? ENCOURAGEMENTS.correct : ENCOURAGEMENTS.wrong;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 综合检查所有提醒（每次答题后调用）
 */
export function checkReminders(): Reminder[] {
  const session = getStudySession();
  const reminders: Reminder[] = [];

  // 检查各种提醒
  const meal = getMealTimeReminder();
  if (meal) reminders.push(meal);

  const rest = getRestReminder(session);
  if (rest) reminders.push(rest);

  const lateNight = getLateNightReminder();
  if (lateNight) reminders.push(lateNight);

  return reminders;
}

// ==================== 渐进难度系统 ====================

export interface DifficultyState {
  currentDifficulty: number;     // 1-3 (简单/中等/困难)
  consecutiveCorrect: number;    // 连续答对
  consecutiveWrong: number;      // 连续答错
  difficultyHistory: number[];   // 最近20题难度
  correctRateRecent: number;     // 最近20题正确率
}

function getDefaultDifficultyState(): DifficultyState {
  return {
    currentDifficulty: 1,  // 从简单开始
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    difficultyHistory: [],
    correctRateRecent: 0,
  };
}

const DIFFICULTY_KEY = 'exam-difficulty-state';

export function getDifficultyState(): DifficultyState {
  return getItem<DifficultyState>(DIFFICULTY_KEY, getDefaultDifficultyState());
}

/**
 * 渐进难度算法：
 * - 连续答对5题简单 → 升到中等
 * - 连续答对5题中等 → 升到困难
 * - 连续答错3题 → 降一级
 * - 最近20题正确率 > 80% → 可升级
 * - 最近20题正确率 < 40% → 应降级
 * - 变化平缓，不大起大落
 */
export function updateDifficulty(isCorrect: boolean): DifficultyState {
  const state = getDifficultyState();

  if (isCorrect) {
    state.consecutiveCorrect++;
    state.consecutiveWrong = 0;
  } else {
    state.consecutiveWrong++;
    state.consecutiveCorrect = 0;
  }

  // 更新历史记录
  state.difficultyHistory.push(isCorrect ? 1 : 0);
  if (state.difficultyHistory.length > 20) {
    state.difficultyHistory = state.difficultyHistory.slice(-20);
  }

  // 计算最近正确率
  if (state.difficultyHistory.length >= 5) {
    const recent = state.difficultyHistory.slice(-20);
    state.correctRateRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  // 升级条件（温和）
  if (state.currentDifficulty < 3) {
    if (state.consecutiveCorrect >= 5 && state.correctRateRecent >= 0.75) {
      state.currentDifficulty = Math.min(3, state.currentDifficulty + 1) as 1 | 2 | 3;
      state.consecutiveCorrect = 0;
    }
  }

  // 降级条件（保护自尊心，快速降级）
  if (state.currentDifficulty > 1) {
    if (state.consecutiveWrong >= 3 || state.correctRateRecent < 0.35) {
      state.currentDifficulty = Math.max(1, state.currentDifficulty - 1) as 1 | 2 | 3;
      state.consecutiveWrong = 0;
    }
  }

  setItem(DIFFICULTY_KEY, state);
  return state;
}

export function resetDifficultyState(): void {
  setItem(DIFFICULTY_KEY, getDefaultDifficultyState());
}
