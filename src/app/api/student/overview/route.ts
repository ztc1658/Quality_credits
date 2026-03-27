import { getStudentOverview } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const studentId = Number(req.nextUrl.searchParams.get("studentId"));
    if (!studentId) {
      return NextResponse.json({ error: "studentId 必填" }, { status: 400 });
    }
    return NextResponse.json(getStudentOverview(studentId));
  } catch {
    return NextResponse.json({ error: "获取概览失败" }, { status: 500 });
  }
}
