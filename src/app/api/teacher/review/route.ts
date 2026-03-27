import { reviewApplication } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { applicationId, status, reviewerId, reviewNote } = await req.json();
    if (!applicationId || !status || !reviewerId) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const result = reviewApplication(
      Number(applicationId),
      status,
      Number(reviewerId),
      reviewNote
    );
    if (!result) {
      return NextResponse.json({ error: "申报不存在" }, { status: 404 });
    }
    return NextResponse.json({ message: "审核完成" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "审核失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
