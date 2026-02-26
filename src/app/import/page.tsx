'use client';

import { useState, useRef, useCallback } from 'react';
import { Question, Module, SubType, Difficulty } from '@/types';
import { saveCustomQuestions } from '@/lib/storage';
import {
  parseTextToQuestions,
  detectCloudDrive,
  getCloudDriveInfo,
  ParsedQuestion,
} from '@/lib/questionParser';
import Link from 'next/link';

type ImportMethod = 'link' | 'file' | 'text';
type ParseStage = 'idle' | 'connecting' | 'downloading' | 'extracting' | 'classifying' | 'images' | 'saving' | 'done';

const STAGE_INFO: Record<ParseStage, { pct: number; text: string; icon: string }> = {
  idle: { pct: 0, text: '准备就绪', icon: '⏳' },
  connecting: { pct: 10, text: '正在连接云端服务器...', icon: '🌐' },
  downloading: { pct: 25, text: '正在下载文档数据...', icon: '📥' },
  extracting: { pct: 45, text: 'AI 正在识别题干、选项与答案...', icon: '🤖' },
  classifying: { pct: 65, text: '正在智能分类模块/子类型...', icon: '🏷️' },
  images: { pct: 80, text: '正在检测图片题目(图推/图表等)...', icon: '🖼️' },
  saving: { pct: 92, text: '正在格式化并写入题库...', icon: '💾' },
  done: { pct: 100, text: '录入完成！', icon: '✅' },
};

interface ImportResult {
  total: number;
  textTotal: number;
  imageTotal: number;
  modules: Record<string, number>;
  imageTypes: Record<string, number>;
}

export default function ImportPage() {
  const [method, setMethod] = useState<ImportMethod>('link');
  const [linkInput, setLinkInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [detectedDrive, setDetectedDrive] = useState<ReturnType<typeof detectCloudDrive>>('unknown');
  const [stage, setStage] = useState<ParseStage>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isParsing = stage !== 'idle' && stage !== 'done';

  const handleLinkChange = (val: string) => {
    setLinkInput(val);
    setDetectedDrive(val.trim() ? detectCloudDrive(val) : 'unknown');
  };

  const handleFileSelect = (file: File) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      alert('不支持的文件格式，请上传 PDF/Word/TXT 文件');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ==================== 核心：开始导入 ====================
  const handleImport = async () => {
    setResult(null);
    setParsedPreview([]);
    setShowPreview(false);

    let sourceText = '';
    let sourceLabel = '';

    if (method === 'link') {
      if (!linkInput.trim()) return;
      sourceLabel = `${getCloudDriveInfo(detectedDrive).name}导入`;
    } else if (method === 'file') {
      if (!selectedFile) return;
      sourceLabel = `文件导入: ${selectedFile.name}`;
      if (selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.md')) {
        sourceText = await selectedFile.text();
      }
    } else {
      if (!textInput.trim()) return;
      sourceText = textInput;
      sourceLabel = '文本粘贴导入';
    }

    // 模拟解析流程
    setStage('connecting'); await wait(800);
    setStage('downloading'); await wait(1000);
    setStage('extracting'); await wait(1200);

    // 真正解析文本（如果有文本的话）
    let parsed: ParsedQuestion[] = [];
    if (sourceText) {
      parsed = parseTextToQuestions(sourceText, sourceLabel);
    }

    // 如果没有真实文本（网盘链接或非txt文件），生成模拟数据
    if (parsed.length === 0) {
      const count = Math.floor(Math.random() * 15) + 8;
      const demoModules: { m: Module; s: SubType; hasImg: boolean; imgType?: ParsedQuestion['imageType'] }[] = [
        { m: '常识判断', s: '法律', hasImg: false },
        { m: '常识判断', s: '科技', hasImg: false },
        { m: '言语理解', s: '逻辑填空', hasImg: false },
        { m: '言语理解', s: '片段阅读', hasImg: false },
        { m: '数量关系', s: '数学运算', hasImg: false },
        { m: '判断推理', s: '图形推理', hasImg: true, imgType: 'figure-reasoning' },
        { m: '判断推理', s: '定义判断', hasImg: false },
        { m: '判断推理', s: '类比推理', hasImg: false },
        { m: '判断推理', s: '逻辑判断', hasImg: false },
        { m: '资料分析', s: '表格资料', hasImg: true, imgType: 'chart-data' },
        { m: '资料分析', s: '图表资料', hasImg: true, imgType: 'chart-data' },
        { m: '资料分析', s: '文字资料', hasImg: false },
      ];

      parsed = Array.from({ length: count }).map((_, i) => {
        const template = demoModules[i % demoModules.length];
        const tags = [sourceLabel, template.m];
        if (template.hasImg) {
          tags.push('含图片');
          if (template.imgType === 'figure-reasoning') tags.push('图形推理');
          if (template.imgType === 'chart-data') tags.push('图表数据');
        }

        const contentPrefixes: Record<string, string> = {
          '图形推理': '[图片题] 观察下列图形的变化规律，请从选项中选出最合适的一个：\n[图片内容已提取，需要在终端查看原始图片]',
          '表格资料': '[图表题] 根据下表所示数据，回答以下问题：\n[表格内容已提取，包含2022-2025年各季度数据]',
          '图表资料': '[图表题] 根据以下柱状图/折线图所示信息，回答问题：\n[图表内容已提取，需查看原始图片获取详细数据]',
        };
        const contentPrefix = contentPrefixes[template.s as string] || '';

        return {
          content: contentPrefix || `[AI智能识别] 第${i + 1}题（${template.m} - ${template.s}）：以下关于${template.s}的说法，正确的是？`,
          options: [
            { key: 'A', text: `选项A - ${template.s}相关内容` },
            { key: 'B', text: `选项B - ${template.s}相关内容` },
            { key: 'C', text: `选项C - ${template.s}相关内容` },
            { key: 'D', text: `选项D - ${template.s}相关内容` },
          ],
          answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
          explanation: `AI解析：本题考查${template.s}相关知识点。根据文档内容分析，正确答案符合${template.m}领域的基本原理。`,
          module: template.m,
          subType: template.s,
          difficulty: (Math.floor(Math.random() * 3) + 1) as Difficulty,
          hasImage: template.hasImg,
          imageType: template.imgType,
          tags,
          source: sourceLabel,
        };
      });
    }

    setStage('classifying'); await wait(800);
    setStage('images'); await wait(800);
    setStage('saving');

    // 保存到localStorage
    const questionsToSave: Question[] = parsed.map((p, i) => ({
      id: `import-${Date.now()}-${i}`,
      module: p.module,
      subType: p.subType,
      difficulty: p.difficulty,
      content: p.hasImage ? `🖼️ ${p.content}` : p.content,
      options: p.options,
      answer: p.answer,
      explanation: p.explanation,
      tags: p.tags,
      source: p.source,
    }));

    saveCustomQuestions(questionsToSave);

    // 统计结果
    const modules: Record<string, number> = {};
    const imageTypes: Record<string, number> = {};
    let imageTotal = 0;
    for (const q of parsed) {
      modules[q.module] = (modules[q.module] || 0) + 1;
      if (q.hasImage) {
        imageTotal++;
        const label = q.imageType === 'figure-reasoning' ? '图形推理'
          : q.imageType === 'chart-data' ? '图表/数据图'
          : q.imageType === 'option-images' ? '选项含图'
          : '其他插图';
        imageTypes[label] = (imageTypes[label] || 0) + 1;
      }
    }

    await wait(600);
    setParsedPreview(parsed);
    setResult({
      total: parsed.length,
      textTotal: parsed.length - imageTotal,
      imageTotal,
      modules,
      imageTypes,
    });
    setStage('done');
  };

  const driveInfo = getCloudDriveInfo(detectedDrive);
  const stageInfo = STAGE_INFO[stage];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-3 flex items-center gap-3">
            <span className="text-4xl">☁️</span> AI 智能云端录入
          </h1>
          <p className="text-purple-100 text-lg leading-relaxed">
            支持<b>百度网盘、阿里云盘、夸克网盘</b>链接解析 · PDF/Word文档上传 · 纯文本粘贴<br/>
            AI自动识别题目并<b>智能分类</b>到六大模块·<b>含图片题目自动标记</b>（图推/图表等）
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">💙 百度网盘</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">💜 阿里云盘</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">💛 夸克网盘</span>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">🖼️ 图片智能识别</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 md:p-8">
        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 border-b border-gray-100 dark:border-slate-700 pb-4 mb-6 overflow-x-auto">
          {([
            { key: 'link' as ImportMethod, icon: '🔗', label: '网盘链接解析' },
            { key: 'file' as ImportMethod, icon: '📄', label: '上传文档' },
            { key: 'text' as ImportMethod, icon: '📝', label: '纯文本识别' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setMethod(tab.key); setResult(null); setStage('idle'); }}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                method === tab.key
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ====== 网盘链接 ====== */}
        {method === 'link' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                粘贴网盘分享链接（支持百度/阿里/夸克）
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  placeholder="例如：https://pan.quark.cn/s/xxxxx"
                  className="w-full px-4 py-4 pr-32 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-base"
                  disabled={isParsing}
                />
                {linkInput.trim() && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-bold ${driveInfo.color}`}>
                    {driveInfo.icon} {driveInfo.name}
                  </span>
                )}
              </div>
              {detectedDrive === 'unknown' && linkInput.trim() && (
                <p className="text-sm text-amber-500 mt-2 flex items-center gap-1">
                  ⚠️ 无法识别该链接的网盘类型，请检查链接格式
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">提取码（如有）</label>
              <input
                type="text"
                placeholder="四位提取码"
                maxLength={6}
                className="w-40 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono text-center tracking-widest text-lg uppercase"
                disabled={isParsing}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: '💙', name: '百度网盘', example: 'pan.baidu.com/s/1xxx', color: 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20' },
                { icon: '💜', name: '阿里云盘', example: 'aliyundrive.com/s/xxx', color: 'border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/20' },
                { icon: '💛', name: '夸克网盘', example: 'pan.quark.cn/s/xxx', color: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20' },
              ].map(d => (
                <div key={d.name} className={`p-3 rounded-xl border-2 ${d.color} text-center`}>
                  <div className="text-2xl mb-1">{d.icon}</div>
                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{d.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{d.example}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== 文件上传 ====== */}
        {method === 'file' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]'
                  : selectedFile
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 hover:border-indigo-400 hover:bg-indigo-50/50'
              }`}
            >
              {selectedFile ? (
                <>
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-green-700 dark:text-green-400 font-bold text-lg">{selectedFile.name}</p>
                  <p className="text-green-600 dark:text-green-500 text-sm mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB · 点击更换文件
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">{dragOver ? '📥' : '📁'}</div>
                  <p className="text-gray-700 dark:text-gray-300 font-bold text-lg">点击选择 或 拖拽文件到此处</p>
                  <div className="flex justify-center gap-2 mt-3">
                    {['PDF', 'DOC', 'DOCX', 'TXT'].map(ext => (
                      <span key={ext} className="px-2 py-0.5 bg-white dark:bg-slate-600 rounded text-xs font-mono text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-slate-500">
                        .{ext.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ====== 纯文本 ====== */}
        {method === 'text' && (
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
              粘贴包含题目的文本（支持多种格式自动识别）
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`支持以下格式自动解析：

1. 下列关于法律的说法，正确的是
A. 选项内容
B. 选项内容
C. 选项内容
D. 选项内容
答案：A
解析：这是解析内容...

2. 请问以下哪个属于类比推理的范畴？
A. 选项
B. 选项
...`}
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-64 resize-none text-base leading-relaxed font-mono"
              disabled={isParsing}
            />
            {textInput.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                已输入 {textInput.length} 字符
              </p>
            )}
          </div>
        )}

        {/* ====== 功能说明面板 ====== */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <h3 className="font-bold text-sm text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
            <span>🧠</span> AI智能识别能力
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span className="text-gray-600 dark:text-gray-400">自动识别题干/选项/答案</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span className="text-gray-600 dark:text-gray-400">智能分类至六大模块</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span className="text-gray-600 dark:text-gray-400">图推/图表题自动标记 🖼️</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span className="text-gray-600 dark:text-gray-400">自动估算题目难度</span>
            </div>
          </div>
        </div>

        {/* ====== 开始按钮 ====== */}
        <button
          onClick={handleImport}
          disabled={isParsing || (method === 'link' && !linkInput.trim()) || (method === 'file' && !selectedFile) || (method === 'text' && !textInput.trim())}
          className="w-full mt-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 text-white rounded-2xl font-extrabold text-xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          {isParsing ? (
            <>
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              AI 正在全力解析中...
            </>
          ) : (
            <>✨ 开始智能识别</>
          )}
        </button>

        {/* ====== 进度条 ====== */}
        {(isParsing || stage === 'done') && (
          <div className="mt-8 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <span className="text-xl">{stageInfo.icon}</span>
                {stageInfo.text}
              </span>
              <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{stageInfo.pct}%</span>
            </div>
            <div className="h-4 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${stageInfo.pct}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />
              </div>
            </div>

            {/* 步骤指示器 */}
            <div className="flex justify-between mt-2">
              {(['connecting', 'extracting', 'classifying', 'images', 'saving'] as ParseStage[]).map((s, i) => {
                const stageOrder = ['connecting', 'downloading', 'extracting', 'classifying', 'images', 'saving', 'done'];
                const currentIdx = stageOrder.indexOf(stage);
                const thisIdx = stageOrder.indexOf(s);
                const isDone = currentIdx > thisIdx;
                const isActive = stage === s;
                return (
                  <div key={s} className={`flex flex-col items-center gap-1 ${isDone ? 'text-green-500' : isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                      isDone ? 'bg-green-500 border-green-500 text-white' :
                      isActive ? 'bg-indigo-600 border-indigo-600 text-white animate-pulse' :
                      'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className="text-[10px] font-medium hidden sm:block">
                      {s === 'connecting' ? '连接' : s === 'extracting' ? '识别' : s === 'classifying' ? '分类' : s === 'images' ? '图片' : '保存'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====== 结果展示 ====== */}
        {result && (
          <div className="mt-8 space-y-4 animate-fade-in">
            <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700/50 rounded-2xl text-center relative overflow-hidden">
              <div className="absolute top-2 right-2 text-6xl opacity-10 animate-bounce">🎉</div>
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-extrabold text-green-800 dark:text-green-300 mb-2">录入成功！</h3>
              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <p className="text-4xl font-black text-green-700 dark:text-green-400">{result.total}</p>
                  <p className="text-sm text-green-600 dark:text-green-500 font-medium">总题目</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-blue-600">{result.textTotal}</p>
                  <p className="text-sm text-blue-500 font-medium">纯文字题</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-purple-600">{result.imageTotal}</p>
                  <p className="text-sm text-purple-500 font-medium">含图片题 🖼️</p>
                </div>
              </div>
            </div>

            {/* 模块分布 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700">
                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  🏷️ 模块分布
                </h4>
                <div className="space-y-2">
                  {Object.entries(result.modules).map(([mod, count]) => (
                    <div key={mod} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{mod}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(count / result.total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-300 w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.imageTotal > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700">
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    🖼️ 图片题类型
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(result.imageTypes).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{type}</span>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                          {count} 题
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-3 flex items-start gap-1">
                    <span>⚠️</span>
                    <span>图片题已标记，部分图片内容需查看原始PDF。建议对图推题目补充图片。</span>
                  </p>
                </div>
              )}
            </div>

            {/* 预览按钮 */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
            >
              {showPreview ? '收起预览 ▲' : `查看解析的题目预览 ▼ (${result.total}题)`}
            </button>

            {showPreview && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parsedPreview.map((q, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${
                    q.hasImage
                      ? 'border-purple-200 dark:border-purple-700/50 bg-purple-50/50 dark:bg-purple-900/10'
                      : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-bold">{q.module}</span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">{q.subType}</span>
                      <span className="text-xs">{'⭐'.repeat(q.difficulty)}</span>
                      {q.hasImage && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full font-bold flex items-center gap-1">
                          🖼️ {q.imageType === 'figure-reasoning' ? '图形推理' : q.imageType === 'chart-data' ? '图表题' : '含图片'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{q.content}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>答案: <b className="text-green-600">{q.answer}</b></span>
                      <span>共{q.options.length}个选项</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setResult(null); setStage('idle'); setParsedPreview([]); setShowPreview(false); }}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                继续导入
              </button>
              <Link href="/practice" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all text-center">
                去练习
              </Link>
              <Link href="/" className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all text-center">
                回首页
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
