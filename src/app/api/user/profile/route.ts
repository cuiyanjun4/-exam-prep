import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/user/profile - Update user profile
export async function PUT(req: NextRequest) {
  try {
    const { userId, nickname, avatar, bio, targetScore, targetExamDate, email } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (nickname !== undefined && nickname.trim()) updateData.nickname = nickname.trim();
    if (avatar !== undefined) updateData.avatar = avatar;
    if (bio !== undefined) updateData.bio = bio;
    if (targetScore !== undefined) updateData.targetScore = targetScore;
    if (targetExamDate !== undefined) updateData.targetExamDate = targetExamDate ? new Date(targetExamDate) : null;
    if (email !== undefined) {
      if (email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists && emailExists.id !== userId) {
          return NextResponse.json({ error: '该邮箱已被使用' }, { status: 409 });
        }
      }
      updateData.email = email || null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, username: true, nickname: true, avatar: true,
        bio: true, email: true, targetScore: true, targetExamDate: true,
        xp: true, level: true, title: true, titleIcon: true, streak: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: '更新资料失败' }, { status: 500 });
  }
}

// GET /api/user/profile?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, nickname: true, avatar: true,
        bio: true, email: true, targetScore: true, targetExamDate: true,
        xp: true, level: true, title: true, titleIcon: true,
        streak: true, maxCombo: true, combo: true, createdAt: true, lastLoginAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: '获取资料失败' }, { status: 500 });
  }
}
