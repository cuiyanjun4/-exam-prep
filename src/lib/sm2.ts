/**
 * SM-2 间隔重复算法
 * 基于SuperMemo的SM-2算法实现
 * 
 * quality: 0-5 评分
 *   0 - 完全忘记
 *   1 - 错误但看到答案后想起
 *   2 - 错误但感觉快想起来
 *   3 - 正确但费力
 *   4 - 正确且较轻松
 *   5 - 完全记住
 */

import { ReviewCard } from '@/types';

export function calculateSM2(card: ReviewCard, quality: number): ReviewCard {
  // 确保quality在0-5范围内
  quality = Math.max(0, Math.min(5, quality));
  
  let { easeFactor, interval, repetitions } = card;
  
  if (quality >= 3) {
    // 回答正确
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    // 回答错误，重新开始
    repetitions = 0;
    interval = 1;
  }
  
  // 更新难度因子
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // 难度因子最小为1.3
  if (easeFactor < 1.3) easeFactor = 1.3;
  
  // 计算下次复习日期
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReview = nextDate.toISOString().split('T')[0];
  const lastReview = new Date().toISOString().split('T')[0];
  
  return {
    ...card,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview,
    lastReview,
  };
}

/**
 * 根据做题结果自动计算quality分数
 */
export function autoQuality(isCorrect: boolean, timeSpent: number, avgTime: number): number {
  if (!isCorrect) {
    return timeSpent < avgTime * 0.5 ? 0 : 1; // 快速答错=完全忘记，慢速答错=有印象
  }
  
  if (timeSpent < avgTime * 0.5) return 5;  // 快速答对
  if (timeSpent < avgTime) return 4;         // 正常速度答对
  return 3;                                   // 慢速答对
}

/**
 * 创建新的复习卡片
 */
export function createReviewCard(questionId: string): ReviewCard {
  const today = new Date().toISOString().split('T')[0];
  return {
    questionId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: today,
    leitnerBox: 1,
    lastReview: today,
  };
}

/**
 * 艾宾浩斯遗忘曲线复习时间点（天）
 */
export const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 180];

/**
 * 计算艾宾浩斯复习计划
 */
export function getEbbinghausSchedule(firstDate: string): string[] {
  const dates: string[] = [];
  const base = new Date(firstDate);
  
  for (const days of EBBINGHAUS_INTERVALS) {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}
