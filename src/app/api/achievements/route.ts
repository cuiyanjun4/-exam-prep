import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/achievements?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Get achievements error:', error);
    return NextResponse.json({ error: '获取成就失败' }, { status: 500 });
  }
}

// POST /api/achievements - Unlock achievement
export async function POST(req: NextRequest) {
  try {
    const { userId, achievementId } = await req.json();

    if (!userId || !achievementId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // Check if already unlocked
    const existing = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId } },
    });
    if (existing) {
      return NextResponse.json({ message: '成就已解锁', achievement: existing });
    }

    const achievement = await prisma.userAchievement.create({
      data: { userId, achievementId },
    });

    return NextResponse.json({ achievement, newUnlock: true });
  } catch (error) {
    console.error('Unlock achievement error:', error);
    return NextResponse.json({ error: '解锁成就失败' }, { status: 500 });
  }
}
