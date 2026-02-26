// ==================== 题目相关类型 ====================

export type Module = '常识判断' | '言语理解' | '数量关系' | '判断推理' | '资料分析' | '政治理论';

export type SubType = 
  // 常识判断
  | '政治' | '法律' | '经济' | '科技' | '人文' | '地理' | '生活常识'
  // 言语理解
  | '逻辑填空' | '片段阅读' | '语句排序' | '语句衔接'
  // 数量关系
  | '数学运算' | '数字推理'
  // 判断推理
  | '图形推理' | '定义判断' | '类比推理' | '逻辑判断'
  // 资料分析
  | '文字资料' | '表格资料' | '图表资料' | '综合资料'
  // 政治理论
  | '马克思主义基本原理' | '毛泽东思想' | '中国特色社会主义理论体系' | '习近平新时代中国特色社会主义思想' | '党史党建';

export type Difficulty = 1 | 2 | 3; // 简单/中等/困难

export interface QuestionOption {
  key: string; // A, B, C, D
  text: string;
}

export interface Question {
  id: string;
  module: Module;
  subType: SubType;
  difficulty: Difficulty;
  year?: string;
  source?: string;
  content: string; // 题干，支持Markdown
  options: QuestionOption[];
  answer: string; // 正确答案 A|B|C|D
  explanation: string; // 详细解析
  tags: string[];
  relatedKnowledge?: string;
}

// ==================== 做题记录 ====================

export interface AnswerRecord {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number; // 秒
  timestamp: number;
  feynmanNote?: string; // 费曼学习法笔记
  module: Module;
  subType: SubType;
}

// ==================== 间隔重复 SM-2 ====================

export interface ReviewCard {
  questionId: string;
  easeFactor: number; // 难度因子，初始2.5
  interval: number; // 复习间隔（天）
  repetitions: number; // 重复次数
  nextReview: string; // 下次复习日期 YYYY-MM-DD
  leitnerBox: 1 | 2 | 3 | 4 | 5; // 莱特纳盒子
  lastReview: string;
}

// ==================== 学习统计 ====================

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalQuestions: number;
  correctCount: number;
  totalTime: number; // 秒
  moduleStats: Record<Module, { total: number; correct: number }>;
}

export interface UserProgress {
  totalAnswered: number;
  totalCorrect: number;
  streak: number; // 连续打卡天数
  lastActiveDate: string;
  moduleProgress: Record<Module, {
    answered: number;
    correct: number;
    avgTime: number;
  }>;
}

// ==================== AI 相关 ====================

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'tongyi' | 'wenxin' | 'deepseek' | 'zhipu' | 'moonshot' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  apiUrl?: string; // 自定义API地址
  model: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ==================== 学习方法 ====================

export interface LearningMethod {
  id: string;
  name: string;
  englishName: string;
  icon: string;
  description: string;
  steps: string[];
  bestFor: string[];
  applicationInExam: string;
}

// ==================== 番茄钟 ====================

export interface PomodoroSession {
  startTime: number;
  endTime?: number;
  duration: number; // 分钟
  type: 'work' | 'break';
  questionsAnswered: number;
}

// ==================== 康奈尔笔记 ====================

export interface CornellNote {
  id: string;
  date: string;
  topic: string;
  module: Module;
  cues: string; // 左栏 - 线索
  notes: string; // 右栏 - 笔记
  summary: string; // 底部 - 总结
}

// ==================== 用户系统 ====================

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string; // emoji avatar
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
  bio?: string;
  targetScore?: number; // 目标分数
  targetExamDate?: string; // 考试日期
}

export interface AuthState {
  isLoggedIn: boolean;
  currentUser: User | null;
}

// ==================== 三大块专项 ====================

export type MajorBlock = '文科专项' | '理科专项' | '逻辑专项';

export const BLOCK_MODULES: Record<MajorBlock, Module[]> = {
  '文科专项': ['常识判断', '言语理解', '政治理论'],
  '理科专项': ['数量关系', '资料分析'],
  '逻辑专项': ['判断推理'],
};

export const BLOCK_INFO: Record<MajorBlock, { icon: string; color: string; description: string; targetTime: number }> = {
  '文科专项': { icon: '📖', color: 'blue', description: '常识判断 + 言语理解 + 政治理论，侧重记忆理解与语感', targetTime: 45 },
  '理科专项': { icon: '🔢', color: 'green', description: '数量关系 + 资料分析，侧重计算与数据分析', targetTime: 30 },
  '逻辑专项': { icon: '🧠', color: 'purple', description: '判断推理四大题型，侧重逻辑思维能力', targetTime: 30 },
};

// ==================== 详细题型分类 ====================

export interface QuestionTypeInfo {
  module: Module;
  subType: SubType;
  description: string;
  commonTraps: string[];     // 常见陷阱
  keyTechniques: string[];   // 关键技巧
  recommendedTime: number;   // 建议用时（秒）
  difficultyTrend: string;   // 难度趋势
}

// ==================== 错题分类 ====================

export interface MistakeCategory {
  questionId: string;
  module: Module;
  subType: SubType;
  errorType: '知识盲点' | '粗心大意' | '方法错误' | '时间不足' | '理解偏差';
  wrongCount: number;
  lastWrongDate: string;
  reviewStatus: 'pending' | 'reviewing' | 'mastered';
  aiAnalysis?: string;
  similarQuestionIds?: string[];
}

// ==================== 举一反三 ====================

export interface SimilarQuestion {
  id: string;
  originalQuestionId: string; // 原始错题ID
  content: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  module: Module;
  subType: SubType;
  generatedBy: 'ai' | 'system'; // AI生成 or 系统匹配
  createdAt: string;
}

// ==================== 限时速刷 ====================

export interface SpeedSession {
  id: string;
  startTime: number;
  endTime?: number;
  mode: 'block' | 'module' | 'subtype'; // 按专项/模块/题型
  target: string; // 对应的专项/模块/题型名称
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  avgTimePerQuestion: number;
  timeLimit: number; // 总时限（秒）
  questionTimes: number[]; // 每题用时
  isPR: boolean; // 是否个人最佳
}

// ==================== 心流引导 ====================

export interface FlowGuide {
  phase: 'warmup' | 'focus' | 'challenge' | 'review';
  phaseName: string;
  description: string;
  duration: number; // 分钟
  tips: string[];
  method: string; // 关联的学习方法
}

// ==================== 社区 ====================

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  category: '经验分享' | '题目讨论' | '学习打卡' | '资料分享' | '提问求助';
  tags: string[];
  likes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  questionId?: string; // 关联的题目ID
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  likes: number;
  createdAt: string;
  replyTo?: string; // 回复的评论ID
  replyToName?: string;
}

// ==================== 每日AI复盘报告 ====================

export interface DailyAIReport {
  date: string;
  totalQuestions: number;
  correctRate: number;
  timeSpent: number;
  weakPoints: { module: Module; subType: SubType; accuracy: number }[];
  mistakePatterns: { errorType: string; count: number }[];
  improvements: string[]; // AI生成的改进建议
  focusAreas: string[]; // 重点关注领域
  estimatedScore: number;
  scoreChange: number; // 相比上次
  aiSummary: string;
  generatedAt: string;
}

// ==================== 设置 ====================

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  questionsPerSession: number;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  aiConfig: AIConfig;
  showTimer: boolean;
  autoNextQuestion: boolean;
  speedMode: {
    defaultTimePerQuestion: number; // 默认每题限时（秒）
    showCountdown: boolean;
    soundAlert: boolean;
  };
  flowGuide: {
    enabled: boolean;
    warmupMinutes: number;
    focusMinutes: number;
    breakMinutes: number;
  };
}
