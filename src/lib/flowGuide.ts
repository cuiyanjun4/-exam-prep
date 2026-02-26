import { FlowGuide } from '@/types';

/**
 * 心流引导系统
 * 基于 Csikszentmihalyi 心流理论设计
 * 原理：挑战与技能相匹配时产生心流体验
 * 
 * 四个阶段循环：
 * 1. 热身（Warmup）- 简单题快速进入状态
 * 2. 专注（Focus）- 中等难度保持心流
 * 3. 挑战（Challenge）- 稍微超出舒适区
 * 4. 回顾（Review）- 错题消化巩固
 */

export const FLOW_PHASES: FlowGuide[] = [
  {
    phase: 'warmup',
    phaseName: '🌅 热身启动',
    description: '从简单题开始，快速进入做题状态。目标：正确率90%+，建立信心。',
    duration: 5,
    tips: [
      '选择你最擅长的模块',
      '每题控制在30秒内',
      '不要纠结，快速作答',
      '正确率>90%说明状态已到位',
    ],
    method: '刻意练习',
  },
  {
    phase: 'focus',
    phaseName: '🎯 深度专注',
    description: '进入核心练习，中等难度题目保持高效率。这是你提分的黄金时间。',
    duration: 20,
    tips: [
      '关闭通知，排除干扰',
      '使用番茄钟保持专注',
      '遇到不会的题标记跳过',
      '保持匀速节奏，不要太快或太慢',
      '用费曼学习法自己讲解每道题',
    ],
    method: '费曼学习法',
  },
  {
    phase: 'challenge',
    phaseName: '💪 挑战突破',
    description: '挑战薄弱模块和高难度题目，突破舒适区。允许犯错，重在学习。',
    duration: 15,
    tips: [
      '专攻你的薄弱题型',
      '允许正确率降低到60%',
      '错了认真看解析',
      '记录你的费曼笔记',
      '尝试不同解题方法',
    ],
    method: '间隔交叉学习',
  },
  {
    phase: 'review',
    phaseName: '📝 复盘消化',
    description: '回顾本次错题，用学习方法深度理解。这个阶段决定你能记住多少。',
    duration: 10,
    tips: [
      '每道错题写出你理解的解题过程',
      '对比正确答案找差距',
      '用康奈尔笔记法总结知识点',
      '用 SQ3R 方法精读解析',
      '为同类题总结通用解法',
    ],
    method: '康奈尔笔记法',
  },
];

/**
 * 根据当前做题数据推荐合适的心流阶段
 */
export function recommendPhase(
  recentAccuracy: number,
  minutesSinceStart: number,
  questionsAnswered: number
): FlowGuide {
  // 刚开始 → 热身
  if (questionsAnswered < 3 || minutesSinceStart < 3) {
    return FLOW_PHASES[0];
  }

  // 热身完成（正确率高）→ 深度专注
  if (recentAccuracy >= 0.85 && minutesSinceStart < 25) {
    return FLOW_PHASES[1];
  }

  // 专注了一段时间 → 挑战突破
  if (minutesSinceStart >= 20 && minutesSinceStart < 40) {
    return FLOW_PHASES[2];
  }

  // 做了很多题或时间较长 → 复盘消化
  if (questionsAnswered >= 15 || minutesSinceStart >= 35) {
    return FLOW_PHASES[3];
  }

  // 正确率较低 → 回到热身重建信心
  if (recentAccuracy < 0.5) {
    return FLOW_PHASES[0];
  }

  return FLOW_PHASES[1]; // 默认专注阶段
}

/**
 * 根据心流阶段推荐题目难度
 */
export function getRecommendedDifficulty(phase: FlowGuide['phase']): {
  minDifficulty: 1 | 2 | 3;
  maxDifficulty: 1 | 2 | 3;
  description: string;
} {
  switch (phase) {
    case 'warmup':
      return { minDifficulty: 1, maxDifficulty: 1, description: '简单题热身' };
    case 'focus':
      return { minDifficulty: 1, maxDifficulty: 2, description: '中等难度保持节奏' };
    case 'challenge':
      return { minDifficulty: 2, maxDifficulty: 3, description: '困难题突破' };
    case 'review':
      return { minDifficulty: 1, maxDifficulty: 3, description: '错题回顾不限难度' };
    default:
      return { minDifficulty: 1, maxDifficulty: 2, description: '默认中等' };
  }
}

/**
 * 生成每日心流计划
 */
export function generateDailyFlowPlan(availableMinutes: number): {
  phases: (FlowGuide & { adjustedDuration: number })[];
  totalTime: number;
} {
  const totalOriginal = FLOW_PHASES.reduce((sum, p) => sum + p.duration, 0);
  const ratio = availableMinutes / totalOriginal;

  const phases = FLOW_PHASES.map(p => ({
    ...p,
    adjustedDuration: Math.max(3, Math.round(p.duration * ratio)),
  }));

  return {
    phases,
    totalTime: phases.reduce((sum, p) => sum + p.adjustedDuration, 0),
  };
}

/**
 * 获取激励提示
 */
export function getMotivationTip(
  phase: FlowGuide['phase'],
  accuracy: number,
  streak: number
): string {
  const tips: Record<string, string[]> = {
    warmup: [
      '热身中...状态正在上升 🌡️',
      '很好的开始！继续保持这个节奏',
      '简单题搞定，信心建立完成 ✓',
    ],
    focus: [
      `专注模式 ON！已连对 ${streak} 题 🔥`,
      '你正处于心流状态，继续加油！',
      accuracy >= 0.8 ? '正确率超过80%，状态极佳！' : '保持专注，每道题都值得认真对待',
    ],
    challenge: [
      '挑战模式！犯错是进步的开始',
      '突破舒适区才能成长 💪',
      '这道题做错没关系，关键是学会方法',
    ],
    review: [
      '复盘是最重要的学习环节',
      '写下你的理解，费曼学习法才有效',
      '今天的错题，明天的提分点 📈',
    ],
  };

  const phaseTips = tips[phase] || tips.focus;
  return phaseTips[Math.floor(Math.random() * phaseTips.length)];
}
