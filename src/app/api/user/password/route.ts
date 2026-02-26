import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/user/password - Change password
export async function PUT(req: NextRequest) {
  try {
    const { userId, oldPassword, newPassword } = await req.json();

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: '新密码至少4个字符' }, { status: 400 });
    }

    const simpleHash = (str: string): string => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (user.passwordHash !== simpleHash(oldPassword)) {
      return NextResponse.json({ error: '原密码错误' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: simpleHash(newPassword) },
    });

    return NextResponse.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
