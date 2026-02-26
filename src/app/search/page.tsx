'use client';

import { useState, useEffect, useRef } from 'react';
import { searchQuestions, getAllQuestions, getQuestionsByModule } from '@/data';
import { Question, Module } from '@/types';
import Link from 'next/link';

const ALL_MODULES: Module[] = ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析', '政治理论'];

export default function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Question[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    let found = keyword.trim() ? searchQuestions(keyword.trim()) : getAllQuestions();
    if (selectedModule) {
      found = found.filter(q => q.module === selectedModule);
    }
    if (difficulty) {
      found = found.filter(q => q.difficulty === difficulty);
    }
    setResults(found);
    setSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = () => {
    setKeyword('');
    setSelectedModule(null);
    setDifficulty(null);
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">🔍 搜索题目</h1>
        <p className="text-sm opacity-80 mt-1">输入关键词搜索题库中的所有题目</p>

        {/* Search bar */}
        <div className="mt-4 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入关键词，如：宪法、比例、类比..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/20 backdrop-blur text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors"
          >
            搜索
          </button>
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_MODULES.map(m => (
            <button
              key={m}
              onClick={() => setSelectedModule(selectedModule === m ? null : m)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedModule === m ? 'bg-white text-blue-600' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {m}
            </button>
          ))}
          <span className="text-white/40 mx-1">|</span>
          {[1, 2, 3].map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                difficulty === d ? 'bg-white text-blue-600' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {d === 1 ? '简单' : d === 2 ? '中等' : '困难'}
            </button>
          ))}
          {(selectedModule || difficulty || keyword) && (
            <button onClick={clearFilters} className="px-3 py-1 rounded-full text-xs bg-red-400/30 text-white hover:bg-red-400/50">
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {results.length > 0 ? `找到 ${results.length} 道题目` : '无搜索结果'}
            </h3>
          </div>
          <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
            {results.slice(0, 100).map((q, i) => (
              <div key={q.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-bold text-slate-400 mt-0.5 w-6 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">{q.module}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500">{q.subType}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        q.difficulty === 1 ? 'bg-green-50 text-green-600' :
                        q.difficulty === 2 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {q.difficulty === 1 ? '简单' : q.difficulty === 2 ? '中等' : '困难'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                      {q.content}
                    </p>
                    {expandedId === q.id && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
                        <p className="text-slate-700 whitespace-pre-line mb-2">{q.content}</p>
                        <div className="space-y-1 mb-3">
                          {q.options.map(opt => (
                            <p key={opt.key} className={`${opt.key === q.answer ? 'text-green-600 font-bold' : 'text-slate-600'}`}>
                              {opt.key}. {opt.text}
                            </p>
                          ))}
                        </div>
                        <p className="text-green-700 font-medium">正确答案: {q.answer}</p>
                        <p className="text-slate-500 mt-1 text-xs">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {results.length > 100 && (
              <p className="text-center py-3 text-sm text-slate-400">仅显示前100条结果</p>
            )}
          </div>
        </div>
      )}

      {/* Hot tags */}
      {!searched && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="font-semibold mb-3">🔥 热门搜索</h3>
          <div className="flex flex-wrap gap-2">
            {['宪法', '比例问题', '类比推理', '逻辑判断', '增长率', '排列组合', '成语', '科技常识', '马克思主义', '行程问题'].map(tag => (
              <button
                key={tag}
                onClick={() => { setKeyword(tag); }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg text-sm transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
