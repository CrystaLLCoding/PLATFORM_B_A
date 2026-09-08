import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateGeminiAudit } from '@/lib/geminiAuditEngine';

export async function POST(
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

    // Set status to analyzing
    storage.updateCaseStatus(id, 'analyzing');

    // Run Google Gemini AI audit engine (with seamless local fallback)
    const auditReport = await generateGeminiAudit(businessCase);

    // Save report and mark as completed
    const updatedCase = storage.updateCaseReport(id, auditReport);

    // Persist to cloud
    await storage.saveToCloud();

    return NextResponse.json({ success: true, case: updatedCase, report: auditReport });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
