'use client';

import { useState, useEffect, useRef } from 'react';
import { getSettings, setSettings, exportAllData, importAllData, clearAllData, defaultSettings } from '@/lib/storage';
import { AppSettings, AIProvider } from '@/types';
import { PROVIDER_MODELS, PROVIDER_LABELS } from '@/lib/ai';

const providers: AIProvider[] = ['openai', 'anthropic', 'tongyi', 'wenxin', 'deepseek', 'zhipu', 'moonshot', 'custom'];

export default function SettingsPage() {
  const [settings, setLocalSettings] = useState<AppSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSettings(getSettings());
  }, []);

  const handleSave = () => {
    setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-prep-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = importAllData(text);
      if (success) {
        setImportStatus('✅ 数据导入成功！');
        setLocalSettings(getSettings());
      } else {
        setImportStatus('❌ 导入失败，文件格式不正确');
      }
      setTimeout(() => setImportStatus(''), 3000);
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    clearAllData();
    setLocalSettings(defaultSettings);
    setShowClearConfirm(false);
  };

  const updateAI = (field: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      aiConfig: { ...prev.aiConfig, [field]: value }
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold">⚙️ 设置</h1>

      {/* AI Configuration */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-700">🤖 AI 模型配置</h2>
        
        {/* Provider */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">选择 AI 服务商</label>
          <div className="grid grid-cols-5 gap-2">
            {providers.map(p => (
              <button
                key={p}
                onClick={() => {
                  const models = PROVIDER_MODELS[p];
                  updateAI('provider', p);
                  if (models.length > 0) updateAI('model', models[0].value);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${settings.aiConfig.provider === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">API Key</label>
          <input
            type="password"
            value={settings.aiConfig.apiKey}
            onChange={e => updateAI('apiKey', e.target.value)}
            placeholder="输入你的 API Key..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          />
          <p className="text-xs text-slate-400 mt-1">
            {settings.aiConfig.provider === 'openai' && '从 platform.openai.com 获取'}
            {settings.aiConfig.provider === 'tongyi' && '从 dashscope.console.aliyun.com 获取'}
            {settings.aiConfig.provider === 'wenxin' && '从 console.bce.baidu.com 获取'}
            {settings.aiConfig.provider === 'deepseek' && '从 platform.deepseek.com 获取'}
            {settings.aiConfig.provider === 'custom' && '使用您自定义API的Key'}
          </p>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm text-slate-600 mb-1">模型选择</label>
          <select
            value={settings.aiConfig.model}
            onChange={e => updateAI('model', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          >
            {PROVIDER_MODELS[settings.aiConfig.provider].map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Custom API URL */}
        {settings.aiConfig.provider === 'custom' && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">自定义 API 地址</label>
            <input
              type="text"
              value={settings.aiConfig.apiUrl || ''}
              onChange={e => updateAI('apiUrl', e.target.value)}
              placeholder="https://your-api.com/v1/chat/completions"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
          </div>
        )}
      </div>

      {/* Practice Settings */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-700">📝 做题设置</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">每轮题目数</label>
            <input
              type="number"
              value={settings.questionsPerSession}
              onChange={e => setLocalSettings(prev => ({ ...prev, questionsPerSession: Number(e.target.value) }))}
              min={5}
              max={100}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">显示计时器</label>
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, showTimer: !prev.showTimer }))}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${settings.showTimer ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {settings.showTimer ? '开启' : '关闭'}
            </button>
          </div>
        </div>
      </div>

      {/* Pomodoro Settings */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-700">🍅 番茄钟设置</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">工作时长（分钟）</label>
            <input
              type="number"
              value={settings.pomodoroWorkMinutes}
              onChange={e => setLocalSettings(prev => ({ ...prev, pomodoroWorkMinutes: Number(e.target.value) }))}
              min={10}
              max={60}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">休息时长（分钟）</label>
            <input
              type="number"
              value={settings.pomodoroBreakMinutes}
              onChange={e => setLocalSettings(prev => ({ ...prev, pomodoroBreakMinutes: Number(e.target.value) }))}
              min={1}
              max={30}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Speed Mode Settings */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-700">⚡ 限时速刷设置</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">默认每题限时（秒）</label>
            <input
              type="number"
              value={settings.speedMode.defaultTimePerQuestion}
              onChange={e => setLocalSettings(prev => ({
                ...prev,
                speedMode: { ...prev.speedMode, defaultTimePerQuestion: Number(e.target.value) }
              }))}
              min={10}
              max={300}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">显示倒计时</label>
            <button
              onClick={() => setLocalSettings(prev => ({
                ...prev,
                speedMode: { ...prev.speedMode, showCountdown: !prev.speedMode.showCountdown }
              }))}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium ${settings.speedMode.showCountdown ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {settings.speedMode.showCountdown ? '开启' : '关闭'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">时间到声音提醒</label>
          <button
            onClick={() => setLocalSettings(prev => ({
              ...prev,
              speedMode: { ...prev.speedMode, soundAlert: !prev.speedMode.soundAlert }
            }))}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${settings.speedMode.soundAlert ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}
          >
            {settings.speedMode.soundAlert ? '🔔 开启' : '🔕 关闭'}
          </button>
        </div>
      </div>

      {/* Flow Guide Settings */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-700">🌊 心流引导设置</h2>
        <div className="mb-3">
          <label className="block text-sm text-slate-600 mb-1">启用心流引导</label>
          <button
            onClick={() => setLocalSettings(prev => ({
              ...prev,
              flowGuide: { ...prev.flowGuide, enabled: !prev.flowGuide.enabled }
            }))}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${settings.flowGuide.enabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}
          >
            {settings.flowGuide.enabled ? '✅ 已启用' : '关闭'}
          </button>
          <p className="text-xs text-slate-400 mt-1">基于心流理论，按热身→专注→挑战→复盘四阶段引导刷题节奏</p>
        </div>
        {settings.flowGuide.enabled && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">热身时长（分钟）</label>
              <input
                type="number"
                value={settings.flowGuide.warmupMinutes}
                onChange={e => setLocalSettings(prev => ({
                  ...prev,
                  flowGuide: { ...prev.flowGuide, warmupMinutes: Number(e.target.value) }
                }))}
                min={2}
                max={15}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">专注时长（分钟）</label>
              <input
                type="number"
                value={settings.flowGuide.focusMinutes}
                onChange={e => setLocalSettings(prev => ({
                  ...prev,
                  flowGuide: { ...prev.flowGuide, focusMinutes: Number(e.target.value) }
                }))}
                min={10}
                max={45}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">休息时长（分钟）</label>
              <input
                type="number"
                value={settings.flowGuide.breakMinutes}
                onChange={e => setLocalSettings(prev => ({
                  ...prev,
                  flowGuide: { ...prev.flowGuide, breakMinutes: Number(e.target.value) }
                }))}
                min={3}
                max={15}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 space-y-4">
        <h2 className="font-semibold text-slate-700">💾 数据管理</h2>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            📤 导出数据
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            📥 导入数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            🗑️ 清除所有数据
          </button>
        </div>

        {importStatus && (
          <p className="text-sm font-medium">{importStatus}</p>
        )}

        {showClearConfirm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">⚠️ 确定要清除所有数据吗？此操作不可撤销！</p>
            <div className="flex gap-2 mt-3">
              <button onClick={handleClear} className="px-4 py-1.5 bg-red-600 text-white rounded text-sm">
                确认删除
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded text-sm">
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          保存设置
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✅ 已保存</span>}
      </div>
    </div>
  );
}
