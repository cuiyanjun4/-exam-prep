import { Question } from '@/types';

/**
 * 加载所有题目数据
 */
export async function loadAllQuestions(): Promise<Question[]> {
  const modules = await Promise.all([
    import('@/data/zhengzhi.json'),
    import('@/data/changshi.json'),
    import('@/data/yanyu.json'),
    import('@/data/shuliang.json'),
    import('@/data/panduan.json'),
    import('@/data/ziliao.json'),
  ]);
  
  return modules.flatMap(m => (m.default || m) as Question[]);
}

/**
 * 按模块加载题目
 */
export async function loadQuestionsByModule(module: string): Promise<Question[]> {
  const moduleMap: Record<string, () => Promise<unknown>> = {
    '政治理论': () => import('@/data/zhengzhi.json'),
    '常识判断': () => import('@/data/changshi.json'),
    '言语理解': () => import('@/data/yanyu.json'),
    '数量关系': () => import('@/data/shuliang.json'),
    '判断推理': () => import('@/data/panduan.json'),
    '资料分析': () => import('@/data/ziliao.json'),
  };
  
  const loader = moduleMap[module];
  if (!loader) return [];
  
  const data = await loader() as { default?: Question[] };
  return (data.default || data) as Question[];
}

/**
 * 按ID查找题目
 */
export function findQuestionById(questions: Question[], id: string): Question | undefined {
  return questions.find(q => q.id === id);
}

/**
 * 随机打乱题目顺序
 */
export function shuffleQuestions(questions: Question[]): Question[] {
  const arr = [...questions];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 智能出题：根据薄弱点权重随机
 */
export function smartSelect(
  questions: Question[],
  count: number,
  weakModules: { module: string; accuracy: number }[]
): Question[] {
  if (questions.length <= count) return shuffleQuestions(questions);
  
  // 按薄弱程度分配权重
  const weights: Record<string, number> = {};
  for (const w of weakModules) {
    weights[w.module] = Math.max(1, 100 - w.accuracy); // 正确率越低权重越高
  }
  
  // 加权随机选择
  const weighted = questions.map(q => ({
    question: q,
    weight: weights[q.module] || 50,
  }));
  
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const selected: Question[] = [];
  const used = new Set<string>();
  
  while (selected.length < count && selected.length < questions.length) {
    let rand = Math.random() * totalWeight;
    for (const w of weighted) {
      if (used.has(w.question.id)) continue;
      rand -= w.weight;
      if (rand <= 0) {
        selected.push(w.question);
        used.add(w.question.id);
        break;
      }
    }
  }
  
  return selected;
}
