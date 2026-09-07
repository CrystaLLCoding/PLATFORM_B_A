import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { UploadedSource, ArchiveFileInfo } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Файл архива не передан' }, { status: 400 });
    }

    const archiveName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Path to python archive extractor
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'archive_extractor.py');

    // Run python process
    const pyProcess = spawn('python', [scriptPath]);

    const resultPromise = new Promise<any>((resolve) => {
      let outputBuffer = Buffer.alloc(0);
      let errorString = '';

      pyProcess.stdout.on('data', (data) => {
        outputBuffer = Buffer.concat([outputBuffer, data]);
      });

      pyProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pyProcess.on('close', (code) => {
        if (code !== 0 && outputBuffer.length === 0) {
          resolve({ success: false, error: errorString || `Python process exited with code ${code}` });
          return;
        }

        try {
          const json = JSON.parse(outputBuffer.toString('utf-8'));
          resolve(json);
        } catch (e: any) {
          resolve({ 
            success: false, 
            error: 'Ошибка парсинга ответа от распаковщика архивов: ' + e.message + (errorString ? ` (${errorString})` : '') 
          });
        }
      });

      pyProcess.stdin.write(buffer);
      pyProcess.stdin.end();
    });

    const parsed = await resultPromise;

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error || 'Не удалось распаковать архив'
      }, { status: 422 });
    }

    const XLSX = await import('xlsx');
    const Papa = (await import('papaparse')).default;

    const sources: UploadedSource[] = [];
    const archiveFilesList: ArchiveFileInfo[] = [];

    const extractedFiles = parsed.files || [];

    for (let i = 0; i < extractedFiles.length; i++) {
      const f = extractedFiles[i];
      const ext = (f.extension || '').toLowerCase();
      let type: UploadedSource['type'] = 'pdf';
      let summary = f.summary || `Файл ${f.name} из архива ${archiveName}`;
      let parsedDataPreview: UploadedSource['parsedDataPreview'] = undefined;

      if (f.type === 'csv' || ext === 'csv') {
        type = 'csv';
        const columns: string[] = f.columns || [];
        const sampleRows: Record<string, any>[] = f.sampleRows || [];
        const totalRows: number = f.totalRows || sampleRows.length;

        summary = f.summary || `CSV таблица из архива: ${totalRows} строк, ${columns.length} колонок (${columns.slice(0, 4).join(', ')}).`;
        parsedDataPreview = {
          columns,
          sampleRows,
          totalRows
        };
      } else if (f.type === 'excel' || ['xlsx', 'xls'].includes(ext)) {
        type = 'excel';
        try {
          if (f.base64) {
            const excelBuf = Buffer.from(f.base64, 'base64');
            const workbook = XLSX.read(excelBuf, { type: 'buffer' });
            const firstSheet = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheet];
            const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (json && json.length > 0) {
              const headers = (json[0] || []).map((h: any, idx: number) => String(h || `Колонка_${idx + 1}`));
              const dataRows = json.slice(1).map((row: any[]) => {
                const obj: Record<string, any> = {};
                headers.forEach((h: string, idx: number) => {
                  obj[h] = row[idx] ?? '';
                });
                return obj;
              });

              summary = `Excel лист «${firstSheet}» из архива: ${dataRows.length} строк данных (${headers.slice(0, 4).join(', ')}).`;
              parsedDataPreview = {
                columns: headers,
                sampleRows: dataRows.slice(0, 60),
                totalRows: dataRows.length
              };
            }
          }
        } catch (excelErr: any) {
          summary = `Excel файл из архива (${Math.round(f.sizeBytes / 1024)} КБ)`;
        }
      } else if (f.type === 'pdf' || ext === 'pdf') {
        type = 'pdf';
        summary = f.summary || `PDF документ из архива (${Math.round(f.sizeBytes / 1024)} КБ)`;
        if (f.textSnippet) {
          parsedDataPreview = {
            textSnippet: f.textSnippet
          };
        }
      } else if (f.type === 'image' || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        type = 'image';
        summary = `Изображение из архива: ${f.name} (${Math.round(f.sizeBytes / 1024)} КБ)`;
      } else if (f.type === 'html' || ['html', 'htm'].includes(ext)) {
        type = 'html';
        summary = f.summary || `HTML веб-отчет из архива: ${f.name}`;
        if (f.textSnippet) {
          parsedDataPreview = {
            textSnippet: f.textSnippet
          };
        }
      } else if (['txt', 'log', 'json'].includes(ext)) {
        type = 'pdf';
        summary = `Текстовый документ из архива: ${f.name}`;
        if (f.textSnippet) {
          parsedDataPreview = {
            textSnippet: f.textSnippet
          };
        }
      }

      archiveFilesList.push({
        name: f.name,
        sizeBytes: f.sizeBytes,
        type: type === 'excel' ? 'excel' : (type === 'csv' ? 'csv' : (type === 'pdf' ? 'pdf' : (type === 'image' ? 'image' : (type === 'html' ? 'html' : 'other')))),
        rowsCount: parsedDataPreview?.totalRows,
        columnsCount: parsedDataPreview?.columns?.length
      });

      sources.push({
        id: 'arc-file-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5),
        name: f.name,
        type,
        sizeBytes: f.sizeBytes,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        summary,
        fromArchive: archiveName,
        parsedDataPreview
      });
    }

    return NextResponse.json({
      success: true,
      archiveName,
      archiveType: parsed.archiveType,
      totalFiles: extractedFiles.length,
      extractedCount: sources.length,
      archiveFiles: archiveFilesList,
      sources
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
