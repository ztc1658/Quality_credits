import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: '请输入账号和密码' }, { status: 400 });
    }

    const user = findUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    return NextResponse.json({
      message: '登录成功',
      user: {
        id: user.id, username: user.username, name: user.name,
        role: user.role, avatar: user.avatar, classId: user.class_id,
        password_changed: user.password_changed,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
