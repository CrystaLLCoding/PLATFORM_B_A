import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await storage.ensureFresh();
    const businessCase = storage.getCaseById(id);

    if (!businessCase) {
      return NextResponse.json({ success: false, error: 'Кейс не найден' }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: businessCase });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
