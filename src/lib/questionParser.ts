/**
 * 智能题目解析器
 * - 自动识别题目、选项、答案、解析
 * - 自动分类到对应模块和子类型
 * - 识别含图片的题目（图形推理、资料分析图表等）并特殊标记
 */

import { Module, SubType, Difficulty, Question, QuestionOption } from '@/types';

// ==================== 模块关键词映射 ====================
const MODULE_KEYWORDS: Record<Module, string[]> = {
  '常识判断': ['常识', '法律', '经济', '科技', '人文', '地理', '历史', '民法', '刑法', '宪法'],
  '言语理解': ['言语', '填空', '逻辑填空', '片段阅读', '语句排序', '语句衔接', '成语', '近义词'],
  '数量关系': ['数量', '数学运算', '数字推理', '数列', '方程', '排列组合', '概率'],
  '判断推理': ['判断推理', '图形推理', '定义判断', '类比推理', '逻辑判断', '三段论', '加强', '削弱'],
  '资料分析': ['资料分析', '增长率', '同比', '环比', '基期', '比重', '倍数', '平均数', '表格', '图表'],
  '政治理论': ['马克思', '毛泽东', '邓小平', '习近平', '新时代', '党史', '党建', '中特', '社会主义'],
};

const SUBTYPE_KEYWORDS: Record<string, { module: Module; subType: SubType }> = {
  // 常识判断
  '政治常识|时事政治|政治': { module: '常识判断', subType: '政治' },
  '法律|民法|刑法|宪法|行政法': { module: '常识判断', subType: '法律' },
  '经济|GDP|财政|货币|市场': { module: '常识判断', subType: '经济' },
  '科技|科学|技术|物理|化学|生物': { module: '常识判断', subType: '科技' },
  '人文|文学|历史|文化|诗词': { module: '常识判断', subType: '人文' },
  '地理|地球|气候|海洋|地形': { module: '常识判断', subType: '地理' },
  '生活|健康|饮食|运动': { module: '常识判断', subType: '生活常识' },
  // 言语理解
  '逻辑填空|填空|成语': { module: '言语理解', subType: '逻辑填空' },
  '片段阅读|阅读|主旨|中心': { module: '言语理解', subType: '片段阅读' },
  '语句排序|排序': { module: '言语理解', subType: '语句排序' },
  '语句衔接|衔接': { module: '言语理解', subType: '语句衔接' },
  // 数量关系
  '数学运算|运算|方程|比例': { module: '数量关系', subType: '数学运算' },
  '数字推理|数列|规律': { module: '数量关系', subType: '数字推理' },
  // 判断推理
  '图形推理|图形|图推': { module: '判断推理', subType: '图形推理' },
  '定义判断|定义': { module: '判断推理', subType: '定义判断' },
  '类比推理|类比': { module: '判断推理', subType: '类比推理' },
  '逻辑判断|三段论|加强|削弱|假设': { module: '判断推理', subType: '逻辑判断' },
  // 资料分析
  '文字资料|文字': { module: '资料分析', subType: '文字资料' },
  '表格资料|表格|表': { module: '资料分析', subType: '表格资料' },
  '图表资料|图表|柱状图|折线图|饼图': { module: '资料分析', subType: '图表资料' },
  '综合资料|综合': { module: '资料分析', subType: '综合资料' },
  // 政治理论
  '马克思主义|马克思|唯物': { module: '政治理论', subType: '马克思主义基本原理' },
  '毛泽东思想|毛泽东': { module: '政治理论', subType: '毛泽东思想' },
  '中特|邓小平|三个代表|科学发展观': { module: '政治理论', subType: '中国特色社会主义理论体系' },
  '习近平|新时代': { module: '政治理论', subType: '习近平新时代中国特色社会主义思想' },
  '党史|党建|党的': { module: '政治理论', subType: '党史党建' },
};

// ==================== 图片题目特征检测 ====================
const IMAGE_PATTERNS = [
  // 图形推理类
  /如图所示/i,
  /下列图形/i,
  /观察下图/i,
  /根据图形/i,
  /图形规律/i,
  /下一个图形/i,
  /请选择.*图/i,
  /\[图\]/i,
  /\[图片\]/i,
  /（.*图.*）/,
  /\(图\d+\)/,
  // 资料分析图表类
  /根据.*图表/i,
  /根据.*表格/i,
  /如下图/i,
  /如下表/i,
  /见下图/i,
  /见下表/i,
  /下图.*显示/i,
  /下表.*显示/i,
  /柱状图/i,
  /折线图/i,
  /饼图/i,
  /扇形图/i,
  /统计图/i,
  /数据图/i,
  // 通用图片引用
  /img|image|\.png|\.jpg|\.jpeg|\.gif|\.svg|\.bmp/i,
  /\[图片缺失\]/i,
  /（图片）/,
];

export interface ParsedQuestion {
  content: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  module: Module;
  subType: SubType;
  difficulty: Difficulty;
  hasImage: boolean;
  imageType?: 'figure-reasoning' | 'chart-data' | 'illustration' | 'option-images';
  tags: string[];
  source?: string;
}

/**
 * 检测题目是否包含/引用图片
 */
export function detectImageContent(text: string): { hasImage: boolean; imageType?: ParsedQuestion['imageType'] } {
  const fullText = text.toLowerCase();
  
  // 图形推理
  if (/图形推理|图推|下一个图形|图形规律|观察图形/.test(fullText)) {
    return { hasImage: true, imageType: 'figure-reasoning' };
  }
  
  // 资料分析图表
  if (/柱状图|折线图|饼图|扇形图|统计图|根据.*图表|如下图|见下图|图表.*数据/.test(fullText)) {
    return { hasImage: true, imageType: 'chart-data' };
  }
  
  // 选项中含图片
  if (/选项.*图|图.*选项|\[图\]|img|\.png|\.jpg/.test(fullText)) {
    return { hasImage: true, imageType: 'option-images' };
  }
  
  // 通用图片引用
  for (const pattern of IMAGE_PATTERNS) {
    if (pattern.test(text)) {
      return { hasImage: true, imageType: 'illustration' };
    }
  }
  
  return { hasImage: false };
}

/**
 * 智能推断题目所属模块和子类型
 */
export function classifyQuestion(content: string, contextHint?: string): { module: Module; subType: SubType } {
  const text = `${content} ${contextHint || ''}`.toLowerCase();
  
  // 优先匹配子类型关键词（更精确）
  for (const [keywords, classification] of Object.entries(SUBTYPE_KEYWORDS)) {
    const keywordList = keywords.split('|');
    for (const kw of keywordList) {
      if (text.includes(kw.toLowerCase())) {
        return classification;
      }
    }
  }
  
  // 次优先：匹配模块关键词
  for (const [module, keywords] of Object.entries(MODULE_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        // 返回该模块的第一个子类型作为默认
        const firstSubtype = Object.values(SUBTYPE_KEYWORDS).find(v => v.module === module);
        if (firstSubtype) return firstSubtype;
      }
    }
  }
  
  // 默认分类为常识判断
  return { module: '常识判断', subType: '生活常识' };
}

/**
 * 估算难度（基于文本长度和复杂度）
 */
export function estimateDifficulty(content: string, options: string[]): Difficulty {
  const totalLength = content.length + options.join('').length;
  
  // 长题目通常难度更高
  if (totalLength > 500) return 3;
  if (totalLength > 250) return 2;
  return 1;
}

/**
 * 解析纯文本为题目列表
 * 支持多种常见格式：
 *  1. xxx  /  1、xxx  /  第1题 xxx
 *  A. xxx  /  A、xxx  /  A xxx
 *  答案：A  /  【答案】A
 *  解析：xxx  /  【解析】xxx
 */
export function parseTextToQuestions(text: string, sourceLabel?: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // 按题目编号拆分
  const questionBlocks = text.split(/(?=(?:^|\n)\s*(?:\d+[\.\、\s]|第\d+题|[\(（]\d+[\)）]))/);
  
  for (const block of questionBlocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.length < 10) continue;
    
    try {
      const parsed = parseSingleQuestion(trimmed);
      if (parsed) {
        const classification = classifyQuestion(parsed.content, parsed.explanation);
        const imageInfo = detectImageContent(parsed.content + ' ' + parsed.options.map(o => o.text).join(' '));
        const difficulty = estimateDifficulty(parsed.content, parsed.options.map(o => o.text));
        
        const tags: string[] = [sourceLabel || '智能导入'];
        if (imageInfo.hasImage) {
          tags.push('含图片');
          if (imageInfo.imageType === 'figure-reasoning') tags.push('图形推理');
          if (imageInfo.imageType === 'chart-data') tags.push('图表数据');
        }
        
        questions.push({
          ...parsed,
          module: classification.module,
          subType: classification.subType,
          difficulty,
          hasImage: imageInfo.hasImage,
          imageType: imageInfo.imageType,
          tags,
          source: sourceLabel,
        });
      }
    } catch {
      // skip malformed questions
    }
  }
  
  return questions;
}

/**
 * 解析单道题目
 */
function parseSingleQuestion(block: string): { content: string; options: QuestionOption[]; answer: string; explanation: string } | null {
  // 提取题干（从开头到第一个选项之前）
  const optionMatch = block.match(/(?:^|\n)\s*A[\.\、\s]/m);
  if (!optionMatch) return null;
  
  const contentEnd = block.indexOf(optionMatch[0]);
  let content = block.substring(0, contentEnd).trim();
  // 去掉题号
  content = content.replace(/^\s*(?:\d+[\.\、\s]|第\d+题[\.\、\s]?|[\(（]\d+[\)）]\s*)/, '').trim();
  
  if (!content) return null;
  
  // 提取选项
  const options: QuestionOption[] = [];
  const optionRegex = /(?:^|\n)\s*([A-D])[\.\、\s]+(.+?)(?=(?:\n\s*[A-D][\.\、\s])|(?:\n\s*(?:答案|【答案】|解析|【解析】))|$)/g;
  let match;
  const afterContent = block.substring(contentEnd);
  
  while ((match = optionRegex.exec(afterContent)) !== null) {
    options.push({
      key: match[1].toUpperCase(),
      text: match[2].trim(),
    });
  }
  
  // 如果正则没抓到，尝试简单切分
  if (options.length < 2) {
    const lines = afterContent.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const m = line.match(/^\s*([A-D])[\.\、\s]+(.+)/);
      if (m) {
        options.push({ key: m[1].toUpperCase(), text: m[2].trim() });
      }
    }
  }
  
  if (options.length < 2) return null;
  
  // 提取答案
  let answer = '';
  const answerMatch = block.match(/(?:答案|【答案】|正确答案)[：:\s]*([A-D])/i);
  if (answerMatch) {
    answer = answerMatch[1].toUpperCase();
  }
  
  // 提取解析
  let explanation = '';
  const explMatch = block.match(/(?:解析|【解析】|详解)[：:\s]*([\s\S]*?)$/i);
  if (explMatch) {
    explanation = explMatch[1].trim();
  }
  
  return { content, options, answer: answer || 'A', explanation: explanation || '暂无解析' };
}

/**
 * 检测网盘链接类型
 */
export function detectCloudDrive(url: string): 'baidu' | 'aliyun' | 'quark' | 'unknown' {
  if (/pan\.baidu\.com|baidu\.com\/s\//.test(url)) return 'baidu';
  if (/aliyundrive\.com|alipan\.com/.test(url)) return 'aliyun';
  if (/pan\.quark\.cn|quark\.cn/.test(url)) return 'quark';
  return 'unknown';
}

/**
 * 获取网盘图标
 */
export function getCloudDriveInfo(type: ReturnType<typeof detectCloudDrive>) {
  switch (type) {
    case 'baidu': return { name: '百度网盘', icon: '💙', color: 'text-blue-600 bg-blue-50' };
    case 'aliyun': return { name: '阿里云盘', icon: '💜', color: 'text-purple-600 bg-purple-50' };
    case 'quark': return { name: '夸克网盘', icon: '💛', color: 'text-yellow-600 bg-yellow-50' };
    default: return { name: '未知网盘', icon: '🔗', color: 'text-gray-600 bg-gray-50' };
  }
}
