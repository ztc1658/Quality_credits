import { getAllCreditRecords, getStudentSummaryRows } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode === "summary") {
      return NextResponse.json(getStudentSummaryRows());
    }
    if (mode === "all") {
      return NextResponse.json({
        summary: getStudentSummaryRows(),
        details: getAllCreditRecords(),
      });
    }
    return NextResponse.json(getAllCreditRecords());
  } catch {
    return NextResponse.json({ error: "获取学分记录失败" }, { status: 500 });
  }
}
