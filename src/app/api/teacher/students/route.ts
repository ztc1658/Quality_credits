import { NextResponse } from 'next/server';
import { getStudentsByTeacher } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = Number(searchParams.get('teacherId'));
    return NextResponse.json(getStudentsByTeacher(teacherId));
  } catch (error) {
    return NextResponse.json({ error: '获取学生列表失败' }, { status: 500 });
  }
}
