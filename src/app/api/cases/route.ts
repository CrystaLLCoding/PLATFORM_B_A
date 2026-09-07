import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET() {
  try {
    const cases = storage.getAllCases();
    return NextResponse.json({ success: true, cases });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, businessType, description, sources } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Название кейса обязательно' }, { status: 400 });
    }

    const newCase = storage.createCase(title, businessType || 'Малый бизнес', description);

    if (Array.isArray(sources)) {
      sources.forEach((s: any) => {
        storage.addSourceToCase(newCase.id, {
          name: s.name,
          type: s.type || 'excel',
          sizeBytes: s.sizeBytes,
          summary: s.summary,
          parsedDataPreview: s.parsedDataPreview
        });
      });
    }

    const refreshedCase = storage.getCaseById(newCase.id);
    return NextResponse.json({ success: true, case: refreshedCase });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
