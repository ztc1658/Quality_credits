import { NextRequest, NextResponse } from 'next/server';
import { createApplication } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { studentId, category, reason, points } = await req.json();
    if (!studentId || !category || !reason || points === undefined) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }
    const app = createApplication({ student_id: Number(studentId), category, reason, points });
    return NextResponse.json({ message: '申报已提交', id: app.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '提交申报失败' }, { status: 500 });
  }
}
