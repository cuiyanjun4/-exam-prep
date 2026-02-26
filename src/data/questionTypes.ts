import { QuestionTypeInfo, Module, SubType } from '@/types';

/**
 * 行测各模块详细题型信息
 * 包含题型描述、常见陷阱、关键技巧、建议用时
 */
export const QUESTION_TYPE_INFO: QuestionTypeInfo[] = [
  // ==================== 政治理论 ====================
  {
    module: '政治理论',
    subType: '习近平新时代中国特色社会主义思想',
    description: '考查新时代党的创新理论、重要讲话精神等',
    commonTraps: ['混淆核心要义', '表述不精确', '时间节点错误'],
    keyTechniques: ['关注最新讲话', '精准记忆核心词', '构建理论框架'],
    recommendedTime: 30,
    difficultyTrend: '国考、省考必考重点，占比极高',
  },
  {
    module: '政治理论',
    subType: '马克思主义基本原理',
    description: '考查马克思主义哲学、政治经济学、科学社会主义',
    commonTraps: ['混淆唯物论与辩证法', '原理与方法论不匹配'],
    keyTechniques: ['理解基本概念', '结合实例分析', '掌握辩证思维'],
    recommendedTime: 40,
    difficultyTrend: '难度较高，侧重理解与应用',
  },
  {
    module: '政治理论',
    subType: '党史党建',
    description: '考查中国共产党历史、党的建设理论与实践',
    commonTraps: ['重要会议时间混淆', '历史事件意义张冠李戴'],
    keyTechniques: ['时间轴记忆法', '重要会议对比', '结合时代背景'],
    recommendedTime: 35,
    difficultyTrend: '逢重要节点考查增多',
  },

  // ==================== 常识判断 ====================
  {
    module: '常识判断',
    subType: '政治',
    description: '考查马克思主义哲学、中国特色社会主义理论、时事政治等',
    commonTraps: ['混淆相近概念', '时事新闻记忆偏差', '理论表述不精确'],
    keyTechniques: ['关注时政热点', '对比记忆法', '排除明显错误项'],
    recommendedTime: 40,
    difficultyTrend: '国考中占比稳定，省考波动较大',
  },
  {
    module: '常识判断',
    subType: '法律',
    description: '考查宪法、民法、刑法、行政法等基础法律知识',
    commonTraps: ['法条记忆不准', '混淆相似罪名', '年限/时效混淆'],
    keyTechniques: ['抓住关键词', '对比记忆相似法条', '案例联想法'],
    recommendedTime: 45,
    difficultyTrend: '民法典出台后新法热点频出',
  },
  {
    module: '常识判断',
    subType: '经济',
    description: '考查宏观经济、微观经济、经济政策等',
    commonTraps: ['混淆财政政策和货币政策', '经济指标理解错误'],
    keyTechniques: ['理解基本原理', '关注经济热点', '画图辅助理解'],
    recommendedTime: 40,
    difficultyTrend: '与时政结合紧密',
  },
  {
    module: '常识判断',
    subType: '科技',
    description: '考查科技史、前沿科技、生活科技应用等',
    commonTraps: ['发明人/发明物对应错误', '科技原理理解偏差'],
    keyTechniques: ['关注科技新闻', '构建科技知识树', '生活实例联系'],
    recommendedTime: 35,
    difficultyTrend: '新科技热点命题增多',
  },
  {
    module: '常识判断',
    subType: '人文',
    description: '考查文学、历史、文化、艺术等人文知识',
    commonTraps: ['朝代/时间线混乱', '作品与作者对应错误', '文化常识混淆'],
    keyTechniques: ['时间轴记忆', '归类整理', '口诀记忆'],
    recommendedTime: 35,
    difficultyTrend: '文化自信背景下比重增加',
  },
  {
    module: '常识判断',
    subType: '地理',
    description: '考查自然地理、人文地理、中国地理等',
    commonTraps: ['经纬度与气候带混淆', '地理现象成因理解错误'],
    keyTechniques: ['地图辅助记忆', '气候带分布规律', '对比相似地形'],
    recommendedTime: 40,
    difficultyTrend: '结合生态文明考查增多',
  },
  {
    module: '常识判断',
    subType: '生活常识',
    description: '考查日常生活中的科学、安全、健康等知识',
    commonTraps: ['生活经验与科学事实矛盾', '常见误区'],
    keyTechniques: ['科学思维', '破除刻板印象', '生活观察'],
    recommendedTime: 30,
    difficultyTrend: '命题贴近生活实际',
  },

  // ==================== 言语理解 ====================
  {
    module: '言语理解',
    subType: '逻辑填空',
    description: '根据语境选择最恰当的词语或成语填入空白处',
    commonTraps: ['近义词辨析不足', '成语望文生义', '语境色彩不匹配'],
    keyTechniques: ['语境分析法', '对应分析法', '词语辨析积累', '搭配固定用法'],
    recommendedTime: 50,
    difficultyTrend: '命题趋势：成语+实词混合考查增多',
  },
  {
    module: '言语理解',
    subType: '片段阅读',
    description: '阅读文段后回答主旨、细节、推断等问题',
    commonTraps: ['偷换概念', '以偏概全', '过度推断', '混淆主旨和细节'],
    keyTechniques: ['关注转折词', '首句尾句重点', '行文脉络分析', '主体排除法'],
    recommendedTime: 60,
    difficultyTrend: '文段篇幅增长，难度增加',
  },
  {
    module: '言语理解',
    subType: '语句排序',
    description: '将打乱的句子重新排列成逻辑通顺的段落',
    commonTraps: ['仅凭语感排序', '忽略逻辑连接词', '时间线混乱'],
    keyTechniques: ['找首句（背景、定义）', '找尾句（总结）', '看关联词配对', '按时间线排列'],
    recommendedTime: 60,
    difficultyTrend: '难度稳定，技巧性强',
  },
  {
    module: '言语理解',
    subType: '语句衔接',
    description: '在文段空白处填入最恰当的语句',
    commonTraps: ['前后语境不连贯', '话题跳跃', '逻辑关系不匹配'],
    keyTechniques: ['看前看后分析语境', '保持话题一致性', '关注过渡词'],
    recommendedTime: 50,
    difficultyTrend: '考查比重逐年平稳',
  },

  // ==================== 数量关系 ====================
  {
    module: '数量关系',
    subType: '数学运算',
    description: '涉及工程问题、行程问题、排列组合、概率等数学应用题',
    commonTraps: ['公式记忆错误', '计算粗心', '题意理解偏差', '特殊条件遗漏'],
    keyTechniques: ['代入排除法', '特值法', '方程法', '比例法', '整除特性'],
    recommendedTime: 75,
    difficultyTrend: '整体难度较高，但有规律可循',
  },
  {
    module: '数量关系',
    subType: '数字推理',
    description: '找出数列的规律并推出下一个数字',
    commonTraps: ['只看相邻项', '忽略间隔项规律', '多级递推遗漏'],
    keyTechniques: ['做差法', '做商法', '分组法', '质数列', '幂次修正'],
    recommendedTime: 60,
    difficultyTrend: '部分省考取消，国考仍保留',
  },

  // ==================== 判断推理 ====================
  {
    module: '判断推理',
    subType: '图形推理',
    description: '观察图形变化规律，选择符合规律的选项',
    commonTraps: ['只看一种规律', '忽略旋转/翻转', '数量关系遗漏'],
    keyTechniques: ['点线面角法', '对称性判断', '特殊图形标记', '一笔画判断'],
    recommendedTime: 50,
    difficultyTrend: '立体图形占比增加',
  },
  {
    module: '判断推理',
    subType: '定义判断',
    description: '根据给定定义判断选项是否符合该定义',
    commonTraps: ['主观理解代替题目定义', '关键限定词遗漏', '混淆必要和充分条件'],
    keyTechniques: ['关键词提取法', '逐条对照法', '主体/客体/方式分解'],
    recommendedTime: 50,
    difficultyTrend: '多定义综合考查趋势明显',
  },
  {
    module: '判断推理',
    subType: '类比推理',
    description: '判断词语之间的逻辑关系',
    commonTraps: ['只看表面关系', '忽略二级辨析', '关系方向颠倒'],
    keyTechniques: ['造句法', '横纵对比', '语义关系/逻辑关系/语法关系三维分析'],
    recommendedTime: 35,
    difficultyTrend: '难度适中，二级辨析增多',
  },
  {
    module: '判断推理',
    subType: '逻辑判断',
    description: '涉及命题推理、论证分析、归纳推理等',
    commonTraps: ['混淆充分和必要条件', '论证方向搞反', '隐含假设遗漏'],
    keyTechniques: ['矛盾法', '假设法', '论证模型', '推理规则速记'],
    recommendedTime: 65,
    difficultyTrend: '综合推理题增多，难度提升',
  },

  // ==================== 资料分析 ====================
  {
    module: '资料分析',
    subType: '文字资料',
    description: '从文字描述中提取数据进行分析计算',
    commonTraps: ['数据定位错误', '时间段混淆', '单位转换错误'],
    keyTechniques: ['圈画关键数据', '速算技巧', '估算法'],
    recommendedTime: 70,
    difficultyTrend: '文字量大，定位是关键',
  },
  {
    module: '资料分析',
    subType: '表格资料',
    description: '从统计表格中读取和计算相关数据',
    commonTraps: ['行列对应错误', '合计行遗漏', '百分点和百分比混淆'],
    keyTechniques: ['先看标题和表头', '增长率公式', '比较大小技巧'],
    recommendedTime: 65,
    difficultyTrend: '占比稳定，难度适中',
  },
  {
    module: '资料分析',
    subType: '图表资料',
    description: '从柱状图、折线图、饼图中读取数据分析',
    commonTraps: ['坐标轴刻度看错', '图例混淆', '趋势判断失误'],
    keyTechniques: ['看刻度精准定位', '面积法估算', '趋势线判读'],
    recommendedTime: 60,
    difficultyTrend: '综合图表增多',
  },
  {
    module: '资料分析',
    subType: '综合资料',
    description: '结合文字、表格、图表的综合分析',
    commonTraps: ['数据来源搞混', '综合判断题耗时过长'],
    keyTechniques: ['分材料定位', '先易后难', '排除法提速'],
    recommendedTime: 75,
    difficultyTrend: '综合材料题比重上升',
  },
];

/**
 * 获取指定模块的题型信息
 */
export function getTypeInfoByModule(module: Module): QuestionTypeInfo[] {
  return QUESTION_TYPE_INFO.filter(t => t.module === module);
}

/**
 * 获取指定题型的信息
 */
export function getTypeInfo(module: Module, subType: SubType): QuestionTypeInfo | undefined {
  return QUESTION_TYPE_INFO.find(t => t.module === module && t.subType === subType);
}

/**
 * 获取题型的建议用时
 */
export function getRecommendedTime(module: Module, subType: SubType): number {
  const info = getTypeInfo(module, subType);
  return info?.recommendedTime || 60;
}
