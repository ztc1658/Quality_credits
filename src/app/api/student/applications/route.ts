import { NextRequest, NextResponse } from 'next/server';
import { getApplicationsByStudent } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const studentId = Number(req.nextUrl.searchParams.get('studentId'));
    return NextResponse.json(getApplicationsByStudent(studentId));
  } catch (error) {
    return NextResponse.json({ error: '获取申报列表失败' }, { status: 500 });
  }
}
