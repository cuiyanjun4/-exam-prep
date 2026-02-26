import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/leaderboard?type=xp&limit=50
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || 'xp';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);

    let orderBy: Record<string, 'asc' | 'desc'> = {};
    switch (type) {
      case 'xp': orderBy = { xp: 'desc' }; break;
      case 'streak': orderBy = { streak: 'desc' }; break;
      case 'level': orderBy = { level: 'desc' }; break;
      default: orderBy = { xp: 'desc' };
    }

    const users = await prisma.user.findMany({
      orderBy,
      take: limit,
      select: {
        id: true,
        nickname: true,
        avatar: true,
        xp: true,
        level: true,
        title: true,
        titleIcon: true,
        streak: true,
        maxCombo: true,
      },
    });

    return NextResponse.json({
      leaderboard: users.map((u, i) => ({
        rank: i + 1,
        ...u,
      })),
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: '获取排行榜失败' }, { status: 500 });
  }
}
