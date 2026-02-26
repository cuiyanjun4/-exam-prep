import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/stats?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    // Get user with game profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        combo: true,
        lastActiveDate: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // Get daily stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const dailyStats = await prisma.dailyStats.findMany({
      where: { userId, date: { gte: dateStr } },
      orderBy: { date: 'desc' },
    });

    // Get total records count by module
    const moduleStats = await prisma.answerRecord.groupBy({
      by: ['module'],
      where: { userId },
      _count: { id: true },
      _sum: { timeSpent: true },
    });

    const moduleCorrect = await prisma.answerRecord.groupBy({
      by: ['module'],
      where: { userId, isCorrect: true },
      _count: { id: true },
    });

    // Get achievements
    const achievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    });

    // Get total stats
    const totalRecords = await prisma.answerRecord.count({ where: { userId } });
    const totalCorrect = await prisma.answerRecord.count({ where: { userId, isCorrect: true } });

    return NextResponse.json({
      user,
      totalRecords,
      totalCorrect,
      accuracy: totalRecords > 0 ? Math.round((totalCorrect / totalRecords) * 100) : 0,
      dailyStats,
      moduleStats: moduleStats.map(ms => ({
        module: ms.module,
        total: ms._count.id,
        correct: moduleCorrect.find(mc => mc.module === ms.module)?._count.id || 0,
        totalTime: ms._sum.timeSpent || 0,
      })),
      achievements,
      checkinDays: dailyStats.filter(d => d.totalQuestions > 0).length,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
  }
}
