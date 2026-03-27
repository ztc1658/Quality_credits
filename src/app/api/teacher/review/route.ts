import { NextRequest, NextResponse } from 'next/server';
import { reviewApplication } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { applicationId, status, reviewerId } = await req.json();
    if (!applicationId || !status || !reviewerId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }
    const result = reviewApplication(applicationId, status, reviewerId);
    if (!result) {
      return NextResponse.json({ error: '申报不存在' }, { status: 404 });
    }
    return NextResponse.json({ message: '审核完成' });
  } catch (error) {
    return NextResponse.json({ error: '审核失败' }, { status: 500 });
  }
}
