'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getAuthState, isAdmin as checkIsAdmin, logout, ensureAdminExists } from '@/lib/auth';
import { User } from '@/types';
import { useTheme } from '@/components/ThemeProvider';

const mainNav = [
  { href: '/', icon: '🏠', label: '首页' },
  { href: '/practice', icon: '📝', label: '智能刷题' },
  { href: '/mock', icon: '📋', label: '模拟考试' },
  { href: '/special', icon: '🎯', label: '专项突破' },
  { href: '/speed', icon: '⚡', label: '限时速刷' },
  { href: '/pk', icon: '⚔️', label: '在线PK' },
  { href: '/search', icon: '🔍', label: '搜索题目' },
];

const toolNav = [
  { href: '/mistakes', icon: '❌', label: '错题本' },
  { href: '/favorites', icon: '⭐', label: '收藏夹' },
  { href: '/checkin', icon: '🔥', label: '每日打卡' },
  { href: '/study-plan', icon: '📅', label: '学习计划' },
  { href: '/exam-calendar', icon: '🗓️', label: '考试日历' },
  { href: '/analytics', icon: '📊', label: '数据分析' },
  { href: '/methods', icon: '📚', label: '学习方法' },
  { href: '/ai', icon: '🤖', label: 'AI辅导' },
  { href: '/leaderboard', icon: '🏆', label: '排行榜' },
  { href: '/workshop', icon: '🛠️', label: '创意工坊' },
  { href: '/community', icon: '💬', label: '学习社区' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    ensureAdminExists();
    const auth = getAuthState();
    setCurrentUser(auth.currentUser);
    setIsAdminUser(checkIsAdmin());
  }, [pathname]); // recalculate on route change

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setIsAdminUser(false);
  };

  const renderNavItem = (item: { href: string; icon: string; label: string }) => {
    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => { if (window.innerWidth < 1024) setCollapsed(true); }}
        className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors
          ${isActive
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-blue-500'
          }
        `}
      >
        <span className="text-lg flex-shrink-0">{item.icon}</span>
        {!collapsed && <span className="text-sm">{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setCollapsed(!collapsed)} className="text-xl text-slate-600 dark:text-slate-300 p-1">
          ☰
        </button>
        <h1 className="text-lg font-bold text-blue-600">📘 考公行测题库</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="text-lg p-1">
            {resolvedTheme === 'dark' ? '☀️' : '🌙'}
          </button>
          {currentUser ? (
            <span className="text-lg">{currentUser.avatar}</span>
          ) : (
            <Link href="/auth" className="text-sm text-blue-600">登录</Link>
          )}
        </div>
      </div>

      {/* Mobile backdrop */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex flex-col transition-all duration-300
          ${collapsed ? 'w-16 max-lg:-translate-x-full' : 'w-56 max-lg:translate-x-0'}
          lg:translate-x-0
          ${collapsed ? 'lg:w-16' : 'lg:w-56'}
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <span className="text-2xl">📘</span>
          {!collapsed && <h1 className="text-lg font-bold text-blue-600 whitespace-nowrap">考公行测题库</h1>}
        </div>

        {/* User info or login prompt */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            {currentUser ? (
              <Link href="/profile" className="flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg p-1 -m-1 transition-colors">
                <div className="relative">
                  <span className="text-2xl">{currentUser.avatar}</span>
                  {currentUser.vipLevel === 'vvvvip' && (
                    <span className="absolute -top-1 -right-2 text-[8px] bg-gradient-to-r from-amber-400 to-red-500 text-white font-black px-1 rounded-full">V4</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{currentUser.nickname}</p>
                  <p className="text-xs text-slate-400">
                    {currentUser.uid || ''} · {currentUser.role === 'admin' ? '🛡️ 管理员' : '📝 学员'}
                  </p>
                </div>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <span>👤</span> 登录 / 注册
              </Link>
            )}
          </div>
        )}

        {/* Main Nav */}
        <nav className="flex-1 py-3 overflow-y-auto space-y-0.5">
          {!collapsed && <p className="px-6 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">学习</p>}
          {mainNav.map(renderNavItem)}

          {!collapsed && <p className="px-6 py-1 mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">工具</p>}
          {toolNav.map(renderNavItem)}

          {/* Admin entry - only show for admin or as link to login */}
          {!collapsed && <p className="px-6 py-1 mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">管理</p>}
          {isAdminUser ? (
            renderNavItem({ href: '/admin', icon: '🛡️', label: '后台管理' })
          ) : (
            renderNavItem({ href: '/admin/login', icon: '🔒', label: '管理员登录' })
          )}
          {renderNavItem({ href: '/settings', icon: '⚙️', label: '系统设置' })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-100 dark:border-slate-700">
          {!collapsed && (
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span>{resolvedTheme === 'dark' ? '☀️' : '🌙'}</span>
              {resolvedTheme === 'dark' ? '切换亮色' : '切换暗色'}
            </button>
          )}
          {!collapsed && currentUser && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span>🚪</span> 退出登录
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center p-3 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-900"
          >
            {collapsed ? '→' : '← 收起'}
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`} />
    </>
  );
}
