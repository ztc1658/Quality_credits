import { NextRequest, NextResponse } from 'next/server';
import { changePassword, findUserByUsername } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { userId, oldPassword, newPassword } = await req.json();
    if (!userId || !newPassword) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度不能少于6位' }, { status: 400 });
    }

    const success = changePassword(userId, newPassword);
    if (!success) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
