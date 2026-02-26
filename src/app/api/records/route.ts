import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/records - Save answer record
export async function POST(req: NextRequest) {
  try {
    const { userId, questionId, userAnswer, isCorrect, timeSpent, module, subType, feynmanNote } = await req.json();

    if (!userId || !questionId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const record = await prisma.answerRecord.create({
      data: {
        userId,
        questionId,
        userAnswer,
        isCorrect,
        timeSpent,
        module,
        subType,
        feynmanNote,
      },
    });

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    await prisma.dailyStats.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        totalQuestions: { increment: 1 },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        totalTime: { increment: timeSpent },
      },
      create: {
        userId,
        date: today,
        totalQuestions: 1,
        correctCount: isCorrect ? 1 : 0,
        totalTime: timeSpent,
      },
    });

    // Update user XP and combo
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const newCombo = isCorrect ? user.combo + 1 : 0;
      const xpGain = isCorrect ? 4 : -1;
      const comboBonus = (isCorrect && newCombo > 0 && newCombo % 5 === 0) ? Math.min(Math.floor(newCombo / 5) * 3, 30) : 0;

      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: Math.max(0, user.xp + xpGain + comboBonus),
          combo: newCombo,
          maxCombo: Math.max(user.maxCombo, newCombo),
          lastActiveDate: today,
          streak: user.lastActiveDate === today ? user.streak :
            user.lastActiveDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? user.streak + 1 : 1,
        },
      });
    }

    // Update question stats
    const allRecords = await prisma.answerRecord.findMany({
      where: { questionId },
      select: { isCorrect: true, timeSpent: true },
    });
    const total = allRecords.length;
    const correct = allRecords.filter(r => r.isCorrect).length;
    const avgTime = allRecords.reduce((s, r) => s + r.timeSpent, 0) / total;

    await prisma.question.update({
      where: { id: questionId },
      data: {
        totalAttempts: total,
        correctRate: correct / total,
        avgTimeSpent: avgTime,
      },
    }).catch(() => {}); // Question might not exist in DB yet

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Record error:', error);
    return NextResponse.json({ error: '保存记录失败' }, { status: 500 });
  }
}

// GET /api/records?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const records = await prisma.answerRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get records error:', error);
    return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
  }
}
