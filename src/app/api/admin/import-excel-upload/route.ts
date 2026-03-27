import { importFromExcelTemplates } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function ensureExcelFile(file: File | null, label: string): File {
  if (!file) {
    throw new Error(`请上传${label}`);
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    throw new Error(`${label}仅支持 .xlsx / .xls`);
  }
  return file;
}

async function saveUpload(file: File, targetPath: string): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(targetPath, Buffer.from(arrayBuffer));
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const addFile = ensureExcelFile(
      form.get("addDetailsFile") as File | null,
      "加分详情文件"
    );
    const minusFile = ensureExcelFile(
      form.get("minusDetailsFile") as File | null,
      "减分详情文件"
    );
    const summaryFile = ensureExcelFile(
      form.get("summaryFile") as File | null,
      "记录表文件"
    );
    const resetDatabase = String(form.get("resetDatabase") ?? "true") !== "false";

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dir = path.join(process.cwd(), "data", "uploads", stamp);
    await fs.mkdir(dir, { recursive: true });

    const addPath = path.join(dir, addFile.name);
    const minusPath = path.join(dir, minusFile.name);
    const summaryPath = path.join(dir, summaryFile.name);

    await Promise.all([
      saveUpload(addFile, addPath),
      saveUpload(minusFile, minusPath),
      saveUpload(summaryFile, summaryPath),
    ]);

    const result = importFromExcelTemplates({
      addDetailsPath: addPath,
      minusDetailsPath: minusPath,
      summaryPath,
      resetDatabase,
    });

    return NextResponse.json({
      message: "Excel模板上传并导入完成",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
