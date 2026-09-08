import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET() {
  try {
    await storage.ensureFresh();
    const isCloud = storage.isCloudConfigured();
    const provider = storage.getStorageProvider();
    const cases = storage.getAllCases();

    return NextResponse.json({
      success: true,
      storage: {
        provider,
        isVercelKvConnected: isCloud,
        casesCount: cases.length,
        status: isCloud
          ? 'Облачное хранилище Vercel KV подключено. Данные сохраняются перманентно.'
          : 'Используется локальное хранилище. Для сохранения данных на Vercel подключите Vercel KV в панели проекта.'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
