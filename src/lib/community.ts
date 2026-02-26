'use client';

import { CommunityPost, Comment } from '@/types';

const KEYS = {
  POSTS: 'exam-community-posts',
  COMMENTS: 'exam-community-comments',
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ==================== 帖子管理 ====================

export function getPosts(): CommunityPost[] {
  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []);
  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPostById(id: string): CommunityPost | undefined {
  return getPosts().find(p => p.id === id);
}

export function getPostsByCategory(category: CommunityPost['category']): CommunityPost[] {
  return getPosts().filter(p => p.category === category);
}

export function createPost(
  authorId: string,
  authorName: string,
  authorAvatar: string,
  data: Pick<CommunityPost, 'title' | 'content' | 'category' | 'tags' | 'questionId'>
): CommunityPost {
  const now = new Date().toISOString();
  const post: CommunityPost = {
    id: generateId(),
    authorId,
    authorName,
    authorAvatar,
    title: data.title,
    content: data.content,
    category: data.category,
    tags: data.tags || [],
    likes: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
    questionId: data.questionId,
  };

  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []);
  posts.push(post);
  setItem(KEYS.POSTS, posts);
  return post;
}

export function updatePost(id: string, updates: Partial<Pick<CommunityPost, 'title' | 'content' | 'tags'>>): boolean {
  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []);
  const idx = posts.findIndex(p => p.id === id);
  if (idx < 0) return false;

  Object.assign(posts[idx], updates, { updatedAt: new Date().toISOString() });
  setItem(KEYS.POSTS, posts);
  return true;
}

export function deletePost(id: string): void {
  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []).filter(p => p.id !== id);
  setItem(KEYS.POSTS, posts);
  // 同时删除相关评论
  const comments = getItem<Comment[]>(KEYS.COMMENTS, []).filter(c => c.postId !== id);
  setItem(KEYS.COMMENTS, comments);
}

export function likePost(id: string): void {
  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []);
  const post = posts.find(p => p.id === id);
  if (post) {
    post.likes++;
    setItem(KEYS.POSTS, posts);
  }
}

// ==================== 评论管理 ====================

export function getComments(postId: string): Comment[] {
  return getItem<Comment[]>(KEYS.COMMENTS, [])
    .filter(c => c.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function addComment(
  postId: string,
  authorId: string,
  authorName: string,
  authorAvatar: string,
  content: string,
  replyTo?: string,
  replyToName?: string
): Comment {
  const comment: Comment = {
    id: generateId(),
    postId,
    authorId,
    authorName,
    authorAvatar,
    content,
    likes: 0,
    createdAt: new Date().toISOString(),
    replyTo,
    replyToName,
  };

  const comments = getItem<Comment[]>(KEYS.COMMENTS, []);
  comments.push(comment);
  setItem(KEYS.COMMENTS, comments);

  // 更新帖子评论数
  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []);
  const post = posts.find(p => p.id === postId);
  if (post) {
    post.commentCount++;
    setItem(KEYS.POSTS, posts);
  }

  return comment;
}

export function deleteComment(commentId: string): void {
  const comments = getItem<Comment[]>(KEYS.COMMENTS, []);
  const comment = comments.find(c => c.id === commentId);
  if (!comment) return;

  const filtered = comments.filter(c => c.id !== commentId);
  setItem(KEYS.COMMENTS, filtered);

  // 更新帖子评论数
  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []);
  const post = posts.find(p => p.id === comment.postId);
  if (post && post.commentCount > 0) {
    post.commentCount--;
    setItem(KEYS.POSTS, posts);
  }
}

export function likeComment(commentId: string): void {
  const comments = getItem<Comment[]>(KEYS.COMMENTS, []);
  const comment = comments.find(c => c.id === commentId);
  if (comment) {
    comment.likes++;
    setItem(KEYS.COMMENTS, comments);
  }
}

// ==================== 预置示例帖子 ====================

export function initSamplePosts(): void {
  const posts = getItem<CommunityPost[]>(KEYS.POSTS, []);
  if (posts.length > 0) return; // 已有数据就不初始化

  const samplePosts: CommunityPost[] = [
    {
      id: 'sample-1',
      authorId: 'system',
      authorName: '学习助手',
      authorAvatar: '🤖',
      title: '【经验分享】行测85分上岸经验 - 三大块各个击破',
      content: `分享一下我的行测备考经验，最终成绩85分。

**文科专项（常识+言语）：** 常识靠积累，每天花15分钟刷时政+人文。言语理解关键在于找转折词，转折后面才是重点。

**理科专项（数量+资料）：** 数量关系用代入法+特值法基本能解决80%的题。资料分析一定要练速算，推荐截位直除法。

**逻辑专项（判断推理）：** 图形推理背规律，定义判断扣关键词，类比推理学造句法，逻辑判断掌握矛盾法。

坚持每天刷50题+复盘错题，3个月可以从60提到80+！加油💪`,
      category: '经验分享',
      tags: ['高分经验', '三大块', '备考策略'],
      likes: 42,
      commentCount: 0,
      createdAt: '2024-01-15T08:00:00.000Z',
      updatedAt: '2024-01-15T08:00:00.000Z',
    },
    {
      id: 'sample-2',
      authorId: 'system',
      authorName: '学习助手',
      authorAvatar: '🤖',
      title: '【技巧总结】资料分析速算技巧大全',
      content: `资料分析提速必备技巧：

1. **截位直除法**：分母截取前三位直接除
2. **特征数字法**：1/3≈33.3%, 1/8=12.5%
3. **增长率比较**：分数大小比较看交叉相乘
4. **基期量计算**：现期量/(1+增长率)
5. **两期比重差**：套公式直接算

练熟这5个技巧，资料分析轻松拿满分！`,
      category: '资料分享',
      tags: ['资料分析', '速算技巧'],
      likes: 28,
      commentCount: 0,
      createdAt: '2024-01-20T10:00:00.000Z',
      updatedAt: '2024-01-20T10:00:00.000Z',
    },
  ];

  setItem(KEYS.POSTS, samplePosts);
}
