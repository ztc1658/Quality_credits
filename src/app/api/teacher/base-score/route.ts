import { setBaseScoreByTeacher } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { teacherId, baseScore, classId, studentId } = await req.json();
    if (!teacherId || baseScore === undefined) {
      return NextResponse.json({ error: "teacherId 与 baseScore 必填" }, { status: 400 });
    }

    const result = setBaseScoreByTeacher({
      teacherId: Number(teacherId),
      baseScore: Number(baseScore),
      classId: classId ? Number(classId) : undefined,
      studentId: studentId ? Number(studentId) : undefined,
    });
    return NextResponse.json({ message: "基础分设置完成", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "基础分设置失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
