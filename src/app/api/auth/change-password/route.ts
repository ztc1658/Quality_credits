import { changePassword, findUserById, verifyPassword } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, oldPassword, newPassword } = await req.json();
    if (!userId || !newPassword) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "新密码长度不能少于6位" }, { status: 400 });
    }
    if (newPassword === "123456") {
      return NextResponse.json({ error: "新密码不能与初始密码相同" }, { status: 400 });
    }

    const user = findUserById(Number(userId));
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 非首次改密时，要求校验旧密码
    if (user.password_changed && !oldPassword) {
      return NextResponse.json({ error: "请提供旧密码" }, { status: 400 });
    }
    if (user.password_changed && oldPassword && !verifyPassword(user, oldPassword)) {
      return NextResponse.json({ error: "旧密码错误" }, { status: 401 });
    }

    const success = changePassword(Number(userId), newPassword);
    if (!success) {
      return NextResponse.json({ error: "修改失败" }, { status: 500 });
    }

    return NextResponse.json({ message: "密码修改成功" });
  } catch (error) {
    console.error("修改密码失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
