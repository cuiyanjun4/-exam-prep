'use client';

import { MistakeCategory, Module, SubType, AnswerRecord, Question } from '@/types';

const KEYS = {
  MISTAKE_CATEGORIES: 'exam-mistake-categories',
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

// ==================== 错题分类管理 ====================

export function getMistakeCategories(): MistakeCategory[] {
  return getItem<MistakeCategory[]>(KEYS.MISTAKE_CATEGORIES, []);
}

export function setMistakeCategories(cats: MistakeCategory[]): void {
  setItem(KEYS.MISTAKE_CATEGORIES, cats);
}

/**
 * 自动分类错题
 * 根据做题记录分析错误类型
 */
export function autoClassifyMistake(
  question: Question,
  record: AnswerRecord,
  allRecords: AnswerRecord[]
): MistakeCategory {
  const cats = getMistakeCategories();
  const existing = cats.find(c => c.questionId === question.id);

  // 智能判断错误类型
  const errorType = analyzeErrorType(question, record, allRecords);

  if (existing) {
    existing.wrongCount++;
    existing.lastWrongDate = new Date().toISOString().split('T')[0];
    existing.errorType = errorType;
    existing.reviewStatus = 'pending';
    setMistakeCategories(cats);
    return existing;
  }

  const newCat: MistakeCategory = {
    questionId: question.id,
    module: question.module,
    subType: question.subType,
    errorType,
    wrongCount: 1,
    lastWrongDate: new Date().toISOString().split('T')[0],
    reviewStatus: 'pending',
    similarQuestionIds: [],
  };

  cats.push(newCat);
  setMistakeCategories(cats);
  return newCat;
}

/**
 * 分析错误类型
 */
function analyzeErrorType(
  question: Question,
  record: AnswerRecord,
  allRecords: AnswerRecord[]
): MistakeCategory['errorType'] {
  const questionRecords = allRecords.filter(r => r.questionId === question.id);

  // 如果多次做错同一题 → 知识盲点
  if (questionRecords.filter(r => !r.isCorrect).length >= 2) {
    return '知识盲点';
  }

  // 如果做题时间很短就选错 → 粗心大意
  const avgTime = getAvgTimeForSubType(question.module, question.subType, allRecords);
  if (record.timeSpent < avgTime * 0.5) {
    return '粗心大意';
  }

  // 如果做题时间过长 → 时间不足
  if (record.timeSpent > avgTime * 2) {
    return '时间不足';
  }

  // 如果同一题型的正确率很低 → 方法错误
  const subTypeRecords = allRecords.filter(
    r => r.module === question.module && r.subType === question.subType
  );
  const accuracy = subTypeRecords.length > 0
    ? subTypeRecords.filter(r => r.isCorrect).length / subTypeRecords.length
    : 0;

  if (accuracy < 0.4) {
    return '方法错误';
  }

  return '理解偏差';
}

/**
 * 获取某题型的平均用时
 */
function getAvgTimeForSubType(module: Module, subType: SubType, records: AnswerRecord[]): number {
  const filtered = records.filter(r => r.module === module && r.subType === subType);
  if (filtered.length === 0) return 60;
  return filtered.reduce((sum, r) => sum + r.timeSpent, 0) / filtered.length;
}

/**
 * 按三大块获取错题分类
 */
export function getMistakesByBlock(): Record<string, MistakeCategory[]> {
  const cats = getMistakeCategories();
  return {
    '文科专项': cats.filter(c => ['常识判断', '言语理解', '政治理论'].includes(c.module)),
    '理科专项': cats.filter(c => ['数量关系', '资料分析'].includes(c.module)),
    '逻辑专项': cats.filter(c => c.module === '判断推理'),
  };
}

/**
 * 按题型获取错题
 */
export function getMistakesBySubType(): Record<string, MistakeCategory[]> {
  const cats = getMistakeCategories();
  const grouped: Record<string, MistakeCategory[]> = {};
  for (const cat of cats) {
    const key = `${cat.module}-${cat.subType}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cat);
  }
  return grouped;
}

/**
 * 按错误类型获取错题
 */
export function getMistakesByErrorType(): Record<string, MistakeCategory[]> {
  const cats = getMistakeCategories();
  const grouped: Record<string, MistakeCategory[]> = {};
  for (const cat of cats) {
    if (!grouped[cat.errorType]) grouped[cat.errorType] = [];
    grouped[cat.errorType].push(cat);
  }
  return grouped;
}

/**
 * 获取最需要关注的错题（按严重程度排序）
 */
export function getTopPriorityMistakes(limit: number = 10): MistakeCategory[] {
  const cats = getMistakeCategories().filter(c => c.reviewStatus !== 'mastered');

  return cats
    .sort((a, b) => {
      // 优先级：错误次数 > 最近错误时间 > 错误类型权重
      const typeWeight: Record<string, number> = {
        '知识盲点': 5,
        '方法错误': 4,
        '理解偏差': 3,
        '粗心大意': 2,
        '时间不足': 1,
      };

      const scoreA = a.wrongCount * 3 + (typeWeight[a.errorType] || 0);
      const scoreB = b.wrongCount * 3 + (typeWeight[b.errorType] || 0);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * 更新错题复习状态
 */
export function updateMistakeStatus(questionId: string, status: MistakeCategory['reviewStatus']): void {
  const cats = getMistakeCategories();
  const cat = cats.find(c => c.questionId === questionId);
  if (cat) {
    cat.reviewStatus = status;
    setMistakeCategories(cats);
  }
}

/**
 * 获取错题统计概览
 */
export function getMistakeStats(): {
  total: number;
  byBlock: Record<string, number>;
  byErrorType: Record<string, number>;
  byReviewStatus: Record<string, number>;
  topWeakSubTypes: { key: string; count: number }[];
} {
  const cats = getMistakeCategories();

  const byBlock: Record<string, number> = { '文科专项': 0, '理科专项': 0, '逻辑专项': 0 };
  const byErrorType: Record<string, number> = {};
  const byReviewStatus: Record<string, number> = { pending: 0, reviewing: 0, mastered: 0 };
  const subTypeCounts: Record<string, number> = {};

  for (const cat of cats) {
    // 按块
    if (['常识判断', '言语理解', '政治理论'].includes(cat.module)) byBlock['文科专项']++;
    else if (['数量关系', '资料分析'].includes(cat.module)) byBlock['理科专项']++;
    else byBlock['逻辑专项']++;

    // 按错误类型
    byErrorType[cat.errorType] = (byErrorType[cat.errorType] || 0) + 1;

    // 按状态
    byReviewStatus[cat.reviewStatus]++;

    // 按题型
    const key = `${cat.module}-${cat.subType}`;
    subTypeCounts[key] = (subTypeCounts[key] || 0) + cat.wrongCount;
  }

  const topWeakSubTypes = Object.entries(subTypeCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: cats.length,
    byBlock,
    byErrorType,
    byReviewStatus,
    topWeakSubTypes,
  };
}
