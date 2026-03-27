import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, createUser } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password, name, role, class_id } = await req.json();
    if (!username || !password || !name || !role) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }
    if (!['Admin', 'Teacher', 'Student'].includes(role)) {
      return NextResponse.json({ error: '无效的角色类型' }, { status: 400 });
    }
    if (role === 'Student' && !class_id) {
      return NextResponse.json({ error: '学生注册必须选择班级' }, { status: 400 });
    }

    const existing = findUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: '该账号已被注册' }, { status: 409 });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = createUser({
      username, password: hashedPassword, name, role,
      class_id: role === 'Student' ? Number(class_id) : undefined,
    });

    return NextResponse.json({
      message: '注册成功',
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    }, { status: 201 });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
