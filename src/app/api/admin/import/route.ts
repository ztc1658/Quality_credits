import { NextRequest, NextResponse } from 'next/server';
import { batchImportUsers } from '@/lib/db';

// 批量导入用户
export async function POST(req: NextRequest) {
  try {
    const { users } = await req.json();
    // users: [{ username, name, role, class_id? }, ...]
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: '请提供用户数据' }, { status: 400 });
    }

    const result = batchImportUsers(users);
    return NextResponse.json({
      message: `成功导入 ${result.imported} 个用户`,
      imported: result.imported,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error('批量导入失败:', error);
    return NextResponse.json({ error: '导入失败' }, { status: 500 });
  }
}
