import { Question, Module, SubType, Difficulty } from '@/types';
import changshiData from '@/data/changshi.json';
import yanyuData from '@/data/yanyu.json';
import shuliangData from '@/data/shuliang.json';
import panduanData from '@/data/panduan.json';
import ziliaoData from '@/data/ziliao.json';
import zhengzhiData from '@/data/zhengzhi.json';

// 合并所有题目
const baseQuestions: Question[] = [
  ...(zhengzhiData as Question[]),
  ...(changshiData as Question[]),
  ...(yanyuData as Question[]),
  ...(shuliangData as Question[]),
  ...(panduanData as Question[]),
  ...(ziliaoData as Question[]),
];

function getCustomQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem('exam-custom-questions');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 获取所有题目
 */
export function getAllQuestions(): Question[] {
  return [...baseQuestions, ...getCustomQuestions()];
}

/**
 * 按模块获取题目
 */
export function getQuestionsByModule(module: Module): Question[] {
  return getAllQuestions().filter(q => q.module === module);
}

/**
 * 按子类型获取题目
 */
export function getQuestionsBySubType(subType: SubType): Question[] {
  return getAllQuestions().filter(q => q.subType === subType);
}

/**
 * 按难度获取题目
 */
export function getQuestionsByDifficulty(difficulty: Difficulty): Question[] {
  return getAllQuestions().filter(q => q.difficulty === difficulty);
}

/**
 * 根据ID获取题目
 */
export function getQuestionById(id: string): Question | undefined {
  return getAllQuestions().find(q => q.id === id);
}

/**
 * 根据ID列表获取题目
 */
export function getQuestionsByIds(ids: string[]): Question[] {
  const all = getAllQuestions();
  return ids.map(id => all.find(q => q.id === id)).filter(Boolean) as Question[];
}

/**
 * 随机获取N道题（支持按模块筛选）
 */
export function getRandomQuestions(count: number, module?: Module): Question[] {
  const pool = module ? getQuestionsByModule(module) : getAllQuestions();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * 获取模块下的子类型列表
 */
export function getSubTypesByModule(module: Module): SubType[] {
  const subtypes = new Set(getAllQuestions().filter(q => q.module === module).map(q => q.subType));
  return Array.from(subtypes);
}

/**
 * 获取各模块题目数量
 */
export function getModuleQuestionCounts(): Record<Module, number> {
  const modules: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
  const counts: Record<string, number> = {};
  const all = getAllQuestions();
  for (const m of modules) {
    counts[m] = all.filter(q => q.module === m).length;
  }
  return counts as Record<Module, number>;
}

/**
 * 获取所有标签
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  getAllQuestions().forEach(q => q.tags?.forEach(t => tags.add(t)));
  return Array.from(tags).sort();
}

/**
 * 按标签搜索题目
 */
export function getQuestionsByTag(tag: string): Question[] {
  return getAllQuestions().filter(q => q.tags?.includes(tag));
}

/**
 * 搜索题目（按内容关键词）
 */
export function searchQuestions(keyword: string): Question[] {
  const lower = keyword.toLowerCase();
  return getAllQuestions().filter(q =>
    q.content.toLowerCase().includes(lower) ||
    q.explanation.toLowerCase().includes(lower) ||
    q.tags?.some(t => t.toLowerCase().includes(lower))
  );
}
