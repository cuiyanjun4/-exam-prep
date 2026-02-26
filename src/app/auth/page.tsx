'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register, AVATARS, resetPasswordByUsername, findUserByUsername } from '@/lib/auth';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Forgot password fields
  const [forgotUsername, setForgotUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'login') {
      const result = login(username, password);
      if (result.success) {
        setSuccess('登录成功！正在跳转...');
        setTimeout(() => router.push('/'), 500);
      } else {
        setError(result.message);
      }
    } else if (mode === 'register') {
      const result = register(username, password, nickname);
      if (result.success) {
        setSuccess('注册成功！正在跳转...');
        setTimeout(() => router.push('/'), 500);
      } else {
        setError(result.message);
      }
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!forgotUsername) { setError('请输入用户名'); return; }
    if (!newPassword || newPassword.length < 4) { setError('新密码至少4个字符'); return; }
    if (newPassword !== confirmPassword) { setError('两次输入的密码不一致'); return; }

    const user = findUserByUsername(forgotUsername);
    if (!user) { setError('用户不存在'); return; }

    // 安全验证：用户名 + 注册日期的月份和日期
    const createdDate = new Date(user.createdAt);
    const expectedAnswer = `${String(createdDate.getMonth() + 1).padStart(2, '0')}${String(createdDate.getDate()).padStart(2, '0')}`;
    if (securityAnswer !== expectedAnswer) {
      setError('安全验证失败：注册日期不正确');
      return;
    }

    const result = resetPasswordByUsername(forgotUsername, newPassword);
    if (result.success) {
      setSuccess('密码重置成功！请使用新密码登录');
      setTimeout(() => { setMode('login'); setUsername(forgotUsername); }, 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📘</div>
          <h1 className="text-3xl font-bold text-slate-800">考公行测题库</h1>
          <p className="text-slate-500 mt-2">智能学习提分系统</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Tab Switch */}
          <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'login' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'register' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              注册
            </button>
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'forgot' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              找回密码
            </button>
          </div>

          {mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-sm text-slate-500 bg-blue-50 rounded-lg p-3 mb-2">
                💡 请输入用户名和注册日期（月日4位数字，如0715）进行身份验证
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                <input type="text" value={forgotUsername} onChange={e => setForgotUsername(e.target.value)} placeholder="输入要找回的用户名"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">安全验证 - 注册日期（月日）</label>
                <input type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} placeholder="例如: 0715 (7月15日)"
                  maxLength={4} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少4个字符"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">确认新密码</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入新密码"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" required />
              </div>
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">❌ {error}</div>}
              {success && <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">✅ {success}</div>}
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                重置密码
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="输入用户名"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="输入昵称"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="输入密码"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择头像</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(avatar => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`text-2xl p-2 rounded-lg transition-all ${
                        selectedAvatar === avatar
                          ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                ✅ {success}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              {mode === 'login' ? '登录' : '注册'}
            </button>
          </form>
          )}

          {/* Guest mode */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              游客模式进入 →
            </button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          数据保存在本地浏览器中，请勿清除浏览器数据
        </p>
      </div>
    </div>
  );
}
