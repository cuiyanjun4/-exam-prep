'use client';

import { SpeedSession } from '@/types';

const KEYS = {
  SPEED_SESSIONS: 'exam-speed-sessions',
  SPEED_RECORDS: 'exam-speed-records',
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

// ==================== 限时速刷记录 ====================

export function getSpeedSessions(): SpeedSession[] {
  return getItem<SpeedSession[]>(KEYS.SPEED_SESSIONS, []);
}

export function saveSpeedSession(session: SpeedSession): void {
  const sessions = getSpeedSessions();
  
  const sameModeRecords = sessions.filter(
    s => s.mode === session.mode && s.target === session.target
  );
  
  if (sameModeRecords.length > 0) {
    const bestAccuracy = Math.max(...sameModeRecords.map(s => s.correctCount / s.totalQuestions));
    const currentAccuracy = session.correctCount / session.totalQuestions;
    const bestSpeed = Math.min(...sameModeRecords.map(s => s.avgTimePerQuestion));
    session.isPR = currentAccuracy > bestAccuracy || 
      (currentAccuracy >= bestAccuracy && session.avgTimePerQuestion < bestSpeed);
  } else {
    session.isPR = true;
  }
  
  sessions.push(session);
  setItem(KEYS.SPEED_SESSIONS, sessions);
}

export function getBestRecords(): Record<string, SpeedSession> {
  const sessions = getSpeedSessions();
  const best: Record<string, SpeedSession> = {};
  
  for (const s of sessions) {
    const key = `${s.mode}:${s.target}`;
    const current = best[key];
    
    if (!current) {
      best[key] = s;
      continue;
    }
    
    const curRate = (current.correctCount / current.totalQuestions) || 0;
    const newRate = (s.correctCount / s.totalQuestions) || 0;
    
    if (newRate > curRate || (newRate === curRate && s.avgTimePerQuestion < current.avgTimePerQuestion)) {
      best[key] = s;
    }
  }
  
  return best;
}

export function getSpeedTrend(mode: string, target: string, days: number = 14): {
  date: string;
  avgTime: number;
  accuracy: number;
}[] {
  const sessions = getSpeedSessions()
    .filter(s => s.mode === mode && s.target === target)
    .sort((a, b) => a.startTime - b.startTime);
  
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = sessions.filter(s => s.startTime >= cutoff);
  
  return recent.map(s => ({
    date: new Date(s.startTime).toISOString().split('T')[0],
    avgTime: s.avgTimePerQuestion,
    accuracy: s.totalQuestions > 0 ? s.correctCount / s.totalQuestions : 0,
  }));
}

// ==================== 三级速刷体系 ====================

/**
 * 速刷难度等级
 * 基于行测真实考试120分钟130题的时间分配
 */
export type SpeedTier = 1 | 2 | 3;

export interface SpeedTierInfo {
  tier: SpeedTier;
  name: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  /** 与考试级的时间倍率 (tier3 = 1.0) */
  timeMultiplier: number;
}

export const SPEED_TIERS: SpeedTierInfo[] = [
  {
    tier: 1,
    name: '入门训练',
    icon: '🌱',
    label: 'Lv.1',
    description: '2倍考试用时，从容思考，培养计时做题习惯',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    timeMultiplier: 2.0,
  },
  {
    tier: 2,
    name: '进阶冲刺',
    icon: '🔥',
    label: 'Lv.2',
    description: '1.3倍考试用时，强化速度意识，接近实战节奏',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    timeMultiplier: 1.3,
  },
  {
    tier: 3,
    name: '考试实战',
    icon: '⚡',
    label: 'Lv.3',
    description: '真实考试节奏！120分钟完成全部题目的极限速度',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    timeMultiplier: 1.0,
  },
];

/**
 * 各模块「考试级」基准用时（秒/题）
 * 基于行测120分钟标准时间分配方案
 * 常识(20题/10分钟) 言语(40题/35分钟) 数量(15题/15分钟) 判断(40题/35分钟) 资料(20题/25分钟)
 */
export const EXAM_PACE: Record<string, { timePerQ: number; examCount: number; examMinutes: number }> = {
  '常识判断': { timePerQ: 30,  examCount: 20, examMinutes: 10 },
  '言语理解': { timePerQ: 52,  examCount: 40, examMinutes: 35 },
  '数量关系': { timePerQ: 60,  examCount: 15, examMinutes: 15 },
  '判断推理': { timePerQ: 52,  examCount: 40, examMinutes: 35 },
  '资料分析': { timePerQ: 75,  examCount: 20, examMinutes: 25 },
  '政治理论': { timePerQ: 30,  examCount: 20, examMinutes: 10 },
};

/** 三大块的模块映射和基准用时 */
export const BLOCK_EXAM_PACE: Record<string, { avgTimePerQ: number; modules: string[] }> = {
  '文科专项': {
    avgTimePerQ: 38,   // 常识30 + 言语52 + 政治30 加权平均
    modules: ['常识判断', '言语理解', '政治理论'],
  },
  '理科专项': {
    avgTimePerQ: 69,   // 数量60 + 资料75 加权平均
    modules: ['数量关系', '资料分析'],
  },
  '逻辑专项': {
    avgTimePerQ: 52,   // 判断推理
    modules: ['判断推理'],
  },
};

export interface SpeedModePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  mode: SpeedSession['mode'];
  target: string;
  questionCount: number;
  timeLimit: number; // 秒
  targetTimePerQuestion: number; // 目标每题用时（秒）
  tier: SpeedTier;
}

/**
 * 根据难度等级生成单个模块预设
 */
function makeModulePreset(
  module: string,
  tier: SpeedTier,
  questionCount: number,
): SpeedModePreset {
  const tierInfo = SPEED_TIERS[tier - 1];
  const pace = EXAM_PACE[module];
  if (!pace) throw new Error(`Unknown module: ${module}`);

  const targetTime = Math.round(pace.timePerQ * tierInfo.timeMultiplier);
  const timeLimit = targetTime * questionCount;

  const icons: Record<string, string> = {
    '常识判断': '📚', '言语理解': '📝', '数量关系': '🔢',
    '判断推理': '🧩', '资料分析': '📊', '政治理论': '🏛️',
  };

  return {
    id: `speed-${module}-t${tier}`,
    name: module,
    icon: icons[module] || '📋',
    description: `${targetTime}秒/题 · ${tierInfo.name}`,
    mode: 'module',
    target: module,
    questionCount,
    timeLimit,
    targetTimePerQuestion: targetTime,
    tier,
  };
}

/**
 * 根据难度等级生成三大块预设
 */
function makeBlockPreset(
  block: string,
  tier: SpeedTier,
  questionCount: number,
): SpeedModePreset {
  const tierInfo = SPEED_TIERS[tier - 1];
  const blockPace = BLOCK_EXAM_PACE[block];
  if (!blockPace) throw new Error(`Unknown block: ${block}`);

  const targetTime = Math.round(blockPace.avgTimePerQ * tierInfo.timeMultiplier);
  const timeLimit = targetTime * questionCount;

  const icons: Record<string, string> = {
    '文科专项': '📖', '理科专项': '🔬', '逻辑专项': '🧠',
  };

  return {
    id: `speed-${block}-t${tier}`,
    name: block,
    icon: icons[block] || '📋',
    description: `${targetTime}秒/题 · ${tierInfo.name}`,
    mode: 'block',
    target: block,
    questionCount,
    timeLimit,
    targetTimePerQuestion: targetTime,
    tier,
  };
}

/**
 * 获取指定难度等级的所有预设
 */
export function getPresetsForTier(tier: SpeedTier): {
  blocks: SpeedModePreset[];
  modules: SpeedModePreset[];
} {
  // 三大块预设 - 每块20题
  const blocks = [
    makeBlockPreset('文科专项', tier, 20),
    makeBlockPreset('理科专项', tier, 15),
    makeBlockPreset('逻辑专项', tier, 20),
  ];

  // 各模块预设 - 题数按考试比例缩放
  const modules = [
    makeModulePreset('政治理论', tier, 15),
    makeModulePreset('常识判断', tier, 15),
    makeModulePreset('言语理解', tier, 15),
    makeModulePreset('数量关系', tier, 10),
    makeModulePreset('判断推理', tier, 15),
    makeModulePreset('资料分析', tier, 10),
  ];

  return { blocks, modules };
}

// 兼容旧代码: 导出所有预设的平铺列表（考试级）
export const SPEED_PRESETS: SpeedModePreset[] = (() => {
  const all: SpeedModePreset[] = [];
  for (const tier of [1, 2, 3] as SpeedTier[]) {
    const { blocks, modules } = getPresetsForTier(tier);
    all.push(...blocks, ...modules);
  }
  return all;
})();

/**
 * 计算速度评级
 */
export function getSpeedRating(avgTime: number, targetTime: number): {
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
  label: string;
  color: string;
} {
  const ratio = avgTime / targetTime;
  
  if (ratio <= 0.7) return { rating: 'S', label: '神速', color: 'text-yellow-500' };
  if (ratio <= 0.9) return { rating: 'A', label: '优秀', color: 'text-green-500' };
  if (ratio <= 1.1) return { rating: 'B', label: '达标', color: 'text-blue-500' };
  if (ratio <= 1.3) return { rating: 'C', label: '偏慢', color: 'text-orange-500' };
  return { rating: 'D', label: '需提速', color: 'text-red-500' };
}
