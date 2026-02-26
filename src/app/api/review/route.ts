import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/review?userId=xxx - Get cards due for review
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 50);

    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const now = new Date();

    const dueCards = await prisma.reviewCard.findMany({
      where: {
        userId,
        nextReview: { lte: now },
      },
      orderBy: { nextReview: 'asc' },
      take: limit,
    });

    const totalCards = await prisma.reviewCard.count({ where: { userId } });
    const dueCount = await prisma.reviewCard.count({
      where: { userId, nextReview: { lte: now } },
    });

    // Box distribution for Leitner system
    const boxDistribution = await prisma.reviewCard.groupBy({
      by: ['leitnerBox'],
      where: { userId },
      _count: { id: true },
    });

    return NextResponse.json({
      dueCards,
      totalCards,
      dueCount,
      boxDistribution: boxDistribution.map(b => ({
        box: b.leitnerBox,
        count: b._count.id,
      })),
    });
  } catch (error) {
    console.error('Get review error:', error);
    return NextResponse.json({ error: '获取复习卡片失败' }, { status: 500 });
  }
}

// POST /api/review - Add or update a review card (after answering)
export async function POST(req: NextRequest) {
  try {
    const { userId, questionId, quality } = await req.json();
    // quality: 0-5 (SM-2 style), or simplified: 0=wrong, 3=hard, 4=good, 5=easy

    if (!userId || !questionId || quality === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const existing = await prisma.reviewCard.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    const now = new Date();

    if (existing) {
      // SM-2 algorithm
      let { easeFactor, interval, repetitions, leitnerBox } = existing;

      if (quality < 3) {
        // Failed - reset
        repetitions = 0;
        interval = 1;
        leitnerBox = Math.max(1, leitnerBox - 1);
      } else {
        // Passed
        repetitions += 1;
        if (repetitions === 1) {
          interval = 1;
        } else if (repetitions === 2) {
          interval = 6;
        } else {
          interval = Math.round(interval * easeFactor);
        }
        leitnerBox = Math.min(5, leitnerBox + 1);
      }

      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

      const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

      const card = await prisma.reviewCard.update({
        where: { userId_questionId: { userId, questionId } },
        data: {
          easeFactor,
          interval,
          repetitions,
          leitnerBox,
          nextReview,
          lastReview: now,
        },
      });

      return NextResponse.json({ card });
    } else {
      // Create new card
      const interval = quality < 3 ? 1 : 1;
      const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

      const card = await prisma.reviewCard.create({
        data: {
          userId,
          questionId,
          easeFactor: 2.5,
          interval,
          repetitions: quality >= 3 ? 1 : 0,
          leitnerBox: quality >= 3 ? 2 : 1,
          nextReview,
          lastReview: now,
        },
      });

      return NextResponse.json({ card });
    }
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: '更新复习卡片失败' }, { status: 500 });
  }
}
