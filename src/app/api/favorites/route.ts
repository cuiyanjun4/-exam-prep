import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/favorites?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        question: {
          select: {
            id: true, module: true, subType: true, difficulty: true,
            content: true, optionsJson: true, answer: true, explanation: true,
          },
        },
      },
    });

    return NextResponse.json({
      favorites: favorites.map(f => ({
        id: f.id,
        questionId: f.questionId,
        createdAt: f.createdAt,
        question: {
          ...f.question,
          options: JSON.parse(f.question.optionsJson),
        },
      })),
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json({ error: '获取收藏失败' }, { status: 500 });
  }
}

// POST /api/favorites - Add to favorites
export async function POST(req: NextRequest) {
  try {
    const { userId, questionId } = await req.json();
    if (!userId || !questionId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const existing = await prisma.userFavorite.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    if (existing) {
      return NextResponse.json({ error: '已收藏' }, { status: 409 });
    }

    const favorite = await prisma.userFavorite.create({
      data: { userId, questionId },
    });

    return NextResponse.json({ favorite });
  } catch (error) {
    console.error('Add favorite error:', error);
    return NextResponse.json({ error: '收藏失败' }, { status: 500 });
  }
}

// DELETE /api/favorites - Remove from favorites
export async function DELETE(req: NextRequest) {
  try {
    const { userId, questionId } = await req.json();
    if (!userId || !questionId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    await prisma.userFavorite.delete({
      where: { userId_questionId: { userId, questionId } },
    }).catch(() => {});

    return NextResponse.json({ message: '取消收藏成功' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return NextResponse.json({ error: '取消收藏失败' }, { status: 500 });
  }
}
