import { NextRequest, NextResponse } from 'next/server';
import { getRecordsByStudent } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const studentId = Number(req.nextUrl.searchParams.get('studentId'));
    return NextResponse.json(getRecordsByStudent(studentId));
  } catch (error) {
    return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
  }
}
