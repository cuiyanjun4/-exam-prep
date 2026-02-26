import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/mistakes?userId=xxx&module=xxx&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const module = req.nextUrl.searchParams.get('module');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 100);

    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      userId,
      isCorrect: false,
    };
    if (module) where.module = module;

    const [records, total] = await Promise.all([
      prisma.answerRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          questionId: true,
          userAnswer: true,
          isCorrect: true,
          timeSpent: true,
          module: true,
          subType: true,
          feynmanNote: true,
          createdAt: true,
        },
      }),
      prisma.answerRecord.count({ where }),
    ]);

    // Get module distribution
    const moduleBreakdown = await prisma.answerRecord.groupBy({
      by: ['module'],
      where: { userId, isCorrect: false },
      _count: { id: true },
    });

    return NextResponse.json({
      mistakes: records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      moduleBreakdown: moduleBreakdown.map(m => ({
        module: m.module,
        count: m._count.id,
      })),
    });
  } catch (error) {
    console.error('Get mistakes error:', error);
    return NextResponse.json({ error: '获取错题失败' }, { status: 500 });
  }
}
