import { getApplicationsByTeacher } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const teacherId = Number(req.nextUrl.searchParams.get("teacherId"));
    if (!teacherId) {
      return NextResponse.json({ error: "teacherId 必填" }, { status: 400 });
    }
    return NextResponse.json(getApplicationsByTeacher(teacherId));
  } catch {
    return NextResponse.json({ error: "获取申报列表失败" }, { status: 500 });
  }
}
