import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "系统不提供前端注册，请联系管理员批量导入账号" },
    { status: 403 }
  );
}
