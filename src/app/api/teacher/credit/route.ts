import { addCreditRecord, canTeacherManageStudent } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { studentId, teacherId, category, reason, points } = await req.json();
    if (!studentId || !teacherId || !category || !reason || points === undefined) {
      return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
    }

    if (!canTeacherManageStudent(Number(teacherId), Number(studentId))) {
      return NextResponse.json({ error: "无权操作该学生" }, { status: 403 });
    }

    const record = addCreditRecord({
      student_id: Number(studentId),
      teacher_id: Number(teacherId),
      category: String(category),
      reason: String(reason),
      points: Number(points),
      source: "教师手动操作",
    });
    return NextResponse.json({ message: "学分记录已添加", id: record.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加记录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
