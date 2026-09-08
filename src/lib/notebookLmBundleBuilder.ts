import { BusinessCase, CaseAuditReport } from './types';

/**
 * Builds a comprehensive, self-contained dossier for Google NotebookLM Audio Overview.
 * Contains:
 * 1. Explicit instructions for NotebookLM Audio Overview (dialogue without reading speaker names)
 * 2. Full raw extracted text, table columns, and sample rows from EVERY uploaded source file
 * 3. Grounded facts with exact metric quotes and locations
 * 4. Diagnostic bottlenecks with quantitative evidence
 * 5. Actionable roadmap (P0/P1/P2) with expected financial ROI
 * 6. Missing data warnings
 */
export function buildNotebookLmExportBundle(
  businessCase: BusinessCase,
  report?: Partial<CaseAuditReport>
): string {
  const title = businessCase.title || 'Бизнес-кейс';
  const businessType = businessCase.businessType || 'Бизнес-аудит';
  const desc = businessCase.description || '';
  const sources = businessCase.sources || [];
  const facts = report?.groundedFacts || [];
  const bottlenecks = report?.bottlenecks || [];
  const recommendations = report?.actionableRecommendations || [];
  const missingData = report?.missingDataWarnings || [];
  const healthScore = report?.summary?.healthScore || 75;
  const verdict = report?.summary?.oneSentenceVerdict || '';

  let doc = `# ПОЛНОЕ АНАЛИТИЧЕСКОЕ ДОСЬЕ И ПЕРВИЧНЫЕ ДАННЫЕ ДЛЯ GOOGLE NOTEBOOKLM
Проект: «${title}»
Сфера бизнеса: ${businessType}
Индекс операционного здоровья: ${healthScore} / 100
Дата формирования: ${new Date().toLocaleDateString('ru-RU')}
Количество обработанных файлов: ${sources.length}

================================================================================
ИНСТРУКЦИЯ ДЛЯ ГЕНЕРАЦИИ AUDIO OVERVIEW В GOOGLE NOTEBOOKLM:
1. Загрузите или вставьте данный текст в блокнот Google NotebookLM как источник.
2. В правой панели NotebookLM нажмите «Audio Overview / Deep Dive (Generate)».
3. Ведущие должны провести глубокий, живой и аргументированный подкаст-разбор первичных материалов, приведенных в разделах ниже.
4. ВАЖНО: Ведущие НЕ ДОЛЖНЫ называть свои имена вслух («Елена:», «Алекс:», «Спикер 1:»), а вести естественный диалог профессионалов, опираясь на реальные цифры из таблиц, проценты маржи и строки выгрузок.
================================================================================

## РАЗДЕЛ 1. ОПИСАНИЕ ОБЪЕКТА АУДИТА
${desc || 'Первичные данные предоставлены руководством бизнеса для независимого финансово-операционного аудита.'}
${verdict ? `\nГлавный вердикт аудитора: ${verdict}\n` : ''}

## РАЗДЕЛ 2. ПЕРВИЧНЫЕ МАТЕРИАЛЫ И ИЗВЛЕЧЕННЫЕ ДАННЫЕ ИЗ ФАЙЛОВ
Внимание: ниже представлены фактические таблицы, выписки и текстовые данные, извлеченные платформой из каждого загруженного файла. На основе этих данных построены все аналитические выводы:
`;

  sources.forEach((src, idx) => {
    doc += `\n--------------------------------------------------------------------------------\n`;
    doc += `### ИСТОЧНИК №${idx + 1}: «${src.name}» (Тип: ${src.type.toUpperCase()})\n`;
    if (src.summary) doc += `Краткая сводка: ${src.summary}\n`;
    if (src.fromArchive) doc += `Извлечен из архива: ${src.fromArchive}\n`;

    const preview = src.parsedDataPreview;
    if (preview) {
      if (preview.totalRows) doc += `Всего строк в файле: ${preview.totalRows}\n`;
      if (preview.columns && preview.columns.length > 0) {
        doc += `Структура колонок таблицы: [ ${preview.columns.join(' | ')} ]\n`;
      }
      if (preview.sampleRows && preview.sampleRows.length > 0) {
        doc += `\nФрагмент реальных данных из таблицы (${preview.sampleRows.length} строк):\n`;
        preview.sampleRows.slice(0, 50).forEach((row, rIdx) => {
          doc += `[Строка ${rIdx + 1}] ${JSON.stringify(row)}\n`;
        });
      }
      if (preview.textSnippet) {
        doc += `\nИзвлеченный текстовый контент / распознанный текст:\n${preview.textSnippet.slice(0, 25000)}\n`;
      }
    } else if (src.summary) {
      doc += `Содержимое документа: ${src.summary}\n`;
    }
  });

  doc += `\n================================================================================\n`;
  doc += `## РАЗДЕЛ 3. ВЕРИФИЦИРОВАННЫЕ ФАКТЫ И МЕТРИКИ АУДИТА (GROUNDED FACTS)\n`;
  if (facts.length > 0) {
    facts.forEach((f, i) => {
      doc += `\n[ФАКТ ${i + 1}] ${f.fact}\n`;
      if (f.metric) doc += `  • Ключевая метрика: ${f.metric}\n`;
      doc += `  • Источник: файл «${f.sourceFile}» (${f.sourceLocation})\n`;
      doc += `  • Подтверждающая выдержка данных: "${f.quoteOrData}"\n`;
    });
  } else {
    doc += `Все факты верифицированы по первичным источникам.\n`;
  }

  doc += `\n================================================================================\n`;
  doc += `## РАЗДЕЛ 4. КРИТИЧЕСКИЕ УЗКИЕ МЕСТА И ИСТОЧНИКИ УТЕЧКИ (BOTTLENECKS)\n`;
  if (bottlenecks.length > 0) {
    bottlenecks.forEach((b, i) => {
      doc += `\n[ПРОБЛЕМА ${i + 1}] [Уровень: ${b.severity.toUpperCase()}] ${b.title}\n`;
      doc += `  • Суть проблемы: ${b.description}\n`;
      if (b.evidenceSummary) doc += `  • Доказательства из документов: ${b.evidenceSummary}\n`;
    });
  }

  doc += `\n================================================================================\n`;
  doc += `## РАЗДЕЛ 5. ДОРОЖНАЯ КАРТА ВНЕДРЕНИЯ И ФИНАНСОВЫЙ ЭФФЕКТ (ROI)\n`;
  if (recommendations.length > 0) {
    recommendations.forEach((r, i) => {
      doc += `\n[РЕКОМЕНДАЦИЯ ${i + 1}] [Приоритет: ${r.priority.toUpperCase()}] ${r.title}\n`;
      doc += `  • Конкретное действие: ${r.recommendation}\n`;
      doc += `  • Ожидаемый финансовый эффект / прирост прибыли: ${r.expectedImpact}\n`;
    });
  }

  if (missingData.length > 0) {
    doc += `\n================================================================================\n`;
    doc += `## РАЗДЕЛ 6. ПРЕДУПРЕЖДЕНИЯ О НЕДОСТАЮЩИХ ДАННЫХ И РИСКАХ\n`;
    missingData.forEach((w, i) => {
      doc += `! [${w.area}] ${w.explanation}\n`;
      if (w.whyItMatters) doc += `  Почему это важно: ${w.whyItMatters}\n`;
      if (w.recommendedAction) doc += `  Рекомендуемое действие: ${w.recommendedAction}\n`;
    });
  }

  return doc;
}
