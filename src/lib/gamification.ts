'use client';

// ==================== 积分 & 称号系统 ====================

const KEYS = {
  GAME_PROFILE: 'exam-game-profile',
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

// ==================== 类型定义 ====================

export interface GameProfile {
  xp: number;
  level: number;
  title: string;
  titleIcon: string;
  combo: number;            // 当前连击
  maxCombo: number;         // 最高连击
  todayXP: number;          // 今日获得XP
  todayDate: string;        // 用于重置每日XP
  totalCorrect: number;     // 总答对数（用于成就）
  totalQuestions: number;    // 总做题数
  achievements: string[];   // 已解锁成就ID
  weeklyXP: number[];       // 最近7天XP（[0]=今天）
}

export interface Title {
  id: string;
  name: string;
  icon: string;
  minLevel: number;
  description: string;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: (p: GameProfile) => boolean;
  xpReward: number;
}

export interface XPEvent {
  type: 'answer_correct' | 'answer_wrong' | 'combo_bonus' | 'streak_bonus' | 'speed_bonus' | 'achievement' | 'daily_first';
  xp: number;
  label: string;
}

// ==================== 称号体系 ====================

export const TITLES: Title[] = [
  { id: 'rookie',      name: '备考萌新',   icon: '🌱', minLevel: 1,  description: '才踏上考公之路' },
  { id: 'student',     name: '勤学学子',   icon: '📖', minLevel: 3,  description: '初窥门径' },
  { id: 'scholar',     name: '行测新秀',   icon: '✏️', minLevel: 5,  description: '小有成绩' },
  { id: 'fighter',     name: '刷题战士',   icon: '⚔️', minLevel: 8,  description: '身经百战' },
  { id: 'expert',      name: '行测达人',   icon: '🌟', minLevel: 12, description: '融会贯通' },
  { id: 'master',      name: '考公高手',   icon: '👑', minLevel: 18, description: '出类拔萃' },
  { id: 'grandmaster', name: '行测宗师',   icon: '🏆', minLevel: 25, description: '登峰造极' },
  { id: 'legend',      name: '上岸传奇',   icon: '🐉', minLevel: 35, description: '万中无一' },
];

// ==================== 成就系统 ====================

export const ACHIEVEMENTS: Achievement[] = [
  // 做题量成就
  { id: 'first_question', name: '初出茅庐', icon: '🎯', description: '完成第1道题目', condition: p => p.totalQuestions >= 1, xpReward: 10 },
  { id: 'fifty_questions', name: '半百起步', icon: '📝', description: '累计完成50题', condition: p => p.totalQuestions >= 50, xpReward: 50 },
  { id: 'hundred_club', name: '百题俱乐部', icon: '💯', description: '累计完成100题', condition: p => p.totalQuestions >= 100, xpReward: 100 },
  { id: 'five_hundred', name: '五百里路', icon: '🛤️', description: '累计完成500题', condition: p => p.totalQuestions >= 500, xpReward: 200 },
  { id: 'thousand_warrior', name: '千题勇士', icon: '⚔️', description: '累计完成1000题', condition: p => p.totalQuestions >= 1000, xpReward: 500 },

  // 正确率成就
  { id: 'ten_streak', name: '十连正确', icon: '🔥', description: '达成10连击', condition: p => p.maxCombo >= 10, xpReward: 30 },
  { id: 'twenty_streak', name: '二十连正确', icon: '🔥', description: '达成20连击', condition: p => p.maxCombo >= 20, xpReward: 80 },
  { id: 'fifty_streak', name: '五十连正确', icon: '💥', description: '达成50连击', condition: p => p.maxCombo >= 50, xpReward: 200 },

  // 每日挑战
  { id: 'daily_grind', name: '日练百题', icon: '💪', description: '单日做满100题', condition: p => p.todayXP >= 400, xpReward: 100 },
];

// ==================== 经验值计算 ====================

/** XP升级所需经验（等级越高越多） */
export function xpForLevel(level: number): number {
  // Level 1→2: 100XP, Level 2→3: 180XP, ...递增
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

/** 当前等级总计XP上限 */
export function totalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/** 获取等级进度 0~1 */
export function getLevelProgress(profile: GameProfile): number {
  const currentLevelXP = totalXPForLevel(profile.level);
  const nextLevelXP = xpForLevel(profile.level);
  const progress = (profile.xp - currentLevelXP) / nextLevelXP;
  return Math.min(Math.max(progress, 0), 1);
}

// ==================== 核心逻辑 ====================

function getDefaultProfile(): GameProfile {
  const today = new Date().toISOString().split('T')[0];
  return {
    xp: 0,
    level: 1,
    title: '备考萌新',
    titleIcon: '🌱',
    combo: 0,
    maxCombo: 0,
    todayXP: 0,
    todayDate: today,
    totalCorrect: 0,
    totalQuestions: 0,
    achievements: [],
    weeklyXP: [0, 0, 0, 0, 0, 0, 0],
  };
}

export function getGameProfile(): GameProfile {
  const profile = getItem<GameProfile>(KEYS.GAME_PROFILE, getDefaultProfile());
  // 每日重置检查
  const today = new Date().toISOString().split('T')[0];
  if (profile.todayDate !== today) {
    // 轮转 weeklyXP
    profile.weeklyXP = [0, ...profile.weeklyXP.slice(0, 6)];
    profile.todayXP = 0;
    profile.todayDate = today;
    setItem(KEYS.GAME_PROFILE, profile);
  }
  return profile;
}

function saveProfile(profile: GameProfile): void {
  setItem(KEYS.GAME_PROFILE, profile);
}

/** 更新等级和称号 */
function refreshLevelAndTitle(profile: GameProfile): void {
  // 计算等级
  let level = 1;
  while (profile.xp >= totalXPForLevel(level + 1)) {
    level++;
    if (level >= 50) break; // 安全上限
  }
  profile.level = level;

  // 更新称号
  const eligible = TITLES.filter(t => t.minLevel <= level);
  if (eligible.length > 0) {
    const best = eligible[eligible.length - 1];
    profile.title = best.name;
    profile.titleIcon = best.icon;
  }
}

/** 检查并解锁成就，返回新解锁的成就列表 */
function checkAchievements(profile: GameProfile): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!profile.achievements.includes(ach.id) && ach.condition(profile)) {
      profile.achievements.push(ach.id);
      profile.xp += ach.xpReward;
      profile.todayXP += ach.xpReward;
      profile.weeklyXP[0] += ach.xpReward;
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

/**
 * 主入口：答题后调用，返回本次获得的XP明细和解锁的成就
 */
export function recordAnswer(isCorrect: boolean, timeSpent: number, targetTime?: number): {
  events: XPEvent[];
  newAchievements: Achievement[];
  profile: GameProfile;
  leveledUp: boolean;
} {
  const profile = getGameProfile();
  const events: XPEvent[] = [];
  const oldLevel = profile.level;

  profile.totalQuestions++;

  // 每日首题奖励
  if (profile.todayXP === 0) {
    const dailyBonus = 5;
    profile.xp += dailyBonus;
    profile.todayXP += dailyBonus;
    profile.weeklyXP[0] += dailyBonus;
    events.push({ type: 'daily_first', xp: dailyBonus, label: '每日首题' });
  }

  if (isCorrect) {
    profile.totalCorrect++;
    profile.combo++;
    if (profile.combo > profile.maxCombo) {
      profile.maxCombo = profile.combo;
    }

    // 基础XP
    let baseXP = 4;
    events.push({ type: 'answer_correct', xp: baseXP, label: '答对' });
    profile.xp += baseXP;
    profile.todayXP += baseXP;
    profile.weeklyXP[0] += baseXP;

    // 连击奖励 (每5连为一组)
    if (profile.combo > 0 && profile.combo % 5 === 0) {
      const comboBonus = Math.min(Math.floor(profile.combo / 5) * 3, 30);
      events.push({ type: 'combo_bonus', xp: comboBonus, label: `${profile.combo}连击` });
      profile.xp += comboBonus;
      profile.todayXP += comboBonus;
      profile.weeklyXP[0] += comboBonus;
    }

    // 速度奖励（用时 < 目标时间的70%）
    if (targetTime && timeSpent < targetTime * 0.7) {
      const speedBonus = 2;
      events.push({ type: 'speed_bonus', xp: speedBonus, label: '极速作答' });
      profile.xp += speedBonus;
      profile.todayXP += speedBonus;
      profile.weeklyXP[0] += speedBonus;
    }
  } else {
    // 答错
    profile.combo = 0;
    const penalty = 1;
    events.push({ type: 'answer_wrong', xp: -penalty, label: '答错' });
    profile.xp = Math.max(0, profile.xp - penalty);
    // 不减todayXP，只减总XP
  }

  // 成就检查
  const newAchievements = checkAchievements(profile);
  for (const ach of newAchievements) {
    events.push({ type: 'achievement', xp: ach.xpReward, label: `成就: ${ach.name}` });
  }

  refreshLevelAndTitle(profile);
  saveProfile(profile);

  return {
    events,
    newAchievements,
    profile,
    leveledUp: profile.level > oldLevel,
  };
}

/**
 * 连续打卡奖励 (由 storage.ts updateProgress 的 streak 触发)
 */
export function applyStreakBonus(streakDays: number): XPEvent | null {
  if (streakDays < 2) return null;

  const profile = getGameProfile();
  const bonus = Math.min(streakDays * 2, 20); // 最高20XP
  profile.xp += bonus;
  profile.todayXP += bonus;
  profile.weeklyXP[0] += bonus;
  refreshLevelAndTitle(profile);
  saveProfile(profile);

  return { type: 'streak_bonus', xp: bonus, label: `连续打卡${streakDays}天` };
}

/** 获取排行榜数据（本地单人，预留多人接口） */
export function getLeaderboard(): { rank: number; name: string; xp: number; level: number; title: string; titleIcon: string }[] {
  const profile = getGameProfile();
  return [
    { rank: 1, name: '我', xp: profile.xp, level: profile.level, title: profile.title, titleIcon: profile.titleIcon },
  ];
}

/** 重置游戏档案 */
export function resetGameProfile(): void {
  saveProfile(getDefaultProfile());
}
