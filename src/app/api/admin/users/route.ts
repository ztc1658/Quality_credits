import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(getAllUsers());
  } catch (error) {
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
