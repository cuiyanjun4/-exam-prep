'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Module, Question, Difficulty } from '@/types';
import { getModuleQuestionCounts, getAllQuestions } from '@/data';
import { isAdmin, getAuthState, logout, ensureAdminExists, getCurrentUser } from '@/lib/auth';
import { chatWithAI, PROVIDER_LABELS } from '@/lib/ai';
import { getSettings } from '@/lib/storage';
import { AIConfig } from '@/types';

const MODULES: Module[] = ['政治理论', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析'];
const MODULE_FILES: Record<string, string> = {
  '政治理论': 'zhengzhi.json',
  '常识判断': 'changshi.json',
  '言语理解': 'yanyu.json',
  '数量关系': 'shuliang.json',
  '判断推理': 'panduan.json',
  '资料分析': 'ziliao.json',
};

type Tab = 'upload' | 'pdf' | 'list' | 'stats';

// ==================== PDF文本解析工具 ====================

/** 从PDF文本中智能提取题目 */
function parsePDFText(text: string): Partial<Question>[] {
  const questions: Partial<Question>[] = [];
  
  // 匹配题目模式: 数字. 或 数字、 或 第X题 开头
  const qPattern = /(?:^|\n)\s*(?:(\d+)[.、．)\s]|第\s*(\d+)\s*题[.、：:\s])([\s\S]*?)(?=(?:\n\s*(?:\d+[.、．)\s]|第\s*\d+\s*题))|$)/g;
  
  let match;
  while ((match = qPattern.exec(text)) !== null) {
    const qNum = match[1] || match[2];
    const qBlock = match[3]?.trim();
    if (!qBlock || qBlock.length < 10) continue;
    
    // 分离题干和选项
    const optionPattern = /\n?\s*([A-D])[.、．:：)\s]\s*(.+)/g;
    const options: { key: string; text: string }[] = [];
    let optMatch;
    let contentEnd = qBlock.length;
    let firstOptIdx = -1;
    
    while ((optMatch = optionPattern.exec(qBlock)) !== null) {
      if (firstOptIdx < 0) firstOptIdx = optMatch.index;
      options.push({ key: optMatch[1], text: optMatch[2].trim() });
    }
    
    const content = firstOptIdx >= 0 ? qBlock.slice(0, firstOptIdx).trim() : qBlock.trim();
    
    // 提取答案（常见标注模式）
    const answerPattern = /(?:答案|正确答案|参考答案)[：:\s]*([A-D])/i;
    const answerMatch = qBlock.match(answerPattern);
    const answer = answerMatch ? answerMatch[1] : '';
    
    // 提取解析
    const explainPattern = /(?:解析|详解|分析)[：:\s]*([\s\S]*?)(?=\n\s*(?:\d+[.、]|第\s*\d+\s*题)|$)/;
    const explainMatch = qBlock.match(explainPattern);
    const explanation = explainMatch ? explainMatch[1].trim() : '';
    
    if (content && options.length >= 2) {
      questions.push({
        id: `import-${Date.now()}-${qNum}`,
        content,
        options: options.length >= 4 ? options : [...options, ...Array(4 - options.length).fill(null).map((_, i) => ({ key: String.fromCharCode(65 + options.length + i), text: '' }))],
        answer,
        explanation,
        difficulty: 2 as Difficulty,
        module: '常识判断' as Module,
        subType: '' as Question['subType'],
        tags: [],
      });
    }
  }
  
  return questions;
}

/** AI自动分类引擎 - 分析题目的模块、类型和难度 */
async function classifyQuestions(
  questions: Partial<Question>[],
  aiConfig: AIConfig,
  onProgress?: (current: number, total: number) => void,
): Promise<Partial<Question>[]> {
  const BATCH_SIZE = 5;
  const results: Partial<Question>[] = [];
  
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    onProgress?.(i, questions.length);
    
    const batchDesc = batch.map((q, idx) => 
      `[题${i + idx + 1}] ${q.content?.slice(0, 200)}\n选项: ${q.options?.map(o => `${o.key}.${o.text}`).join(' ')}`
    ).join('\n---\n');
    
    try {
      const response = await chatWithAI(aiConfig, [
        {
          role: 'system',
          content: `你是公务员考试行测题目分类专家。请分析以下题目，对每道题判断：
1. module: 所属模块 (常识判断/言语理解/数量关系/判断推理/资料分析/政治理论)
2. subType: 具体题型
3. difficulty: 难度 (1简单/2中等/3困难)

请严格按JSON数组格式输出:[{"module":"","subType":"","difficulty":1}]
只输出JSON，不要其他文字。`
        },
        { role: 'user', content: batchDesc }
      ]);
      
      // 解析AI返回的分类结果
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const classifications = JSON.parse(jsonMatch[0]);
        batch.forEach((q, idx) => {
          const cls = classifications[idx];
          if (cls) {
            results.push({
              ...q,
              module: cls.module || q.module,
              subType: cls.subType || q.subType,
              difficulty: cls.difficulty || q.difficulty,
            });
          } else {
            results.push(q);
          }
        });
      } else {
        results.push(...batch);
      }
    } catch {
      // AI分类失败，保留原始数据
      results.push(...batch);
    }
  }
  
  onProgress?.(questions.length, questions.length);
  return results;
}

// ==================== 主页面组件 ====================

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  
  // 主要状态
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [selectedModule, setSelectedModule] = useState<Module>('常识判断');
  const [jsonInput, setJsonInput] = useState('');
  const [parseResult, setParseResult] = useState<{ ok: boolean; msg: string; count?: number } | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [browseModule, setBrowseModule] = useState<Module | 'all'>('all');
  
  // PDF导入状态
  const [pdfText, setPdfText] = useState('');
  const [pdfParsed, setPdfParsed] = useState<Partial<Question>[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState({ current: 0, total: 0 });
  const [pdfStatus, setPdfStatus] = useState('');

  // 鉴权检查
  useEffect(() => {
    ensureAdminExists();
    if (isAdmin()) {
      setAuthorized(true);
    } else {
      router.replace('/admin/login');
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (authorized) {
      setQuestionCounts(getModuleQuestionCounts());
      setAllQuestions(getAllQuestions());
    }
  }, [authorized]);

  const totalCount = Object.values(questionCounts).reduce((a, b) => a + b, 0);
  const adminUser = getCurrentUser();

  const handleLogout = () => {
    logout();
    router.replace('/admin/login');
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'upload', label: '题目上传', icon: '📤' },
    { key: 'pdf', label: 'PDF导入', icon: '📄' },
    { key: 'list', label: '题库浏览', icon: '📋' },
    { key: 'stats', label: '题库统计', icon: '📊' },
  ];

  function handleParse() {
    try {
      const data = JSON.parse(jsonInput);
      const arr: Question[] = Array.isArray(data) ? data : [data];

      const errors: string[] = [];
      const ids = new Set<string>();
      arr.forEach((q, i) => {
        if (!q.id) errors.push(`第 ${i + 1} 题缺少 id`);
        else if (ids.has(q.id)) errors.push(`第 ${i + 1} 题 id "${q.id}" 重复`);
        else ids.add(q.id);
        if (!q.content) errors.push(`第 ${i + 1} 题缺少 content`);
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2)
          errors.push(`第 ${i + 1} 题 options 无效（至少2个选项）`);
        if (!q.answer) errors.push(`第 ${i + 1} 题缺少 answer`);
        if (!q.module) errors.push(`第 ${i + 1} 题缺少 module`);
      });

      if (errors.length > 0) {
        setParseResult({ ok: false, msg: errors.slice(0, 8).join('\n') });
        setPreviewQuestions([]);
      } else {
        setPreviewQuestions(arr);
        setParseResult({ ok: true, msg: '验证通过', count: arr.length });
      }
    } catch (e) {
      setParseResult({ ok: false, msg: `JSON 解析失败: ${(e as Error).message}` });
      setPreviewQuestions([]);
    }
  }

  /** 下载JSON模板 */
  const downloadTemplate = useCallback(() => {
    const template = [
      {
        id: `${selectedModule.slice(0, 2)}-001`,
        module: selectedModule,
        subType: '',
        difficulty: 2,
        year: '2024',
        source: '2024年国考',
        content: '下列关于XX的说法，正确的是：',
        options: [
          { key: 'A', text: '选项A内容' },
          { key: 'B', text: '选项B内容' },
          { key: 'C', text: '选项C内容' },
          { key: 'D', text: '选项D内容' },
        ],
        answer: 'A',
        explanation: '【解析】正确答案A。具体解析内容...',
        tags: ['高频考点'],
      },
    ];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${MODULE_FILES[selectedModule] || 'questions.json'}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedModule]);

  /** 导出验证通过的题目为JSON文件 */
  const exportParsed = useCallback(() => {
    if (previewQuestions.length === 0) return;
    const blob = new Blob([JSON.stringify(previewQuestions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = MODULE_FILES[selectedModule] || 'questions.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [previewQuestions, selectedModule]);

  /** 文件上传处理 */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonInput(text);
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  }, []);

  const sampleJson = JSON.stringify(
    [
      {
        id: `${selectedModule.slice(0, 2)}-001`,
        module: selectedModule,
        subType: '',
        difficulty: 2,
        year: '2024',
        source: '2024年国考',
        content: '题目内容填写于此处',
        options: [
          { key: 'A', text: '选项A内容' },
          { key: 'B', text: '选项B内容' },
          { key: 'C', text: '选项C内容' },
          { key: 'D', text: '选项D内容' },
        ],
        answer: 'A',
        explanation: '解析内容填写于此处',
        tags: [],
      },
    ],
    null,
    2,
  );

  const browsedQuestions = browseModule === 'all' ? allQuestions : allQuestions.filter(q => q.module === browseModule);

  // ==================== PDF导入处理 ====================

  const handlePDFFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type === 'application/pdf') {
      // PDF文件 - 提示用户先转换为文本
      setPdfStatus('⚠️ 浏览器端暂不支持直接读取PDF二进制文件。请先将PDF复制粘贴文本内容到下方文本框，或使用在线PDF转文本工具。');
      return;
    }
    
    // 文本文件直接读取
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPdfText(text);
      setPdfStatus(`✅ 已读取文件，共 ${text.length} 字符`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleParsePDF = () => {
    if (!pdfText.trim()) {
      setPdfStatus('❌ 请先粘贴或上传文本内容');
      return;
    }
    const parsed = parsePDFText(pdfText);
    setPdfParsed(parsed);
    setPdfStatus(`✅ 提取到 ${parsed.length} 道题目，可进行AI智能分类`);
  };

  const handleAIClassify = async () => {
    if (pdfParsed.length === 0) return;
    const settings = getSettings();
    const aiConfig = settings.aiConfig;
    if (!aiConfig.apiKey) {
      setPdfStatus('❌ 请先在设置中配置AI API Key');
      return;
    }
    
    setClassifying(true);
    setPdfStatus('🤖 AI正在智能分类中...');
    
    try {
      const classified = await classifyQuestions(pdfParsed, aiConfig, (cur, total) => {
        setClassifyProgress({ current: cur, total });
      });
      setPdfParsed(classified);
      setPdfStatus(`✅ AI分类完成！${classified.length} 道题目已自动分配模块和难度`);
    } catch (err) {
      setPdfStatus(`❌ AI分类失败: ${(err as Error).message}`);
    } finally {
      setClassifying(false);
    }
  };

  const handleExportClassified = () => {
    if (pdfParsed.length === 0) return;
    const blob = new Blob([JSON.stringify(pdfParsed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdf_imported_questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==================== 渲染 ====================

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      {/* Admin Header with user info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🛡️ 后台管理系统</h1>
          <p className="text-sm text-slate-500 mt-1">
            题库维护 · PDF导入 · AI分类 · 统计总览　|　共 <span className="font-semibold text-blue-600">{totalCount}</span> 道题目
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-700">{adminUser?.avatar} {adminUser?.nickname}</p>
            <p className="text-xs text-slate-400">管理员</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors border border-red-100"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-5">
          {/* Module selector */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">选择目标模块</h2>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedModule(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedModule === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {m} <span className="text-xs opacity-70">({questionCounts[m] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap gap-3">
            <button onClick={downloadTemplate} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              📥 下载模板
            </button>
            <label className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              📂 上传JSON文件
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={() => setJsonInput(sampleJson)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              📋 加载示例
            </button>
          </div>

          {/* JSON Input */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">粘贴/编辑题目 JSON</h2>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-64 font-mono text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-y"
              placeholder={`粘贴 JSON 数组，格式参考下载的模板文件`}
            />
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleParse}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                验证 JSON
              </button>
              {previewQuestions.length > 0 && (
                <button
                  onClick={exportParsed}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  导出为 {MODULE_FILES[selectedModule]}
                </button>
              )}
              {parseResult && (
                <span className={`text-sm font-medium ${parseResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {parseResult.ok ? `✅ ${parseResult.count} 题` : `❌ ${parseResult.msg}`}
                </span>
              )}
            </div>
          </div>

          {/* Preview parsed */}
          {previewQuestions.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-slate-800 mb-3 text-sm">预览 ({previewQuestions.length} 题)</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previewQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{q.module}</span>
                      {q.subType && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{q.subType}</span>}
                      <span className="text-xs text-slate-400 font-mono">{q.id}</span>
                      <span className="text-xs text-amber-600">难度{q.difficulty}</span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1.5">{q.content.slice(0, 120)}{q.content.length > 120 ? '...' : ''}</p>
                    <div className="flex flex-wrap gap-1">
                      {q.options.map(o => (
                        <span key={o.key} className={`text-xs px-2 py-0.5 rounded ${o.key === q.answer ? 'bg-green-100 text-green-700 font-medium' : 'text-slate-500'}`}>
                          {o.key}. {o.text.slice(0, 30)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-2">📌 使用流程</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>选择目标模块 → 下载JSON模板（或使用示例）</li>
              <li>按模板格式批量填写题目</li>
              <li>粘贴或上传JSON文件 → 点击「验证」</li>
              <li>验证通过后点击「导出」，将生成的文件替换 <code>src/data/</code> 对应文件</li>
              <li>重新构建项目即可生效</li>
            </ol>
          </div>
        </div>
      )}

      {/* PDF Import Tab */}
      {activeTab === 'pdf' && (
        <div className="space-y-5">
          {/* PDF上传区域 */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-slate-800 mb-3 text-sm">📄 导入文本/PDF内容</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                📂 上传文件（TXT/文本）
                <input type="file" accept=".txt,.text,.md" onChange={handlePDFFileUpload} className="hidden" />
              </label>
              <button
                onClick={() => setPdfText('')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                🗑️ 清空
              </button>
            </div>
            <textarea
              value={pdfText}
              onChange={e => setPdfText(e.target.value)}
              className="w-full h-56 font-mono text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-y"
              placeholder={`将PDF内容复制粘贴到此处，系统会自动识别题目格式。\n\n支持的格式举例：\n1. 下列关于法律的说法，正确的是：\nA. 选项A\nB. 选项B\nC. 选项C\nD. 选项D\n答案：A\n解析：...\n\n2. 第二道题...`}
            />
          </div>
          
          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={handleParsePDF}
              disabled={!pdfText.trim()}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              🔍 智能提取题目
            </button>
            <button
              onClick={handleAIClassify}
              disabled={pdfParsed.length === 0 || classifying}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {classifying ? `🤖 分类中 (${classifyProgress.current}/${classifyProgress.total})...` : '🤖 AI智能分类'}
            </button>
            {pdfParsed.length > 0 && (
              <button
                onClick={handleExportClassified}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                📥 导出JSON
              </button>
            )}
          </div>

          {/* 状态提示 */}
          {pdfStatus && (
            <div className={`rounded-xl p-4 text-sm ${
              pdfStatus.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
              pdfStatus.startsWith('❌') ? 'bg-red-50 text-red-700 border border-red-200' :
              pdfStatus.startsWith('🤖') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
              'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {pdfStatus}
            </div>
          )}

          {/* AI分类进度条 */}
          {classifying && classifyProgress.total > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                <span>AI分类进度</span>
                <span>{Math.round((classifyProgress.current / classifyProgress.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${(classifyProgress.current / classifyProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* 提取结果预览 */}
          {pdfParsed.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-slate-800 mb-3 text-sm">
                提取结果 ({pdfParsed.length} 题)
                {pdfParsed.some(q => q.module) && (
                  <span className="ml-2 text-xs text-purple-600 font-normal">已分类</span>
                )}
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {pdfParsed.map((q, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                      {q.module && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{q.module}</span>
                      )}
                      {q.subType && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{q.subType}</span>
                      )}
                      {q.difficulty && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          q.difficulty === 1 ? 'bg-green-50 text-green-600' :
                          q.difficulty === 2 ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {'★'.repeat(q.difficulty)}
                        </span>
                      )}
                      {q.answer && <span className="text-xs text-green-600 font-medium">答案: {q.answer}</span>}
                    </div>
                    <p className="text-sm text-slate-700 mb-1.5">{q.content?.slice(0, 150)}{(q.content?.length || 0) > 150 ? '...' : ''}</p>
                    {q.options && q.options.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {q.options.map(o => (
                          <span key={o.key} className={`text-xs px-2 py-0.5 rounded ${o.key === q.answer ? 'bg-green-100 text-green-700 font-medium' : 'text-slate-500'}`}>
                            {o.key}. {o.text?.slice(0, 40)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-2">📌 PDF导入流程</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>将PDF中的文本内容复制粘贴到文本框（或上传TXT文件）</li>
              <li>点击「智能提取」自动识别题号、题干、选项、答案</li>
              <li>点击「AI智能分类」自动判断模块、题型和难度</li>
              <li>检查分类结果，导出JSON文件</li>
              <li>在「题目上传」标签页导入JSON到题库</li>
            </ol>
          </div>
        </div>
      )}

      {/* Browse Tab */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setBrowseModule('all')} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${browseModule === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
              全部 ({totalCount})
            </button>
            {MODULES.map(m => (
              <button key={m} onClick={() => setBrowseModule(m)} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${browseModule === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                {m} ({questionCounts[m] || 0})
              </button>
            ))}
          </div>
          {browsedQuestions.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
              <p className="text-4xl mb-3">📋</p>
              <p>该模块暂无题目</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {browsedQuestions.slice(0, 50).map((q, idx) => (
                <div key={q.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-slate-400">{q.id}</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{q.module}</span>
                    {q.subType && <span className="text-xs text-slate-400">{q.subType}</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${q.difficulty === 1 ? 'bg-green-50 text-green-600' : q.difficulty === 2 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                      {'★'.repeat(q.difficulty)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{q.content.slice(0, 150)}{q.content.length > 150 ? '...' : ''}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {q.options.map(o => (
                      <span key={o.key} className={`text-xs px-2 py-0.5 rounded ${o.key === q.answer ? 'bg-green-100 text-green-700 font-semibold' : 'bg-slate-50 text-slate-500'}`}>
                        {o.key}. {o.text.slice(0, 40)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {browsedQuestions.length > 50 && (
                <p className="text-center text-sm text-slate-400 py-2">仅显示前50题，共 {browsedQuestions.length} 题</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-5">
          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-slate-500">总题量</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{totalCount}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-slate-500">模块数</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{MODULES.length}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-slate-500">数据文件</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{MODULES.length}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm text-slate-500">存储方式</p>
              <p className="text-lg font-bold text-slate-600 mt-2">本地JSON</p>
            </div>
          </div>

          {/* Module breakdown */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-slate-800 mb-4">各模块题量</h2>
            <div className="space-y-3">
              {MODULES.map(m => {
                const count = questionCounts[m] || 0;
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={m} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 w-20 shrink-0">{m}</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 5)}%` }}>
                        <span className="text-xs text-white font-medium">{count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 w-12 text-right font-mono">{MODULE_FILES[m]?.split('.')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DB migration notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">💡 云端数据库规划</p>
            <p>Prisma schema 已设计完成（prisma/schema.prisma），目标数据库 Neon PostgreSQL。</p>
            <p className="mt-1">对接后支持：在线批量导入、实时题量统计、用户排行榜、多人协作出题。</p>
          </div>
        </div>
      )}
    </div>
  );
}
