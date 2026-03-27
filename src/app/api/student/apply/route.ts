import { createApplication } from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function saveProof(file: File): Promise<string> {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name || "").toLowerCase();
  const safeExt = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext) ? ext : ".png";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
  const dest = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buffer);
  return `/uploads/proofs/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const studentId = Number(form.get("studentId"));
      const category = String(form.get("category") ?? "");
      const reason = String(form.get("reason") ?? "");
      const points = Number(form.get("points"));
      const proofFile = form.get("proof") as File | null;

      if (!studentId || !category || !reason || !Number.isFinite(points)) {
        return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
      }

      let proof: string | undefined;
      if (proofFile && proofFile.size > 0) {
        proof = await saveProof(proofFile);
      }

      const app = createApplication({
        student_id: studentId,
        category,
        reason,
        points,
        proof,
      });
      return NextResponse.json({ message: "申报已提交", id: app.id }, { status: 201 });
    }

    const { studentId, category, reason, points } = await req.json();
    if (!studentId || !category || !reason || points === undefined) {
      return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
    }
    const app = createApplication({
      student_id: Number(studentId),
      category,
      reason,
      points: Number(points),
    });
    return NextResponse.json({ message: "申报已提交", id: app.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交申报失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
