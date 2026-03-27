import { NextRequest, NextResponse } from 'next/server';
import { addCreditRecord } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { studentId, teacherId, category, reason, points } = await req.json();
    if (!studentId || !teacherId || !category || !reason || points === undefined) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }
    const record = addCreditRecord({ student_id: Number(studentId), teacher_id: Number(teacherId), category, reason, points });
    return NextResponse.json({ message: '学分记录已添加', id: record.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '添加记录失败' }, { status: 500 });
  }
}
