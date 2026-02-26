/**
 * 数据分析工具
 */

import { AnswerRecord, DailyStats, Module } from '@/types';

const ALL_MODULES: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];

/**
 * 计算模块正确率
 */
export function getModuleAccuracy(records: AnswerRecord[]): Record<Module, number> {
  const result: Record<string, number> = {};
  
  for (const m of ALL_MODULES) {
    const moduleRecords = records.filter(r => r.module === m);
    if (moduleRecords.length === 0) {
      result[m] = 0;
    } else {
      result[m] = Math.round(
        (moduleRecords.filter(r => r.isCorrect).length / moduleRecords.length) * 100
      );
    }
  }
  
  return result as Record<Module, number>;
}

/**
 * 获取最近N天的每日统计
 */
export function getRecentStats(dailyStats: Record<string, DailyStats>, days: number): DailyStats[] {
  const result: DailyStats[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    
    if (dailyStats[key]) {
      result.push(dailyStats[key]);
    } else {
      result.push({
        date: key,
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
      });
    }
  }
  
  return result;
}

/**
 * 计算薄弱模块排名（正确率从低到高）
 */
export function getWeakModules(records: AnswerRecord[]): { module: Module; accuracy: number; count: number }[] {
  const accuracy = getModuleAccuracy(records);
  
  return ALL_MODULES
    .map(m => ({
      module: m,
      accuracy: accuracy[m],
      count: records.filter(r => r.module === m).length,
    }))
    .filter(m => m.count > 0)
    .sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * 估算行测分数（基于模块权重和正确率）
 */
export function estimateScore(records: AnswerRecord[]): number {
  // 行测满分100分，各模块题量和分值参考
  const moduleWeights: Record<Module, { questions: number; score: number }> = {
    '政治理论': { questions: 20, score: 15 },
    '常识判断': { questions: 20, score: 13 },
    '言语理解': { questions: 40, score: 32 },
    '数量关系': { questions: 15, score: 12 },
    '判断推理': { questions: 35, score: 24 },
    '资料分析': { questions: 20, score: 19 },
  };
  
  const accuracy = getModuleAccuracy(records);
  let totalScore = 0;
  
  for (const m of ALL_MODULES) {
    totalScore += (accuracy[m] / 100) * moduleWeights[m].score;
  }
  
  return Math.round(totalScore * 10) / 10;
}

/**
 * 计算平均做题速度
 */
export function getAvgTimePerModule(records: AnswerRecord[]): Record<Module, number> {
  const result: Record<string, number> = {};
  
  for (const m of ALL_MODULES) {
    const moduleRecords = records.filter(r => r.module === m);
    if (moduleRecords.length === 0) {
      result[m] = 0;
    } else {
      result[m] = Math.round(
        moduleRecords.reduce((sum, r) => sum + r.timeSpent, 0) / moduleRecords.length
      );
    }
  }
  
  return result as Record<Module, number>;
}

/**
 * 获取做题趋势（每日正确率变化）
 */
export function getAccuracyTrend(dailyStats: Record<string, DailyStats>, days: number): { date: string; accuracy: number }[] {
  const recent = getRecentStats(dailyStats, days);
  return recent.map(s => ({
    date: s.date,
    accuracy: s.totalQuestions > 0 ? Math.round((s.correctCount / s.totalQuestions) * 100) : 0,
  }));
}
