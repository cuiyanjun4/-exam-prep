import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const { username, password, nickname, avatar } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    // Check if username exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
    }

    // Simple hash (for demo; use bcrypt in production)
    const simpleHash = (str: string): string => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    };

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: simpleHash(password),
        nickname: nickname || username,
        avatar: avatar || '🧑‍💼',
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        level: user.level,
        xp: user.xp,
        title: user.title,
        titleIcon: user.titleIcon,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}
