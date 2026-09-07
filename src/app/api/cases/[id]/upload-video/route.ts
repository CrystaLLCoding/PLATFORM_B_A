import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const businessCase = storage.getCaseById(id);

    if (!businessCase) {
      return NextResponse.json({ success: false, error: 'Кейс не найден' }, { status: 404 });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;

    if (!videoFile) {
      return NextResponse.json({ success: false, error: 'Файл видео не передан' }, { status: 400 });
    }

    // In a production setup, this would save to S3/CDN or local uploads folder.
    // For our immediate demonstration, we create a data URL or simulate attachment:
    const videoUrl = `/videos/uploaded_${Date.now()}_${videoFile.name}`;
    const updatedCase = storage.attachVideoToCase(id, videoUrl, 145);

    return NextResponse.json({ success: true, case: updatedCase, videoUrl });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
