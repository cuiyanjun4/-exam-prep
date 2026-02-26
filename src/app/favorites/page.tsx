'use client';

import { useState, useEffect } from 'react';
import { getFavorites } from '@/lib/storage';
import { getQuestionsByIds } from '@/data';
import { Question, Module } from '@/types';
import { getBoxCounts } from '@/lib/leitner';
import { getReviewCards } from '@/lib/storage';
import Link from 'next/link';

export default function FavoritesPage() {
  const [favQuestions, setFavQuestions] = useState<Question[]>([]);
  const [boxCounts, setBoxCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const ids = getFavorites();
    setFavQuestions(getQuestionsByIds(ids));
    const cards = getReviewCards();
    const favCards = cards.filter(c => ids.includes(c.questionId));
    setBoxCounts(getBoxCounts(favCards));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">⭐ 收藏夹</h1>
        <span className="text-sm text-slate-500">共 {favQuestions.length} 道收藏</span>
      </div>

      {/* Leitner Boxes */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-600 mb-3">📦 莱特纳系统 - 收藏题复习盒</h2>
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(box => (
            <div key={box} className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Box {box}</p>
              <p className="text-xl font-bold text-slate-700">{boxCounts[box]}</p>
              <p className="text-xs text-slate-400">
                {box === 1 ? '每天' : box === 2 ? '每2天' : box === 3 ? '每4天' : box === 4 ? '每7天' : '每14天'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Favorites list */}
      {favQuestions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <p className="text-4xl mb-3">☆</p>
          <p className="text-lg font-medium text-slate-600">还没有收藏题目</p>
          <p className="text-sm text-slate-400 mt-1">做题时点击 ⭐ 可以收藏好题</p>
          <Link href="/practice" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            去做题
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favQuestions.map(q => {
            const isExpanded = expandedId === q.id;

            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{q.module}</span>
                        <span className="px-2 py-0.5 bg-slate-50 text-slate-600 text-xs rounded-full">{q.subType}</span>
                        <span className="text-xs text-amber-500">{'⭐'.repeat(q.difficulty)}</span>
                      </div>
                      <p className="text-sm line-clamp-2">{q.content}</p>
                    </div>
                    <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                    <div className="space-y-1">
                      {q.options.map(opt => (
                        <p
                          key={opt.key}
                          className={`text-sm px-3 py-1.5 rounded ${opt.key === q.answer ? 'bg-green-100 text-green-800 font-medium' : ''}`}
                        >
                          {opt.key}. {opt.text}
                        </p>
                      ))}
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">正确答案：{q.answer}</p>
                      <p className="text-sm leading-6 whitespace-pre-wrap">{q.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
