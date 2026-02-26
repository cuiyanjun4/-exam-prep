import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/notes?userId=xxx&module=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const module = req.nextUrl.searchParams.get('module');

    if (!userId) {
      return NextResponse.json({ error: '缺少userId' }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId };
    if (module) where.module = module;

    const notes = await prisma.cornellNote.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ error: '获取笔记失败' }, { status: 500 });
  }
}

// POST /api/notes - Create note
export async function POST(req: NextRequest) {
  try {
    const { userId, date, topic, module, cues, notes, summary } = await req.json();

    if (!userId || !topic) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const note = await prisma.cornellNote.create({
      data: {
        userId,
        date: date || new Date().toISOString().split('T')[0],
        topic,
        module: module || '常识判断',
        cues: cues || '',
        notes: notes || '',
        summary: summary || '',
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: '创建笔记失败' }, { status: 500 });
  }
}

// PUT /api/notes - Update note
export async function PUT(req: NextRequest) {
  try {
    const { noteId, userId, cues, notes, summary, topic } = await req.json();

    if (!noteId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const existing = await prisma.cornellNote.findUnique({ where: { id: noteId } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: '笔记不存在或无权限' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (cues !== undefined) updateData.cues = cues;
    if (notes !== undefined) updateData.notes = notes;
    if (summary !== undefined) updateData.summary = summary;
    if (topic !== undefined) updateData.topic = topic;

    const updated = await prisma.cornellNote.update({
      where: { id: noteId },
      data: updateData,
    });

    return NextResponse.json({ note: updated });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: '更新笔记失败' }, { status: 500 });
  }
}

// DELETE /api/notes
export async function DELETE(req: NextRequest) {
  try {
    const { noteId, userId } = await req.json();

    if (!noteId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const existing = await prisma.cornellNote.findUnique({ where: { id: noteId } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: '笔记不存在或无权限' }, { status: 404 });
    }

    await prisma.cornellNote.delete({ where: { id: noteId } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: '删除笔记失败' }, { status: 500 });
  }
}
