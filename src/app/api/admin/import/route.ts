import { batchImportUsers } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type ImportUserRow = {
  username: string;
  name: string;
  role: string;
  class_id?: number;
};

function parseUserRowsFromSheet(rows: unknown[][], role: string, classId?: number): ImportUserRow[] {
  const parsed: ImportUserRow[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const username = String(row[0] ?? "").trim();
    const name = String(row[1] ?? "").trim() || username;
    if (!username) continue;
    if (["学号", "工号", "账号", "username"].includes(username.toLowerCase())) continue;
    parsed.push({
      username,
      name,
      role,
      class_id: role === "Student" ? classId : undefined,
    });
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const role = String(form.get("role") ?? "Student");
      const classIdRaw = form.get("classId");
      const classId = classIdRaw ? Number(classIdRaw) : undefined;
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "请上传Excel文件" }, { status: 400 });
      }

      const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        return NextResponse.json({ error: "Excel内容为空" }, { status: 400 });
      }
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
      const users = parseUserRowsFromSheet(rows, role, classId);
      if (users.length === 0) {
        return NextResponse.json({ error: "未识别到有效用户行" }, { status: 400 });
      }

      const result = batchImportUsers(users);
      return NextResponse.json({
        message: `成功导入 ${result.imported} 个用户`,
        imported: result.imported,
        skipped: result.skipped,
      });
    }

    const { users } = await req.json();
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "请提供用户数据" }, { status: 400 });
    }
    const result = batchImportUsers(users);
    return NextResponse.json({
      message: `成功导入 ${result.imported} 个用户`,
      imported: result.imported,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error("批量导入失败:", error);
    return NextResponse.json({ error: "导入失败" }, { status: 500 });
  }
}
