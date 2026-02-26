'use client';

import { useState } from 'react';

interface ExamEvent {
  id: string;
  name: string;
  date: string;
  type: '国考' | '省考' | '事业单位' | '选调生' | '遴选' | '其他';
  region: string;
  description: string;
  registrationStart?: string;
  registrationEnd?: string;
  link?: string;
}

const EXAM_EVENTS: ExamEvent[] = [
  {
    id: '1', name: '2026年国家公务员考试（笔试）', date: '2025-12-01',
    type: '国考', region: '全国', description: '中央机关及其直属机构考试录用公务员笔试',
    registrationStart: '2025-10-15', registrationEnd: '2025-10-25',
    link: 'http://bm.scs.gov.cn',
  },
  {
    id: '2', name: '2026年国考面试', date: '2026-03-01',
    type: '国考', region: '全国', description: '国家公务员考试面试阶段',
  },
  {
    id: '3', name: '2026年多省联考笔试', date: '2026-03-22',
    type: '省考', region: '多省', description: '全国多省份同日举行公务员考试笔试',
    registrationStart: '2026-01-15', registrationEnd: '2026-02-15',
  },
  {
    id: '4', name: '2026年北京市考', date: '2026-03-15',
    type: '省考', region: '北京', description: '北京市各级机关公务员招录考试',
    registrationStart: '2026-01-10', registrationEnd: '2026-01-20',
  },
  {
    id: '5', name: '2026年上海市考', date: '2026-01-11',
    type: '省考', region: '上海', description: '上海市公务员招录考试',
  },
  {
    id: '6', name: '2026年广东省考', date: '2026-03-29',
    type: '省考', region: '广东', description: '广东省公务员考试笔试',
    registrationStart: '2026-02-01', registrationEnd: '2026-02-10',
  },
  {
    id: '7', name: '2026年浙江省考', date: '2026-03-22',
    type: '省考', region: '浙江', description: '浙江省公务员招录考试',
  },
  {
    id: '8', name: '2026年江苏省考', date: '2026-03-29',
    type: '省考', region: '江苏', description: '江苏省公务员招录考试',
  },
  {
    id: '9', name: '2026年上半年事业单位联考', date: '2026-05-10',
    type: '事业单位', region: '全国', description: '全国事业单位公开招聘分类考试',
    registrationStart: '2026-03-20', registrationEnd: '2026-04-10',
  },
  {
    id: '10', name: '2026年中央选调生考试', date: '2026-01-15',
    type: '选调生', region: '全国', description: '中央机关选调优秀大学毕业生',
  },
  {
    id: '11', name: '2026年下半年事业单位联考', date: '2026-10-17',
    type: '事业单位', region: '全国', description: '下半年全国事业单位招聘考试',
  },
  {
    id: '12', name: '2026年中央遴选', date: '2026-09-20',
    type: '遴选', region: '全国', description: '中央机关公开遴选公务员考试',
  },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  '国考': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
  '省考': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  '事业单位': { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500' },
  '选调生': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
  '遴选': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
  '其他': { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-500' },
};

export default function ExamCalendarPage() {
  const [filterType, setFilterType] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const filtered = EXAM_EVENTS
    .filter(e => !filterType || e.type === filterType)
    .sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = filtered.filter(e => e.date >= today);
  const past = filtered.filter(e => e.date < today);

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - new Date(today).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const nextExam = upcoming[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero with countdown */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">🗓️ 考试日历</h1>
        <p className="text-sm opacity-80 mt-1">掌握考试时间节点，合理安排备考进度</p>

        {nextExam && (
          <div className="mt-4 bg-white/20 backdrop-blur rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-70">距离下一场考试</p>
              <p className="font-bold mt-0.5">{nextExam.name}</p>
              <p className="text-xs opacity-70 mt-0.5">{nextExam.date}</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black">{daysUntil(nextExam.date)}</p>
              <p className="text-xs opacity-70">天</p>
            </div>
          </div>
        )}
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${!filterType ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
        >
          全部
        </button>
        {Object.keys(TYPE_COLORS).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(filterType === type ? null : type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filterType === type
                ? `${TYPE_COLORS[type].bg} ${TYPE_COLORS[type].text} ring-2 ring-current`
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Upcoming exams */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-700">📌 即将到来（{upcoming.length}场）</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {upcoming.map(exam => {
              const days = daysUntil(exam.date);
              const colors = TYPE_COLORS[exam.type];
              const isExpanded = expandedId === exam.id;
              return (
                <div key={exam.id} className="px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : exam.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${colors.bg} ${colors.text}`}>{exam.type}</span>
                        <span className="text-xs text-slate-400">{exam.region}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mt-0.5">{exam.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-700">{exam.date}</p>
                      <p className={`text-xs font-medium ${days <= 30 ? 'text-red-500' : days <= 90 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {days <= 0 ? '今天' : `${days}天后`}
                      </p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 ml-5 p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                      <p className="text-slate-600">{exam.description}</p>
                      {exam.registrationStart && (
                        <p className="text-slate-500">📝 报名时间: {exam.registrationStart} ~ {exam.registrationEnd}</p>
                      )}
                      {exam.link && (
                        <a href={exam.link} target="_blank" className="text-blue-500 hover:underline inline-block">🔗 官方报名入口</a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past exams */}
      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden opacity-60">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-500">已结束（{past.length}场）</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {past.map(exam => (
              <div key={exam.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[exam.type].dot} opacity-50`} />
                <p className="text-sm text-slate-500 flex-1 line-through">{exam.name}</p>
                <p className="text-xs text-slate-400">{exam.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400 pb-4">
        ⚠️ 考试时间仅供参考，以官方公告为准。建议定期关注各省人事考试网。
      </p>
    </div>
  );
}
