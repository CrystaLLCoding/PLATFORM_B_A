import { NextResponse } from 'next/server';
import Papa from 'papaparse';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL не указан' }, { status: 400 });
    }

    const trimmedUrl = url.trim();

    // 1. Check if Google Sheets URL
    const googleSheetMatch = trimmedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
    
    if (googleSheetMatch) {
      const sheetId = googleSheetMatch[1];
      const gidMatch = trimmedUrl.match(/[#&?]gid=([0-9]+)/i);
      const gid = gidMatch ? gidMatch[1] : undefined;

      const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;

      try {
        const response = await fetch(exportCsvUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        // Check if access is restricted
        if (response.url.includes('accounts.google.com') || response.status === 401 || response.status === 403) {
          return NextResponse.json({
            success: false,
            error: 'Google Таблица закрыта настройками приватности. Включите доступ: «Все, у кого есть ссылка — читатель» или скачайте файл как Excel/CSV.'
          }, { status: 403 });
        }

        if (!response.ok) {
          return NextResponse.json({
            success: false,
            error: `Ошибка доступа к Google Таблице (HTTP ${response.status}). Проверьте ссылку.`
          }, { status: 400 });
        }

        const csvText = await response.text();

        // Check if response is HTML login page instead of CSV
        if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html') || csvText.includes('Sign in - Google Accounts')) {
          return NextResponse.json({
            success: false,
            error: 'Google требует авторизацию. Откройте доступ по ссылке: Настройки доступа → Доступ ограничен → Все, у кого есть ссылка.'
          }, { status: 403 });
        }

        // Parse CSV text
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const columns = (parsed.meta.fields || []).filter(f => f && f.trim().length > 0);
        const rows = (parsed.data as Record<string, any>[]).filter(r => {
          return Object.values(r).some(v => v !== undefined && String(v).trim().length > 0);
        });

        const sheetName = `Google Таблица (${sheetId.substring(0, 8)}...)`;
        const summary = `Google Таблица (онлайн подключение): ${rows.length} строк, ${columns.length} колонок (${columns.slice(0, 4).join(', ')}).`;

        return NextResponse.json({
          success: true,
          type: 'csv',
          name: sheetName,
          url: trimmedUrl,
          summary,
          parsedDataPreview: {
            columns,
            sampleRows: rows.slice(0, 60),
            totalRows: rows.length
          }
        });
      } catch (fetchErr: any) {
        return NextResponse.json({
          success: false,
          error: `Не удалось загрузить Google Таблицу: ${fetchErr.message}`
        }, { status: 500 });
      }
    }

    // 2. Generic Web URL
    try {
      const response = await fetch(trimmedUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `Сервер вернул статус HTTP ${response.status} при обращении по ссылке`
        }, { status: 400 });
      }

      const html = await response.text();
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : trimmedUrl;

      // Extract basic text snippet
      const cleanText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const summary = `Веб-страница «${pageTitle.slice(0, 40)}»: извлечено ${cleanText.length} символов контента.`;

      return NextResponse.json({
        success: true,
        type: 'url',
        name: pageTitle.slice(0, 60),
        url: trimmedUrl,
        summary,
        parsedDataPreview: {
          textSnippet: cleanText.slice(0, 3000)
        }
      });
    } catch (urlErr: any) {
      return NextResponse.json({
        success: false,
        error: `Не удалось загрузить веб-страницу: ${urlErr.message}`
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
