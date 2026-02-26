'use client';

import { useState } from 'react';
import { learningMethods } from '@/data/methods';
import { LearningMethod } from '@/types';

export default function MethodsPage() {
  const [selected, setSelected] = useState<LearningMethod | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">📚 学习方法中心</h1>
        <p className="text-sm text-slate-500 mt-1">13种科学学习方法，助你高效备考</p>
      </div>

      {/* Method Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {learningMethods.map(method => (
          <button
            key={method.id}
            onClick={() => setSelected(method)}
            className={`text-left bg-white rounded-xl p-5 border transition-all hover:shadow-md
              ${selected?.id === method.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-100'}
            `}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{method.icon}</span>
              <div>
                <h3 className="font-semibold text-slate-800">{method.name}</h3>
                <p className="text-xs text-slate-400">{method.englishName}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 line-clamp-2">{method.description}</p>
            <div className="flex flex-wrap gap-1 mt-3">
              {method.bestFor.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{selected.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{selected.name}</h2>
                <p className="text-blue-100">{selected.englishName}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">📋 方法说明</h3>
              <p className="text-sm leading-6 text-slate-600">{selected.description}</p>
            </div>

            {/* Steps */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">📝 实施步骤</h3>
              <div className="space-y-2">
                {selected.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-6 text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Best for */}
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">🎯 最适用场景</h3>
              <div className="flex flex-wrap gap-2">
                {selected.bestFor.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Application */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-purple-700 mb-2">💡 在本系统中的应用</h3>
              <p className="text-sm leading-6 text-purple-800">{selected.applicationInExam}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
