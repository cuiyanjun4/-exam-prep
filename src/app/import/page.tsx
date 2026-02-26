'use client';

import { useState, useEffect } from 'react';
import { Question, Module, SubType, Difficulty } from '@/types';
import { saveCustomQuestions } from '@/lib/storage';

type ImportMethod = 'link' | 'file' | 'text';

export default function ImportPage() {
  const [method, setMethod] = useState<ImportMethod>('link');
  const [inputValue, setInputValue] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);

  const handleImport = () => {
    if (!inputValue.trim() && method !== 'file') return;
    
    setIsParsing(true);
    setProgress(0);
    setResult(null);

    const steps = [
      { p: 10, text: '正在连接云端服务器...' },
      { p: 30, text: '正在提取文档内容...' },
      { p: 50, text: 'AI正在识别题干与选项...' },
      { p: 70, text: '正在解析正确答案与解析...' },
      { p: 90, text: '正在格式化并校验数据...' },
      { p: 100, text: '录入完成！' },
    ];

    let currentStep = 0;
    
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setStatusText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsParsing(false);
        
        // Simulate generating some questions
        const mockQuestions: Question[] = Array.from({ length: Math.floor(Math.random() * 10) + 5 }).map((_, i) => ({
          id: `custom-${Date.now()}-${i}`,
          module: '常识判断' as Module,
          subType: '科技' as SubType,
          difficulty: 3 as Difficulty,
          tags: ['AI生成', '云端导入'],
          content: `[AI智能生成] 这是从您的${method === 'link' ? '网盘链接' : method === 'file' ? '文件' : '文本'}中提取的第 ${i + 1} 道题目。请问以下哪个选项是正确的？`,
          options: [
            { key: 'A', text: '选项 A' },
            { key: 'B', text: '选项 B' },
            { key: 'C', text: '选项 C' },
            { key: 'D', text: '选项 D' }
          ],
          answer: 'A',
          explanation: '这是AI自动生成的解析。根据文档内容，A选项符合题意。',
          source: '云端智能导入'
        }));

        saveCustomQuestions(mockQuestions);
        setResult({ success: true, count: mockQuestions.length });
        setInputValue('');
      }
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <span className="text-4xl">☁️</span> AI 智能云端录入
          </h1>
          <p className="text-indigo-100 text-lg">
            支持一键解析网盘资料、PDF/Word文档或纯文本，AI自动提取题目并录入题库。
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-100 pb-4 mb-6">
          <button
            onClick={() => setMethod('link')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${method === 'link' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            🔗 网盘链接解析
          </button>
          <button
            onClick={() => setMethod('file')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${method === 'file' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📄 上传文档 (PDF/Word)
          </button>
          <button
            onClick={() => setMethod('text')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${method === 'text' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            📝 纯文本识别
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          {method === 'link' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">输入百度网盘/阿里云盘分享链接</label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="例如：https://pan.baidu.com/s/1xxxx 提取码: xxxx"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                disabled={isParsing}
              />
            </div>
          )}

          {method === 'file' && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-gray-50">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-600 font-medium">点击或拖拽文件到此处上传</p>
              <p className="text-gray-400 text-sm mt-1">支持 .pdf, .doc, .docx, .txt 格式</p>
            </div>
          )}

          {method === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">粘贴包含题目的文本</label>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="1. 以下哪个是... A. ... B. ... C. ... D. ... 答案：A 解析：..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-48 resize-none"
                disabled={isParsing}
              />
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleImport}
            disabled={isParsing || (!inputValue.trim() && method !== 'file')}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isParsing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI 正在识别中...
              </>
            ) : (
              '✨ 开始智能识别'
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {isParsing && (
          <div className="mt-8 space-y-2">
            <div className="flex justify-between text-sm font-medium text-indigo-600">
              <span>{statusText}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 bg-indigo-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 p-6 bg-green-50 border border-green-100 rounded-xl text-center animate-fade-in">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-green-800 mb-1">录入成功！</h3>
            <p className="text-green-600">
              AI 成功识别并录入了 <span className="font-bold text-2xl mx-1">{result.count}</span> 道题目。
            </p>
            <p className="text-sm text-green-500 mt-2">这些题目已自动加入您的专属题库，可在练习中随机抽取。</p>
          </div>
        )}
      </div>
    </div>
  );
}
