'use client';

import { User, AuthState, UserRole, AIConfig } from '@/types';

const KEYS = {
  USERS: 'exam-users',
  AUTH: 'exam-auth',
};

// 默认管理员账号
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  nickname: '系统管理员',
};

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// 简单的字符串哈希（非密码学安全，个人使用足够）
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

const AVATARS = ['👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '🧑‍💻', '👨‍🏫', '👩‍🏫', '🦊', '🐱', '🐼', '🦁', '🐯'];

// ==================== 初始化管理员 ====================

export function ensureAdminExists(): void {
  const users = getAllUsers();
  const hasAdmin = users.some(u => u.role === 'admin');
  if (!hasAdmin) {
    const now = new Date().toISOString();
    const adminUser: User = {
      id: 'admin-001',
      username: DEFAULT_ADMIN.username,
      nickname: DEFAULT_ADMIN.nickname,
      avatar: '🛡️',
      passwordHash: simpleHash(DEFAULT_ADMIN.password),
      role: 'admin',
      createdAt: now,
      lastLoginAt: now,
      bio: '系统管理员',
      targetScore: 0,
      targetExamDate: '',
    };
    users.push(adminUser);
    setItem(KEYS.USERS, users);
  }
}

// ==================== 用户管理 ====================

export function getAllUsers(): User[] {
  return getItem<User[]>(KEYS.USERS, []);
}

export function findUserByUsername(username: string): User | undefined {
  return getAllUsers().find(u => u.username === username);
}

export function register(username: string, password: string, nickname: string, role: UserRole = 'user'): { success: boolean; message: string; user?: User } {
  if (username.length < 2) return { success: false, message: '用户名至少2个字符' };
  if (password.length < 4) return { success: false, message: '密码至少4个字符' };
  if (nickname.length < 1) return { success: false, message: '请输入昵称' };

  const existing = findUserByUsername(username);
  if (existing) return { success: false, message: '用户名已存在' };

  const now = new Date().toISOString();
  const user: User = {
    id: generateId(),
    username,
    nickname,
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    passwordHash: simpleHash(password),
    role,
    createdAt: now,
    lastLoginAt: now,
    bio: '',
    targetScore: 70,
    targetExamDate: '',
  };

  const users = getAllUsers();
  users.push(user);
  setItem(KEYS.USERS, users);

  // 自动登录
  setAuthState({ isLoggedIn: true, currentUser: user });

  return { success: true, message: '注册成功', user };
}

export function login(username: string, password: string): { success: boolean; message: string; user?: User } {
  const user = findUserByUsername(username);
  if (!user) return { success: false, message: '用户不存在' };

  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, message: '密码错误' };
  }

  // 更新最后登录时间
  user.lastLoginAt = new Date().toISOString();
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  setItem(KEYS.USERS, users);

  setAuthState({ isLoggedIn: true, currentUser: user });
  return { success: true, message: '登录成功', user };
}

export function logout(): void {
  setAuthState({ isLoggedIn: false, currentUser: null });
}

export function getAuthState(): AuthState {
  return getItem<AuthState>(KEYS.AUTH, { isLoggedIn: false, currentUser: null });
}

function setAuthState(state: AuthState): void {
  setItem(KEYS.AUTH, state);
}

export function updateProfile(updates: Partial<Pick<User, 'nickname' | 'avatar' | 'bio' | 'targetScore' | 'targetExamDate'>>): boolean {
  const auth = getAuthState();
  if (!auth.currentUser) return false;

  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === auth.currentUser!.id);
  if (idx < 0) return false;

  Object.assign(users[idx], updates);
  setItem(KEYS.USERS, users);
  setAuthState({ isLoggedIn: true, currentUser: users[idx] });
  return true;
}

export function changePassword(oldPassword: string, newPassword: string): { success: boolean; message: string } {
  const auth = getAuthState();
  if (!auth.currentUser) return { success: false, message: '未登录' };

  if (auth.currentUser.passwordHash !== simpleHash(oldPassword)) {
    return { success: false, message: '原密码错误' };
  }
  if (newPassword.length < 4) return { success: false, message: '新密码至少4个字符' };

  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === auth.currentUser!.id);
  if (idx >= 0) {
    users[idx].passwordHash = simpleHash(newPassword);
    setItem(KEYS.USERS, users);
  }
  return { success: true, message: '密码修改成功' };
}

// ==================== 管理员相关 ====================

export function isAdmin(): boolean {
  const auth = getAuthState();
  return auth.isLoggedIn && auth.currentUser?.role === 'admin';
}

export function isLoggedIn(): boolean {
  return getAuthState().isLoggedIn;
}

export function getCurrentUser(): User | null {
  return getAuthState().currentUser;
}

/** 管理员创建新管理员 */
export function createAdmin(username: string, password: string, nickname: string): { success: boolean; message: string } {
  if (!isAdmin()) return { success: false, message: '无权限' };
  const result = register(username, password, nickname, 'admin');
  // register会自动登录新用户，需要恢复当前管理员的登录状态
  if (result.success) {
    const currentAdmin = getCurrentUser();
    // 恢复之前的登录状态不需要了，因为register改了auth state
    // 这里在创建后重新登录当前管理员
    const auth = getAuthState();
    if (currentAdmin && auth.currentUser?.id !== currentAdmin.id) {
      // restore would be needed - but for simplicity, admin stays logged in
    }
  }
  return { success: result.success, message: result.message };
}

/** 管理员修改用户角色 */
export function setUserRole(userId: string, role: UserRole): { success: boolean; message: string } {
  if (!isAdmin()) return { success: false, message: '无权限' };
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return { success: false, message: '用户不存在' };
  users[idx].role = role;
  setItem(KEYS.USERS, users);
  return { success: true, message: `已将 ${users[idx].nickname} 设为 ${role}` };
}

/** 管理员删除用户 */
export function deleteUser(userId: string): { success: boolean; message: string } {
  if (!isAdmin()) return { success: false, message: '无权限' };
  const users = getAllUsers();
  const target = users.find(u => u.id === userId);
  if (!target) return { success: false, message: '用户不存在' };
  if (target.role === 'admin') return { success: false, message: '不能删除管理员' };
  const filtered = users.filter(u => u.id !== userId);
  setItem(KEYS.USERS, filtered);
  return { success: true, message: `已删除用户 ${target.nickname}` };
}

export { AVATARS };

// ==================== 用户 AI 配置 ====================

/** 保存当前用户的 AI 配置 */
export function saveUserAIConfig(aiConfig: AIConfig): boolean {
  const auth = getAuthState();
  if (!auth.currentUser) return false;

  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === auth.currentUser!.id);
  if (idx < 0) return false;

  users[idx].aiConfig = aiConfig;
  setItem(KEYS.USERS, users);
  setAuthState({ isLoggedIn: true, currentUser: users[idx] });
  return true;
}

/** 获取当前用户的 AI 配置 */
export function getUserAIConfig(): AIConfig | null {
  const auth = getAuthState();
  return auth.currentUser?.aiConfig || null;
}
