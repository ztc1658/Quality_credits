import { importFromExcelTemplates } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addDetailsPath = String(body?.addDetailsPath ?? "").trim();
    const minusDetailsPath = String(body?.minusDetailsPath ?? "").trim();
    const summaryPath = String(body?.summaryPath ?? "").trim();
    const resetDatabase = body?.resetDatabase !== false;

    if (!addDetailsPath || !minusDetailsPath || !summaryPath) {
      return NextResponse.json(
        { error: "请提供加分详情、减分详情和记录表三个文件路径" },
        { status: 400 }
      );
    }

    const result = importFromExcelTemplates({
      addDetailsPath,
      minusDetailsPath,
      summaryPath,
      resetDatabase,
    });

    return NextResponse.json({
      message: "Excel模板导入完成",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
