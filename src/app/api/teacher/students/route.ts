import { getStudentsByTeacherFiltered } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = Number(searchParams.get("teacherId"));
    const keyword = searchParams.get("keyword") ?? "";
    const minScoreRaw = searchParams.get("minScore");
    const maxScoreRaw = searchParams.get("maxScore");
    const minScore = minScoreRaw ? Number(minScoreRaw) : undefined;
    const maxScore = maxScoreRaw ? Number(maxScoreRaw) : undefined;

    if (!teacherId) {
      return NextResponse.json({ error: "teacherId 必填" }, { status: 400 });
    }

    return NextResponse.json(
      getStudentsByTeacherFiltered({
        teacherId,
        keyword,
        minScore: Number.isFinite(minScore) ? minScore : undefined,
        maxScore: Number.isFinite(maxScore) ? maxScore : undefined,
      })
    );
  } catch {
    return NextResponse.json({ error: "获取学生列表失败" }, { status: 500 });
  }
}
