import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/speed - Save speed session result
export async function POST(req: NextRequest) {
  try {
    const {
      userId, mode, target, tier, totalQuestions,
      answeredCount, correctCount, avgTimePerQuestion,
      timeLimit, questionTimes, isPR,
    } = await req.json();

    if (!userId || !mode || !target) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const session = await prisma.speedSession.create({
      data: {
        userId,
        mode,
        target,
        tier: tier || 3,
        totalQuestions: totalQuestions || 0,
        answeredCount: answeredCount || 0,
        correctCount: correctCount || 0,
        avgTimePerQuestion: avgTimePerQuestion || 0,
        timeLimit: timeLimit || 0,
        questionTimesJson: JSON.stringify(questionTimes || []),
        isPR: isPR || false,
        endedAt: new Date(),
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Speed session error:', error);
    return NextResponse.json({ error: '保存速刷记录失败' }, { status: 500 });
  }
}

// GET /api/speed?userId=xxx&mode=xxx&target=xxx&limit=10
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const mode = req.nextUrl.searchParams.get('mode');
    const target = req.nextUrl.searchParams.get('target');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 50);

    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId };
    if (mode) where.mode = mode;
    if (target) where.target = target;

    const sessions = await prisma.speedSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    // Get personal records
    const prs = await prisma.speedSession.findMany({
      where: { userId, isPR: true },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      sessions: sessions.map(s => ({
        ...s,
        questionTimes: JSON.parse(s.questionTimesJson),
      })),
      personalRecords: prs.map(s => ({
        ...s,
        questionTimes: JSON.parse(s.questionTimesJson),
      })),
    });
  } catch (error) {
    console.error('Get speed sessions error:', error);
    return NextResponse.json({ error: '获取速刷记录失败' }, { status: 500 });
  }
}
