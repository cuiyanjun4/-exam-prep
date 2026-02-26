/**
 * 莱特纳系统 (Leitner System)
 * 
 * 5个盒子：
 * Box 1: 每天复习
 * Box 2: 每2天复习
 * Box 3: 每4天复习
 * Box 4: 每7天复习
 * Box 5: 每14天复习
 * 
 * 答对：升一级盒子
 * 答错：退回Box 1
 */

import { ReviewCard } from '@/types';

const BOX_INTERVALS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

/**
 * 更新莱特纳盒子位置
 */
export function updateLeitnerBox(card: ReviewCard, isCorrect: boolean): ReviewCard {
  let newBox = card.leitnerBox;
  
  if (isCorrect) {
    // 答对，升一级（最高5）
    newBox = Math.min(5, card.leitnerBox + 1) as 1 | 2 | 3 | 4 | 5;
  } else {
    // 答错，回到第1盒
    newBox = 1;
  }
  
  const interval = BOX_INTERVALS[newBox];
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  
  return {
    ...card,
    leitnerBox: newBox,
    interval,
    nextReview: nextDate.toISOString().split('T')[0],
    lastReview: new Date().toISOString().split('T')[0],
  };
}

/**
 * 获取各盒子中的卡片数量
 */
export function getBoxCounts(cards: ReviewCard[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const card of cards) {
    counts[card.leitnerBox]++;
  }
  return counts;
}

/**
 * 获取某个盒子中需要复习的卡片
 */
export function getCardsInBox(cards: ReviewCard[], box: number): ReviewCard[] {
  const today = new Date().toISOString().split('T')[0];
  return cards.filter(c => c.leitnerBox === box && c.nextReview <= today);
}
