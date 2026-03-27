import { NextResponse } from 'next/server';
import { getAllApplications } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(getAllApplications());
  } catch (error) {
    return NextResponse.json({ error: '获取申报列表失败' }, { status: 500 });
  }
}
