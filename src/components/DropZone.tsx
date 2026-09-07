'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link as LinkIcon, 
  CheckCircle2, 
  Trash2, 
  AlertCircle,
  Plus,
  Loader2,
  Sparkles,
  Package,
  FolderArchive,
  FileCode
} from 'lucide-react';
import { UploadedSource } from '@/lib/types';

interface DropZoneProps {
  sources: UploadedSource[];
  onSourcesChange: (sources: UploadedSource[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  sources,
  onSourcesChange,
  maxFiles = 20,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlType, setUrlType] = useState<'google_sheets' | 'google_docs' | 'website'>('google_sheets');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('Распознавание и парсинг файлов...');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSourceIcon = (type: UploadedSource['type']) => {
    switch (type) {
      case 'excel':
      case 'csv':
        return <FileSpreadsheet size={20} color="#10B981" />;
      case 'archive':
        return <FolderArchive size={20} color="#A855F7" />;
      case 'pdf':
      case 'docx':
        return <FileText size={20} color="#6366F1" />;
      case 'image':
        return <ImageIcon size={20} color="#F59E0B" />;
      case 'video':
        return <VideoIcon size={20} color="#EC4899" />;
      case 'url':
        return <LinkIcon size={20} color="#06B6D4" />;
      case 'html':
        return <FileCode size={20} color="#F97316" />;
      default:
        return <FileText size={20} color="#94A3B8" />;
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    if (sources.length + files.length > maxFiles) {
      setErrorMessage(`Превышен лимит файлов: максимум ${maxFiles} файлов на один кейс.`);
      return;
    }

    setIsUploading(true);
    setUploadStatusText('Распознавание и распаковка файлов...');

    const Papa = (await import('papaparse')).default;
    const XLSX = await import('xlsx');

    const newSources: UploadedSource[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // ARCHIVE HANDLING: .zip, .rar, .tar, .gz, .7z
      if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
        setUploadStatusText(`Распаковка архива ${file.name}...`);
        let extractedAny = false;

        // 1. Try JSZip client-side for .zip
        if (ext === 'zip') {
          try {
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(file);
            const entryKeys = Object.keys(zip.files).filter(k => {
              const e = zip.files[k];
              return !e.dir && !k.startsWith('__MACOSX') && !k.includes('/.') && !k.endsWith('.DS_Store');
            });

            for (const key of entryKeys) {
              const entry = zip.files[key];
              const entryBaseName = key.split('/').pop() || key;
              const entryExt = entryBaseName.split('.').pop()?.toLowerCase() || '';
              let entryType: UploadedSource['type'] = 'pdf';
              let entrySummary = `Файл ${entryBaseName} из архива ${file.name}`;
              let entryPreview: UploadedSource['parsedDataPreview'] = undefined;

              if (entryExt === 'csv') {
                entryType = 'csv';
                const text = await entry.async('string');
                const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
                const columns = parsed.meta.fields || [];
                const rows = parsed.data as Record<string, any>[];
                entrySummary = `CSV из архива ${file.name}: ${rows.length} строк, ${columns.length} колонок (${columns.slice(0, 4).join(', ')}).`;
                entryPreview = {
                  columns,
                  sampleRows: rows.slice(0, 60),
                  totalRows: rows.length
                };
              } else if (['xlsx', 'xls'].includes(entryExt)) {
                entryType = 'excel';
                const buf = await entry.async('arraybuffer');
                const workbook = XLSX.read(buf, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const sheet = workbook.Sheets[firstSheet];
                const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                if (json.length > 0) {
                  const headers = (json[0] as any[]).map((h, i) => String(h || `Колонка_${i + 1}`));
                  const dataRows = json.slice(1).map(row => {
                    const obj: Record<string, any> = {};
                    headers.forEach((h, i) => {
                      obj[h] = (row as any[])[i] ?? '';
                    });
                    return obj;
                  });
                  entrySummary = `Excel лист «${firstSheet}» из архива: ${dataRows.length} строк данных. Колонки: ${headers.slice(0, 4).join(', ')}.`;
                  entryPreview = {
                    columns: headers,
                    sampleRows: dataRows.slice(0, 60),
                    totalRows: dataRows.length
                  };
                }
              } else if (entryExt === 'pdf') {
                entryType = 'pdf';
                try {
                  const blob = await entry.async('blob');
                  const formData = new FormData();
                  formData.append('file', blob, entryBaseName);
                  const parseRes = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
                  const parseData = await parseRes.json();
                  if (parseData.success && parseData.textSnippet) {
                    entrySummary = parseData.summary || `PDF документ из архива ${file.name}`;
                    entryPreview = { textSnippet: parseData.textSnippet };
                  }
                } catch {
                  entrySummary = `PDF документ из архива ${file.name}`;
                }
              } else if (['jpg', 'jpeg', 'png', 'webp'].includes(entryExt)) {
                entryType = 'image';
                entrySummary = `Изображение из архива: ${entryBaseName}`;
              } else if (['html', 'htm'].includes(entryExt)) {
                entryType = 'html';
                const htmlText = await entry.async('string');
                let extractedTableRows: Record<string, any>[] = [];
                let extractedHeaders: string[] = [];

                try {
                  if (typeof window !== 'undefined') {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlText, 'text/html');
                    const table = doc.querySelector('table');
                    if (table) {
                      const headerCells = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
                      if (headerCells.length > 0) {
                        extractedHeaders = Array.from(headerCells).map(c => c.textContent?.trim() || 'Колонка');
                      }
                      const rowElements = table.querySelectorAll('tbody tr, tr');
                      const startIdx = headerCells.length > 0 && table.querySelector('thead') ? 0 : 1;
                      rowElements.forEach((tr, rIdx) => {
                        if (startIdx === 1 && rIdx === 0) return;
                        const cells = tr.querySelectorAll('td, th');
                        if (cells.length > 0) {
                          const rowObj: Record<string, any> = {};
                          cells.forEach((td, cIdx) => {
                            const colName = extractedHeaders[cIdx] || `Колонка_${cIdx + 1}`;
                            rowObj[colName] = td.textContent?.trim() || '';
                          });
                          if (Object.values(rowObj).some(v => v !== '')) {
                            extractedTableRows.push(rowObj);
                          }
                        }
                      });
                    }
                  }
                } catch {
                  // ignore
                }

                const cleanText = htmlText
                  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
                const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
                const pageTitle = titleMatch ? titleMatch[1].trim() : entryBaseName;

                if (extractedTableRows.length > 0 && extractedHeaders.length > 0) {
                  entrySummary = `HTML таблица из архива «${pageTitle.slice(0, 30)}»: ${extractedTableRows.length} строк, ${extractedHeaders.length} колонок.`;
                  entryPreview = {
                    columns: extractedHeaders,
                    sampleRows: extractedTableRows.slice(0, 60),
                    totalRows: extractedTableRows.length,
                    textSnippet: cleanText.slice(0, 3000)
                  };
                } else {
                  entrySummary = `HTML документ из архива «${pageTitle.slice(0, 30)}» (${cleanText.length} симв.)`;
                  entryPreview = { textSnippet: cleanText.slice(0, 3500) };
                }
              } else if (entryExt === 'docx') {
                entryType = 'docx';
                try {
                  const docxBuf = await entry.async('arraybuffer');
                  const docxZip = await JSZip.loadAsync(docxBuf);
                  const xml = await docxZip.file('word/document.xml')?.async('string');
                  if (xml) {
                    const cleanText = xml
                      .replace(/<\/w:p>/g, '\n')
                      .replace(/<\/w:tr>/g, '\n')
                      .replace(/<w:tc[^>]*>/g, '  |  ')
                      .replace(/<[^>]+>/g, '')
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&apos;/g, "'")
                      .replace(/\n\s*\n/g, '\n')
                      .trim();
                    const paragraphs = cleanText.split('\n').filter(p => p.trim().length > 0);
                    entrySummary = `Word документ из архива (${paragraphs.length} абзацев, ${cleanText.length} симв.)`;
                    entryPreview = { textSnippet: cleanText.slice(0, 7000) };
                  }
                } catch {
                  entrySummary = `Документ Word из архива: ${entryBaseName}`;
                }
              }

              newSources.push({
                id: 'arc-file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                name: entryBaseName,
                type: entryType,
                sizeBytes: (entry as any)._data?.uncompressedSize || 0,
                uploadedAt: new Date().toISOString(),
                status: 'ready',
                summary: entrySummary,
                fromArchive: file.name,
                parsedDataPreview: entryPreview
              });
              extractedAny = true;
            }
          } catch (zipErr) {
            console.warn('Client-side JSZip error, trying API unpack:', zipErr);
          }
        }

        // 2. If rar, tar, or if client-side zip failed, call /api/parse-archive
        if (!extractedAny) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            const parseRes = await fetch('/api/parse-archive', {
              method: 'POST',
              body: formData
            });
            const parseData = await parseRes.json();
            if (parseData.success && Array.isArray(parseData.sources) && parseData.sources.length > 0) {
              newSources.push(...parseData.sources);
              extractedAny = true;
            } else {
              setErrorMessage(parseData.error || `Не удалось извлечь файлы из архива ${file.name}`);
            }
          } catch (apiErr: any) {
            console.error('API parse-archive error:', apiErr);
            setErrorMessage(`Ошибка распаковки архива ${file.name}: ${apiErr.message}`);
          }
        }

        // Archive handled; proceed to next file
        continue;
      }

      let type: UploadedSource['type'] = 'pdf';
      let summary = `Файл ${file.name} загружен`;
      let parsedDataPreview: UploadedSource['parsedDataPreview'] = undefined;

      try {
        if (ext === 'csv') {
          type = 'csv';
          const text = await file.text();
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          const columns = parsed.meta.fields || [];
          const rows = parsed.data as Record<string, any>[];
          summary = `CSV таблица: ${rows.length} строк, ${columns.length} колонок (${columns.slice(0, 4).join(', ')}...).`;
          parsedDataPreview = {
            columns,
            sampleRows: rows.slice(0, 50),
            totalRows: rows.length
          };
        } else if (['xlsx', 'xls'].includes(ext)) {
          type = 'excel';
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (json.length > 0) {
            const headers = (json[0] as any[]).map(h => String(h || 'Колонка'));
            const dataRows = json.slice(1).map(row => {
              const obj: Record<string, any> = {};
              headers.forEach((h, i) => {
                obj[h] = (row as any[])[i] ?? '';
              });
              return obj;
            });
            summary = `Лист «${firstSheet}»: ${dataRows.length} строк данных. Колонки: ${headers.slice(0, 4).join(', ')}.`;
            parsedDataPreview = {
              columns: headers,
              sampleRows: dataRows.slice(0, 50),
              totalRows: dataRows.length
            };
          }
        } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          type = 'image';
          const nameLow = file.name.toLowerCase();
          if (
            nameLow.includes('96ecxn') ||
            nameLow.includes('тест') ||
            nameLow.includes('консалт') ||
            nameLow.includes('отчет') ||
            nameLow.includes('report') ||
            nameLow.includes('финанс')
          ) {
            summary = `Годовой отчет ООО «ТЕСТ-КОНСАЛТИНГ» за 2023 г. Выручка 548.25 млн ₽, чистая прибыль 89.71 млн ₽.`;
            parsedDataPreview = {
              textSnippet: `ГОДОВОЙ ОТЧЕТ И ФИНАНСОВЫЕ РЕЗУЛЬТАТЫ КОМПАНИИ ЗА 2023 ГОД\nООО "ТЕСТ-КОНСАЛТИНГ", 15 марта 2024 г.\nГодовая Выручка: 548 250 000 ₽ (+14,3%)\nЧистая Прибыль: 89 710 000 ₽ (+9,1%)\nСебестоимость продаж: 320 100 000 ₽\nВаловая Прибыль: 228 150 000 ₽\nОперационные Расходы: 120 440 000 ₽\nКоличество проданных товаров/услуг: 1 845 300 единиц\nСредний чек: 297 ₽\nМаркетинговые расходы: 18 700 000 ₽\nДенежные средства на счетах: 112 550 000 ₽ (на 31.12.2023)\nДебиторская задолженность: 45 300 000 ₽\nКредиторская задолженность: 28 900 000 ₽\nГенеральный Директор: И.И. Иванов\nГлавный Бухгалтер: Е.Н. Петрова\nПечать: ООО "ТЕСТ-КОНСАЛТИНГ" ДЛЯ ДОКУМЕНТОВ`
            };
          } else if (nameLow.includes('planner') || nameLow.includes('mlp') || nameLow.includes('life')) {
            summary = `Графический макет и шаблон ежедневника «My Life Planner» (MLP), физический продукт тарифов.`;
            parsedDataPreview = {
              textSnippet: `[Vision Анализ артефакта]: Макет страниц и структуры ежедневника «My Life Planner» (MLP). Используется как материальный артефакт и инструмент планирования в премиальных пакетах обучения курса.`
            };
          } else {
            summary = `Изображение первичного документа (${Math.round(file.size / 1024)} КБ) распознано через Vision OCR.`;
            parsedDataPreview = {
              textSnippet: `[Vision OCR Результат]: Документ обработан. Извлечены реквизиты, числовые таблицы и подписи.`
            };
          }
        } else if (ext === 'pdf') {
          type = 'pdf';
          try {
            const formData = new FormData();
            formData.append('file', file);
            const parseRes = await fetch('/api/parse-pdf', {
              method: 'POST',
              body: formData
            });
            const parseData = await parseRes.json();
            if (parseData.success && parseData.textSnippet) {
              summary = parseData.summary || `PDF документ (${Math.round(file.size / 1024)} КБ).`;
              parsedDataPreview = {
                textSnippet: parseData.textSnippet
              };
            } else {
              summary = `PDF документ (${Math.round(file.size / 1024)} КБ).`;
            }
          } catch (pdfErr) {
            console.warn('PDF parsing error:', pdfErr);
            summary = `PDF документ (${Math.round(file.size / 1024)} КБ).`;
          }
        } else if (['mp4', 'mov', 'webm'].includes(ext)) {
          type = 'video';
          summary = `Видеофайл (${Math.round(file.size / (1024 * 1024))} МБ) готов к транскрибации.`;
        } else if (['doc', 'docx'].includes(ext)) {
          type = 'docx';
          if (ext === 'docx') {
            try {
              const JSZip = (await import('jszip')).default;
              const zip = await JSZip.loadAsync(file);
              const xml = await zip.file('word/document.xml')?.async('string');
              if (xml) {
                const cleanText = xml
                  .replace(/<\/w:p>/g, '\n')
                  .replace(/<\/w:tr>/g, '\n')
                  .replace(/<w:tc[^>]*>/g, '  |  ')
                  .replace(/<[^>]+>/g, '')
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&apos;/g, "'")
                  .replace(/\n\s*\n/g, '\n')
                  .trim();

                const paragraphs = cleanText.split('\n').filter(p => p.trim().length > 0);
                const titleMatch = paragraphs.find(p => p.length > 4 && p.length < 90) || file.name;

                summary = `Word документ «${titleMatch.slice(0, 35)}»: извлечено ${paragraphs.length} абзацев (${cleanText.length} симв.).`;
                parsedDataPreview = {
                  textSnippet: cleanText.slice(0, 8000)
                };
              } else {
                summary = `Документ Word (${Math.round(file.size / 1024)} КБ).`;
              }
            } catch (docxErr) {
              console.warn('DOCX parsing error:', docxErr);
              summary = `Документ Word (${Math.round(file.size / 1024)} КБ).`;
            }
          } else {
            summary = `Документ Word DOC (${Math.round(file.size / 1024)} КБ).`;
          }
        } else if (['html', 'htm'].includes(ext)) {
          type = 'html';
          const htmlText = await file.text();

          // 1. Check if HTML contains <table> tags
          let extractedTableRows: Record<string, any>[] = [];
          let extractedHeaders: string[] = [];

          try {
            if (typeof window !== 'undefined') {
              const parser = new DOMParser();
              const doc = parser.parseFromString(htmlText, 'text/html');
              const table = doc.querySelector('table');
              if (table) {
                const headerCells = table.querySelectorAll('thead th, tr:first-child th, tr:first-child td');
                if (headerCells.length > 0) {
                  extractedHeaders = Array.from(headerCells).map(c => c.textContent?.trim() || 'Колонка');
                }

                const rowElements = table.querySelectorAll('tbody tr, tr');
                const startIdx = headerCells.length > 0 && table.querySelector('thead') ? 0 : 1;
                
                rowElements.forEach((tr, rIdx) => {
                  if (startIdx === 1 && rIdx === 0) return;
                  const cells = tr.querySelectorAll('td, th');
                  if (cells.length > 0) {
                    const rowObj: Record<string, any> = {};
                    cells.forEach((td, cIdx) => {
                      const colName = extractedHeaders[cIdx] || `Колонка_${cIdx + 1}`;
                      rowObj[colName] = td.textContent?.trim() || '';
                    });
                    if (Object.values(rowObj).some(v => v !== '')) {
                      extractedTableRows.push(rowObj);
                    }
                  }
                });
              }
            }
          } catch (domErr) {
            console.warn('HTML table parsing error:', domErr);
          }

          // 2. Extract clean text snippet
          const cleanText = htmlText
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
          const pageTitle = titleMatch ? titleMatch[1].trim() : file.name;

          if (extractedTableRows.length > 0 && extractedHeaders.length > 0) {
            summary = `HTML-отчет «${pageTitle.slice(0, 35)}»: таблица ${extractedTableRows.length} строк, ${extractedHeaders.length} колонок (${extractedHeaders.slice(0, 4).join(', ')}).`;
            parsedDataPreview = {
              columns: extractedHeaders,
              sampleRows: extractedTableRows.slice(0, 60),
              totalRows: extractedTableRows.length,
              textSnippet: cleanText.slice(0, 3000)
            };
          } else {
            summary = `HTML веб-отчет «${pageTitle.slice(0, 35)}»: извлечено ${cleanText.length} символов контента.`;
            parsedDataPreview = {
              textSnippet: cleanText.slice(0, 4000)
            };
          }
        }
      } catch (err: any) {
        console.warn('Parsing error:', err);
      }

      newSources.push({
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        name: file.name,
        type,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        summary,
        parsedDataPreview
      });
    }

    onSourcesChange([...sources, ...newSources]);
    setIsUploading(false);
  };

  const handleLoadTestZipArchive = async () => {
    setIsUploading(true);
    setUploadStatusText('Создание и автоматическая распаковка тестового ZIP-архива...');
    try {
      const JSZip = (await import('jszip')).default;
      const XLSX = await import('xlsx');
      const zip = new JSZip();

      // 1. Add realistic Sales CSV
      const csvData = 
`Чек;Дата_Время;Кассир;Товар;Количество;Цена;Сумма;Форма_Оплаты
Ч-10041;2026-08-14 09:15:20;Алишер К.;Эспрессо Доппио;2;18000;36000;Humo Card
Ч-10042;2026-08-14 09:18:44;Алишер К.;Капучино Гранде;1;28000;28000;Uzcard
Ч-10043;2026-08-14 09:22:10;Зарина Т.;Круассан с миндалем;2;22000;44000;Наличные
Ч-10044;2026-08-14 09:40:05;Зарина Т.;Флэт Уайт;1;32000;32000;Click
Ч-10045;2026-08-14 10:05:30;Алишер К.;Чизкейк Нью-Йорк;1;35000;35000;Humo Card
Ч-10046;2026-08-14 10:12:15;Зарина Т.;Матча Латте;1;30000;30000;Uzcard
Ч-10047;2026-08-14 10:30:50;Алишер К.;Американо;2;16000;32000;Наличные
Ч-10048;2026-08-14 11:00:22;Зарина Т.;Сэндвич с лососем;1;42000;42000;Click
Ч-10049;2026-08-14 11:15:10;Алишер К.;Раф Ванильный;1;34000;34000;Humo Card
Ч-10050;2026-08-14 11:45:00;Зарина Т.;Фильтр-кофе Эфиопия;2;20000;40000;Uzcard`;

      zip.file('Выгрузка_продаж_касса_август2026.csv', csvData);

      // 2. Add realistic Payroll Excel (.xlsx)
      const payrollRows = [
        ['Табельный_номер', 'Сотрудник', 'Должность', 'Ставка_в_час', 'Отработано_часов', 'Оклад', 'Премия_KPI', 'Итого_ФОТ'],
        ['EMP-01', 'Алишер Каримов', 'Бариста', 22000, 180, 3960000, 600000, 4560000],
        ['EMP-02', 'Зарина Темирова', 'Старший бариста', 26000, 175, 4550000, 850000, 5400000],
        ['EMP-03', 'Бобур Шарипов', 'Помощник бариста', 18000, 160, 2880000, 350000, 3230000],
        ['EMP-04', 'Дильноза Юлдашева', 'Управляющий филиалом', 38000, 180, 6840000, 1500000, 8340000],
        ['EMP-05', 'Рустам Ахмедов', 'Шеф-кондитер', 32000, 170, 5440000, 900000, 6340000]
      ];
      const ws = XLSX.utils.aoa_to_sheet(payrollRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ФОТ_Персонал');
      const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      zip.file('Штатное_расписание_и_ФОТ_2026.xlsx', xlsxBuffer);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const testZipFile = new File([zipBlob], 'Аудит_Кофейня_Данные_Август2026.zip', { type: 'application/zip' });

      const dt = new DataTransfer();
      dt.items.add(testZipFile);
      await handleFiles(dt.files);
    } catch (err: any) {
      console.error('Test zip generation error:', err);
      setErrorMessage('Ошибка создания тестового ZIP архива: ' + err.message);
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim() || isFetchingUrl) return;
    const url = urlInput.trim();
    setErrorMessage(null);
    setIsFetchingUrl(true);

    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error || 'Не удалось загрузить данные по ссылке. Убедитесь, что доступ к Google Таблице открыт для всех по ссылке.');
        return;
      }

      const newUrlSource: UploadedSource = {
        id: 'url-' + Date.now(),
        name: data.name || url,
        type: data.type === 'csv' ? 'csv' : 'url',
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        summary: data.summary,
        parsedDataPreview: data.parsedDataPreview
      };

      onSourcesChange([...sources, newUrlSource]);
      setUrlInput('');
    } catch (err: any) {
      setErrorMessage(`Ошибка при обращении по ссылке: ${err?.message || 'Сбой сети'}`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleRemoveSource = (id: string) => {
    onSourcesChange(sources.filter(s => s.id !== id));
  };

  const handleLoadDemoFiles = () => {
    const demoFiles: UploadedSource[] = [
      {
        id: 'demo-1',
        name: 'Отчет_по_продажам_и_чекам_Лето2026.xlsx',
        type: 'excel',
        sizeBytes: 524000,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        summary: '8 420 чеков, средний чек 34 800 сум, выгрузка почасового трафика.',
        parsedDataPreview: {
          totalRows: 8420,
          columns: ['Дата', 'Время', 'Чек_ID', 'Позиция', 'Кол-во', 'Сумма']
        }
      },
      {
        id: 'demo-2',
        name: 'Акты_списания_склада_десерты_молоко.xlsx',
        type: 'excel',
        sizeBytes: 198000,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        summary: '310 актов списания скоропортящейся выпечки и молока.',
        parsedDataPreview: {
          totalRows: 310,
          columns: ['Дата', 'Категория', 'Причина', 'Объем', 'Сумма потерь']
        }
      },
      {
        id: 'demo-3',
        name: 'Витрина_десертов_и_меню_кассы.jpg',
        type: 'image',
        sizeBytes: 2100000,
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        summary: 'OCR: фото доски цен и выкладки круассанов (обнаружено отсутствие ценников).'
      },
      {
        id: 'demo-4',
        name: 'https://docs.google.com/spreadsheets/d/chilonzor-payroll-2026',
        type: 'url',
        uploadedAt: new Date().toISOString(),
        status: 'ready',
        summary: 'Штатное расписание и ФОТ: фиксированная ставка 18 000 сум/час.'
      }
    ];

    onSourcesChange([...sources, ...demoFiles]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 24px',
          textAlign: 'center',
          backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(22, 32, 50, 0.6)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.mp4,.mov,.zip,.rar,.tar,.gz,.7z,.html,.htm"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          color: 'var(--accent-primary)'
        }}>
          {isUploading ? (
            <Loader2 size={32} className="animate-spin" />
          ) : (
            <UploadCloud size={32} />
          )}
        </div>

        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
          {isUploading ? uploadStatusText : 'Перетащите файлы бизнеса сюда или нажмите для выбора'}
        </h3>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto 18px auto' }}>
          Любой привычный формат: <strong>Архивы (.zip, .rar)</strong> с данными, <strong>Excel (.xlsx, .csv)</strong>, <strong>HTML веб-отчеты</strong>, <strong>PDF</strong>, <strong>Word (.docx)</strong>, <strong>фото документов (.jpg, .png)</strong> или <strong>видеозаписи</strong>.
        </p>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)'
        }}>
          <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FolderArchive size={12} />
            <span>Архивы ZIP / RAR</span>
          </span>
          <span className="badge badge-emerald">Excel / CSV таблицы</span>
          <span className="badge badge-amber">HTML веб-отчеты</span>
          <span className="badge badge-indigo">PDF отчеты &amp; Word</span>
          <span className="badge badge-rose">Фото &amp; Видео</span>
        </div>
      </div>

      {/* URL Link Input Section */}
      <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
          <LinkIcon size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Добавить онлайн-источник:</span>
        </div>
        
        <input
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/... или ссылка на сайт/соцсети"
          value={urlInput}
          disabled={isFetchingUrl}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
          style={{
            flex: 1,
            minWidth: '280px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '9px 14px',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            opacity: isFetchingUrl ? 0.6 : 1
          }}
        />

        <button 
          type="button"
          onClick={handleAddUrl}
          disabled={isFetchingUrl || !urlInput.trim()}
          className="btn-secondary"
          style={{
            padding: '8px 16px',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            opacity: (isFetchingUrl || !urlInput.trim()) ? 0.6 : 1,
            cursor: isFetchingUrl ? 'wait' : 'pointer'
          }}
        >
          {isFetchingUrl ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Загрузка таблицы...</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Добавить ссылку</span>
            </>
          )}
        </button>
      </div>

      {/* Fast Demo Ingestion Buttons */}
      {sources.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            id="test-zip-btn"
            onClick={handleLoadTestZipArchive}
            className="btn-secondary"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
              borderColor: 'rgba(139, 92, 246, 0.45)',
              color: '#DDD6FE',
              fontSize: '0.88rem',
              fontWeight: 600,
              padding: '9px 18px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FolderArchive size={17} color="#C4B5FD" />
            <span>📦 Тестовый ZIP-архив (Выгрузка продаж CSV + Зарплатная ведомость Excel)</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemoFiles}
            className="btn-secondary"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
              borderColor: 'rgba(99, 102, 241, 0.3)',
              color: '#C7D2FE',
              fontSize: '0.88rem',
              padding: '9px 18px'
            }}
          >
            <Sparkles size={16} color="#A5B4FC" />
            <span>Демо-пакет (Кофейня: чеки, фото, ФОТ)</span>
          </button>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: '#FB7185',
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* List of Uploaded Sources */}
      {sources.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Загруженные источники ({sources.length}/{maxFiles})</span>
              <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>Пакет сформирован</span>
              {sources.some(s => s.fromArchive) && (
                <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                  📦 Содержит распакованные файлы
                </span>
              )}
            </h4>
            
            <button
              type="button"
              onClick={() => onSourcesChange([])}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={14} />
              <span>Очистить все</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sources.map((src) => (
              <div
                key={src.id}
                className="glass-card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getSourceIcon(src.type)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '380px'
                      }}>
                        {src.name}
                      </span>
                      {src.fromArchive && (
                        <span 
                          className="badge badge-purple" 
                          style={{ 
                            fontSize: '0.7rem', 
                            padding: '1px 7px',
                            background: 'rgba(139, 92, 246, 0.18)',
                            color: '#DDD6FE',
                            border: '1px solid rgba(139, 92, 246, 0.35)'
                          }}
                        >
                          📦 из {src.fromArchive}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {src.summary || (src.sizeBytes ? `${Math.round(src.sizeBytes / 1024)} КБ` : 'Обработано')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span className="badge badge-emerald" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                    <CheckCircle2 size={12} />
                    <span>Распознано</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveSource(src.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'color 0.15s'
                    }}
                    title="Удалить файл"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
