import { NextRequest, NextResponse } from 'next/server';
import { getRecordsByTeacher } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const teacherId = Number(req.nextUrl.searchParams.get('teacherId'));
    return NextResponse.json(getRecordsByTeacher(teacherId));
  } catch (error) {
    return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
  }
}
