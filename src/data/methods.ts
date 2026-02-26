import { LearningMethod } from '@/types';

export const learningMethods: LearningMethod[] = [
  {
    id: 'feynman',
    name: '费曼学习法',
    englishName: 'Feynman Technique',
    icon: '🧑‍🏫',
    description: '通过用自己的话向他人解释一个概念来检验和加深理解。如果你不能简单地解释一件事，说明你还没有真正理解它。',
    steps: [
      '选择一个概念（如一道错题涉及的知识点）',
      '假装向一个完全不懂的人解释这个概念',
      '用最简单、通俗的话写下你的理解',
      '发现解释不清楚的地方，回去重新学习',
      '再次尝试解释，直到通俗易懂'
    ],
    bestFor: ['理解复杂概念', '发现知识盲点', '深化记忆'],
    applicationInExam: '做完每道错题后，在"我的理解"中用自己的话解释为什么选这个答案。AI助手会检查你的理解是否准确。'
  },
  {
    id: 'sq3r',
    name: 'SQ3R学习法',
    englishName: 'Survey-Question-Read-Recite-Review',
    icon: '📖',
    description: '一种系统化的阅读理解方法，通过五个步骤提高阅读效率和理解深度。特别适合言语理解和资料分析模块。',
    steps: [
      'Survey（浏览）：快速浏览题目和选项，获取整体印象',
      'Question（提问）：带着问题去读，"这道题考什么？""关键词是什么？"',
      'Read（精读）：仔细阅读，标注关键信息',
      'Recite（复述）：合上材料，用自己的话复述核心内容',
      'Review（复习）：检查理解是否正确，补充遗漏'
    ],
    bestFor: ['片段阅读', '资料分析', '理解长文本题目'],
    applicationInExam: '言语理解模块提供SQ3R引导模式，五步骤逐步带你分析文段。'
  },
  {
    id: 'ebbinghaus',
    name: '艾宾浩斯遗忘曲线',
    englishName: 'Ebbinghaus Forgetting Curve',
    icon: '📈',
    description: '根据记忆遗忘规律，在最容易遗忘的时间点进行复习：1天、2天、4天、7天、15天、30天后。科学的复习间隔让记忆更持久。',
    steps: [
      '第一次学习后，当天睡前回顾',
      '第1天后复习一次',
      '第2天后复习一次',
      '第4天后复习一次',
      '第7天后复习一次',
      '第15天后复习一次',
      '第30天后复习一次 → 长期记忆'
    ],
    bestFor: ['错题复习', '知识点记忆', '常识判断积累'],
    applicationInExam: '系统自动按照艾宾浩斯时间表推送需要复习的错题，首页仪表盘显示今日复习任务。'
  },
  {
    id: 'pomodoro',
    name: '番茄工作法',
    englishName: 'Pomodoro Technique',
    icon: '🍅',
    description: '将学习时间切分为25分钟专注+5分钟休息的循环。避免疲劳，保持高效注意力。',
    steps: [
      '设定一个25分钟的计时器',
      '全程专注做题，不看手机不分心',
      '计时器响后，标记完成一个番茄',
      '休息5分钟（站起来活动、喝水）',
      '每完成4个番茄，长休息15-30分钟'
    ],
    bestFor: ['保持注意力', '限时训练', '模拟考试时间压力'],
    applicationInExam: '内置番茄钟计时器，刷题时开启，自动记录每个番茄期间的做题数量和正确率。'
  },
  {
    id: 'cornell',
    name: '康奈尔笔记法',
    englishName: 'Cornell Note-Taking System',
    icon: '📝',
    description: '将笔记页面分为三个区域：右侧大区记笔记，左侧窄栏写线索/关键词，底部写总结。便于复习和检索。',
    steps: [
      '右栏（笔记区）：记录知识点详细内容',
      '左栏（线索区）：提取关键词、问题、提示',
      '底部（总结区）：用1-2句话总结核心要点',
      '复习时：遮住右栏，看左栏关键词尝试回忆',
      '定期回顾总结区，把握知识全貌'
    ],
    bestFor: ['知识点整理', '常识判断专题', '公式和技巧汇总'],
    applicationInExam: '内置康奈尔笔记编辑器，可以为每个知识模块创建结构化笔记。'
  },
  {
    id: 'mindmap',
    name: '思维导图法',
    englishName: 'Mind Mapping',
    icon: '🗺️',
    description: '以中心主题为核心，用分支结构将相关知识点串联起来，形成可视化的知识网络。',
    steps: [
      '将核心主题写在中心',
      '画出主要分支（大类/模块）',
      '在分支上添加细节（子知识点）',
      '用颜色、图标区分不同类别',
      '标注知识点之间的关联'
    ],
    bestFor: ['判断推理知识体系', '常识判断专题整理', '建立知识框架'],
    applicationInExam: '每个模块的知识点以树状结构展示，帮助你建立系统化的知识体系。'
  },
  {
    id: 'deliberate-practice',
    name: '刻意练习',
    englishName: 'Deliberate Practice',
    icon: '🎯',
    description: '不是盲目刷题，而是有针对性地在薄弱环节反复训练。关键是走出舒适区，专注于不擅长的部分。',
    steps: [
      '通过数据分析找到薄弱模块和题型',
      '针对薄弱点集中练习（非全面刷题）',
      '每道题认真分析，不求数量求质量',
      '关注错误原因，而非仅记住答案',
      '定期测试检验提升效果'
    ],
    bestFor: ['突破薄弱模块', '提分效率最大化', '考前冲刺'],
    applicationInExam: '系统自动分析你的薄弱模块，生成个性化的专项练习。"刻意练习"模式优先推送你最容易错的题型。'
  },
  {
    id: 'interleaving',
    name: '交替练习',
    englishName: 'Interleaving Practice',
    icon: '🔀',
    description: '不要长时间只练一种题型，而是将不同题型混合练习。研究表明，交替练习虽然当时感觉更难，但长期效果更好。',
    steps: [
      '准备多个模块/题型的题目',
      '每5-10题就切换一个题型',
      '让大脑不断适应不同的思维方式',
      '不要追求某一类题的"流畅感"',
      '坚持这种"困难"的练习方式'
    ],
    bestFor: ['综合提升', '模拟真实考试', '避免思维固化'],
    applicationInExam: '"随机练习"模式就是交替练习的实现，随机混合五大模块出题。'
  },
  {
    id: 'retrieval-practice',
    name: '检索练习',
    englishName: 'Retrieval Practice',
    icon: '🧠',
    description: '主动从记忆中提取信息（做题/回忆），比被动复习（看书/看笔记）效果好3-5倍。做题就是最好的复习。',
    steps: [
      '先合上材料，尝试回忆知识点',
      '做题时不翻笔记、不看提示',
      '即使答错也要先想再看答案',
      '错误的回忆尝试本身就在强化记忆',
      '做完后再对照答案补充修正'
    ],
    bestFor: ['知识巩固', '常识判断记忆', '错题复习'],
    applicationInExam: '默认做题模式不显示提示，做完后再展示详细解析。错题复习也采用先做后看的方式。'
  },
  {
    id: 'spaced-repetition',
    name: '间隔重复 (SM-2)',
    englishName: 'Spaced Repetition System',
    icon: '🔄',
    description: 'SuperMemo算法的核心：根据你对每道题的掌握程度，动态计算最佳复习时间。记得好的间隔长，记不好的间隔短。',
    steps: [
      '每道做过的题都会生成复习卡片',
      '复习时给自己的掌握程度打分',
      '算法根据评分计算下次复习时间',
      '完全掌握的题间隔越来越长',
      '不熟悉的题会高频出现'
    ],
    bestFor: ['长期记忆', '海量知识点管理', '高效复习'],
    applicationInExam: '错题本自动使用SM-2算法安排复习计划，你只需每天打开"今日复习"即可。'
  },
  {
    id: 'leitner',
    name: '莱特纳系统',
    englishName: 'Leitner System',
    icon: '📦',
    description: '用5个盒子管理闪卡。答对升一级盒子（复习间隔变长），答错退回第1个盒子（明天必须复习）。',
    steps: [
      '所有新卡片放入第1盒（每天复习）',
      '答对 → 卡片升入下一个盒子',
      '答错 → 卡片退回第1盒',
      '第1盒每天复习，第2盒每2天，第3盒每4天...',
      '到达第5盒后基本已牢固记忆'
    ],
    bestFor: ['闪卡式记忆', '常识判断', '易混淆知识点'],
    applicationInExam: '收藏的题目自动纳入莱特纳系统，可视化显示5个盒子的卡片分布。'
  },
  {
    id: 'elaboration',
    name: '精细加工',
    englishName: 'Elaborative Interrogation',
    icon: '🔗',
    description: '不断追问"为什么"和"怎么样"，将新知识与已有知识建立连接。理解原理而非死记硬背。',
    steps: [
      '遇到新知识点，问自己"为什么是这样？"',
      '尝试找到背后的原理或逻辑',
      '将新知识与已知知识关联起来',
      '举出类似的例子加深理解',
      '不满足于"知道答案"，要"理解原因"'
    ],
    bestFor: ['深度理解', '逻辑推理', '知识网络构建'],
    applicationInExam: '每道题附有"关联知识点"，帮助你将割裂的知识串联成网。AI助手可以进一步拓展。'
  },
  {
    id: 'dual-coding',
    name: '双重编码',
    englishName: 'Dual Coding Theory',
    icon: '🖼️',
    description: '同时用文字和图像/图表来学习同一个内容，激活左右脑协同工作，记忆效果翻倍。',
    steps: [
      '学习文字内容时，同步画图/示意图',
      '用图表、流程图可视化抽象概念',
      '做资料分析时，将文字转化为表格/图形',
      '为公式配上例题图解',
      '利用颜色编码区分不同概念'
    ],
    bestFor: ['资料分析', '图形推理', '抽象概念具象化'],
    applicationInExam: '知识点尽可能用图文结合方式展示。资料分析题配有可视化数据图。'
  }
];

export function getMethodById(id: string): LearningMethod | undefined {
  return learningMethods.find(m => m.id === id);
}
