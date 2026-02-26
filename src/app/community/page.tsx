'use client';

import { useState, useEffect } from 'react';
import { CommunityPost, Comment as CommentType } from '@/types';
import { getPosts, getPostsByCategory, createPost, likePost, getComments, addComment, likeComment, initSamplePosts, deletePost, deleteComment } from '@/lib/community';
import { getAuthState } from '@/lib/auth';

const CATEGORIES: CommunityPost['category'][] = ['经验分享', '题目讨论', '学习打卡', '资料分享', '提问求助'];
const CATEGORY_ICONS: Record<string, string> = {
  '经验分享': '🏆',
  '题目讨论': '💬',
  '学习打卡': '📅',
  '资料分享': '📁',
  '提问求助': '❓',
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CommunityPost['category'] | 'all'>('all');
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');

  // New post form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<CommunityPost['category']>('经验分享');
  const [newTags, setNewTags] = useState('');

  useEffect(() => {
    initSamplePosts();
    loadPosts();
  }, []);

  const loadPosts = () => {
    if (selectedCategory === 'all') {
      setPosts(getPosts());
    } else {
      setPosts(getPostsByCategory(selectedCategory));
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const handleCreatePost = () => {
    const auth = getAuthState();
    const authorId = auth.currentUser?.id || 'guest';
    const authorName = auth.currentUser?.nickname || '匿名用户';
    const authorAvatar = auth.currentUser?.avatar || '👤';

    if (!newTitle.trim() || !newContent.trim()) return;

    createPost(authorId, authorName, authorAvatar, {
      title: newTitle,
      content: newContent,
      category: newCategory,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
    });

    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setShowNewPost(false);
    loadPosts();
  };

  const handleLikePost = (postId: string) => {
    likePost(postId);
    loadPosts();
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
    }
  };

  const openPost = (post: CommunityPost) => {
    setSelectedPost(post);
    setComments(getComments(post.id));
    setNewComment('');
  };

  const handleAddComment = () => {
    if (!selectedPost || !newComment.trim()) return;

    const auth = getAuthState();
    const authorId = auth.currentUser?.id || 'guest';
    const authorName = auth.currentUser?.nickname || '匿名用户';
    const authorAvatar = auth.currentUser?.avatar || '👤';

    addComment(selectedPost.id, authorId, authorName, authorAvatar, newComment);
    setNewComment('');
    setComments(getComments(selectedPost.id));
    loadPosts();
  };

  const handleDeletePost = (postId: string) => {
    if (confirm('确定删除这篇帖子吗？')) {
      deletePost(postId);
      setSelectedPost(null);
      loadPosts();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // ==================== 帖子详情 ====================
  if (selectedPost) {
    const auth = getAuthState();
    const isAuthor = auth.currentUser?.id === selectedPost.authorId;

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedPost(null)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← 返回列表
        </button>

        {/* 帖子详情 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{selectedPost.authorAvatar}</span>
            <div>
              <span className="font-medium text-slate-800">{selectedPost.authorName}</span>
              <span className="text-sm text-slate-400 ml-2">{formatDate(selectedPost.createdAt)}</span>
            </div>
            <span className="ml-auto text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
              {CATEGORY_ICONS[selectedPost.category]} {selectedPost.category}
            </span>
          </div>

          <h1 className="text-xl font-bold text-slate-800 mb-4">{selectedPost.title}</h1>
          <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedPost.content}</div>

          {selectedPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedPost.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full">#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleLikePost(selectedPost.id)}
              className="text-sm text-slate-500 hover:text-red-500 transition-colors"
            >
              ❤️ {selectedPost.likes}
            </button>
            <span className="text-sm text-slate-400">💬 {comments.length} 条评论</span>
            {isAuthor && (
              <button
                onClick={() => handleDeletePost(selectedPost.id)}
                className="ml-auto text-sm text-red-400 hover:text-red-600"
              >
                删除
              </button>
            )}
          </div>
        </div>

        {/* 评论列表 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">评论区</h3>

          {comments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">还没有评论，来说两句吧 💬</p>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <span className="text-2xl flex-shrink-0">{comment.authorAvatar}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{comment.authorName}</span>
                      <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
                    </div>
                    {comment.replyToName && (
                      <span className="text-xs text-blue-500">回复 @{comment.replyToName}</span>
                    )}
                    <p className="text-sm text-slate-600 mt-1">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => likeComment(comment.id)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        ❤️ {comment.likes}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 发评论 */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="写下你的评论..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              发布
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 帖子列表 ====================
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">💬 学习社区</h1>
          <p className="text-slate-500 mt-1">分享经验、讨论题目、一起进步</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          ✏️ 发帖
        </button>
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          全部
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {CATEGORY_ICONS[cat]} {cat}
          </button>
        ))}
      </div>

      {/* 帖子列表 */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-2">📝</div>
          <p>还没有帖子，快来发第一篇吧！</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div
              key={post.id}
              onClick={() => openPost(post)}
              className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{post.authorAvatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-700">{post.authorName}</span>
                    <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                      {CATEGORY_ICONS[post.category]} {post.category}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 mb-1 truncate">{post.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{post.content}</p>

                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-slate-400">❤️ {post.likes}</span>
                    <span className="text-xs text-slate-400">💬 {post.commentCount}</span>
                    {post.tags.length > 0 && (
                      <span className="text-xs text-slate-300">
                        {post.tags.slice(0, 3).map(t => `#${t}`).join(' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 发帖弹窗 */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">✏️ 发布新帖</h2>
              <button onClick={() => setShowNewPost(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                        newCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">标题</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="输入帖子标题"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">内容</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="分享你的想法..."
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="如：行测技巧, 数量关系"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewPost(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  发布
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
