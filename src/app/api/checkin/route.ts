import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/checkin - Daily check-in
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in
    const existing = await prisma.dailyStats.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (existing && existing.totalQuestions > 0) {
      return NextResponse.json({ message: '今日已打卡', checkedIn: true, stats: existing });
    }

    // Create or update daily stats entry
    const stats = await prisma.dailyStats.upsert({
      where: { userId_date: { userId, date: today } },
      update: {},
      create: {
        userId,
        date: today,
        totalQuestions: 0,
        correctCount: 0,
        totalTime: 0,
        xpEarned: 0,
      },
    });

    // Update user streak
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = user.lastActiveDate === yesterday ? user.streak + 1 :
        user.lastActiveDate === today ? user.streak : 1;

      // XP bonus for check-in
      const streakBonus = Math.min(newStreak * 2, 20);
      const xpGain = 5 + streakBonus; // base 5 + streak bonus

      await prisma.user.update({
        where: { id: userId },
        data: {
          streak: newStreak,
          lastActiveDate: today,
          xp: user.xp + xpGain,
        },
      });
    }

    return NextResponse.json({ message: '打卡成功', checkedIn: true, stats });
  } catch (error) {
    console.error('Checkin error:', error);
    return NextResponse.json({ error: '打卡失败' }, { status: 500 });
  }
}

// GET /api/checkin?userId=xxx&month=2026-01
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const month = req.nextUrl.searchParams.get('month'); // YYYY-MM (optional)

    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-31`;

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, xp: true, level: true },
    });

    return NextResponse.json({
      days: dailyStats.map(d => ({
        date: d.date,
        totalQuestions: d.totalQuestions,
        correctCount: d.correctCount,
        totalTime: d.totalTime,
        xpEarned: d.xpEarned,
      })),
      streak: user?.streak || 0,
      totalCheckins: dailyStats.filter(d => d.totalQuestions > 0).length,
    });
  } catch (error) {
    console.error('Get checkin error:', error);
    return NextResponse.json({ error: '获取打卡记录失败' }, { status: 500 });
  }
}
