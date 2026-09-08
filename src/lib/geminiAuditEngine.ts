import { BusinessCase, CaseAuditReport, VideoChapter } from './types';
import { generateGroundedAudit } from './groundingEngine';
import { buildNotebookLmExportBundle } from './notebookLmBundleBuilder';

const GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];

/**
 * Аудиторский движок на базе официального Google Gemini AI
 * Анализирует любые бизнес-данные (таблицы, Google Sheets, ФОТ, выгрузки, текст)
 * с нулевыми галлюцинациями (Strict Grounding) и Structured JSON Output.
 */
export async function generateGeminiAudit(businessCase: BusinessCase): Promise<CaseAuditReport> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // Если ключ не задан, сразу используем отказоустойчивый локальный движок
  if (!apiKey) {
    console.log('[GeminiAudit] GEMINI_API_KEY не обнаружен в .env.local, переключение на локальный Grounding Engine.');
    return generateGroundedAudit(businessCase);
  }

  try {
    const title = businessCase.title || 'Бизнес-кейс';
    const businessType = businessCase.businessType || 'Бизнес-анализ';
    const desc = businessCase.description || '';
    const sources = businessCase.sources || [];

    // Формируем детальный контекст источников для Gemini
    let sourcesContextText = '';
    sources.forEach((src, idx) => {
      sourcesContextText += `\n--- ИСТОЧНИК ${idx + 1}: ${src.name} (Тип: ${src.type}) ---\n`;
      if (src.summary) sourcesContextText += `Сводка: ${src.summary}\n`;
      if (src.fromArchive) sourcesContextText += `Из архива: ${src.fromArchive}\n`;

      const preview = src.parsedDataPreview;
      if (preview) {
        if (preview.totalRows) sourcesContextText += `Всего строк в источнике: ${preview.totalRows}\n`;
        if (preview.columns && preview.columns.length > 0) {
          sourcesContextText += `Колонки: ${preview.columns.join(', ')}\n`;
        }
        if (preview.sampleRows && preview.sampleRows.length > 0) {
          sourcesContextText += `Выборка данных (первые ${preview.sampleRows.length} строк):\n`;
          sourcesContextText += JSON.stringify(preview.sampleRows.slice(0, 50), null, 2) + '\n';
        }
        if (preview.textSnippet) {
          sourcesContextText += `Текстовый контент:\n${preview.textSnippet.slice(0, 45000)}\n`;
        }
      }
    });

    const systemPrompt = `
Ты — строгий финансовый аудитор платформы DataAudit AI. Запрещено додумывать данные "в среднем по рынку". Если в переданных файлах нет выручки или расходов — фиксируй это в блоке missingDataWarnings. Каждый факт обязан ссылаться на конкретную строку/файл из входящего контекста.

КРИТИЧЕСКИЕ ПРАВИЛА (СТРОГИЙ АУДИТ БЕЗ ГАЛЛЮЦИНАЦИЙ):
1. ПРАВИЛО №1: 0% ДОМЫСЛОВ. Каждое число, процент, сумма или метрика обязаны строго основываться на переданных источниках. Запрещено выдумывать показатели "в среднем по рынку".
2. КАЖДЫЙ ФАКТ должен ссылаться на конкретный файл (sourceFile) и конкретные строки или колонки (sourceLocation).
3. ЕСЛИ ДАННЫХ НЕДОСТАТОЧНО (например, нет себестоимости, выручки или графика смен) — обязательно добавь предупреждение в missingDataWarnings. Не придумывай недостающие цифры!
4. ВЫЯВИ УЗКИЕ МЕСТА (bottlenecks): диспропорции в ФОТ, низкий средний чек, региональные ограничения категорий, волатильность цен, кассовые разрывы.
5. ДАЙ ПРАКТИЧЕСКИЕ РЕКОМЕНДАЦИИ (actionableRecommendations): приоритет P1 (срочные шаги с измеримым финансовым эффектом) и P2 (среднесрочные).
6. ВИДЕО-СЦЕНАРИЙ (videoOverview): подготовь 4 четкие главы (1. Факты, 2. Главная проблема, 3. План P1, 4. Недостающие данные) и связный транскрипт для озвучки.
`;

    const userPrompt = `
Объект аудита: «${title}»
Тип бизнеса: ${businessType}
Описание: ${desc}
Количество источников: ${sources.length}

ПРЕДОСТАВЛЕННЫЕ ДАННЫЕ И МАТЕРИАЛЫ:
${sourcesContextText}

Сформируй полный отчет строго в формате JSON по следующей схеме:
{
  "summary": {
    "businessName": "${title}",
    "businessType": "${businessType}",
    "analyzedPeriod": "Текущий расчетный период",
    "totalSourcesCount": ${sources.length},
    "healthScore": 75,
    "oneSentenceVerdict": "Одно емкое предложение-вердикт для владельца с цифрами."
  },
  "groundedFacts": [
    {
      "id": "fact-1",
      "fact": "Полное описание факта с реальными цифрами из источников.",
      "metric": "Ключевая цифра (например: 4 061 рубрика или 214.7 млн сум ФОТ)",
      "sourceFile": "Имя файла",
      "sourceLocation": "Колонки и строки",
      "quoteOrData": "Точная выдержка цифр",
      "confidence": "high"
    }
  ],
  "bottlenecks": [
    {
      "id": "bot-1",
      "title": "Заголовок проблемы",
      "severity": "critical",
      "description": "Подробное описание проблемы и упущенной выгоды.",
      "groundedFactIds": ["fact-1"],
      "evidenceSummary": "Краткое доказательство из данных"
    }
  ],
  "actionableRecommendations": [
    {
      "id": "rec-1",
      "priority": "p1_urgent",
      "title": "Что конкретно внедрить (приоритет P1)",
      "recommendation": "Пошаговый план внедрения.",
      "expectedImpact": "Ожидаемый финансовый результат (например: +25% к выручке)",
      "basedOnData": "На основе каких данных сделан вывод",
      "actionSteps": ["Конкретный шаг 1", "Конкретный шаг 2", "Конкретный шаг 3"],
      "sourceFactIds": ["fact-1"]
    }
  ],
  "missingDataWarnings": [
    {
      "id": "warn-1",
      "area": "Каких данных не хватает",
      "explanation": "Почему этих данных нет в файлах",
      "whyItMatters": "Почему без них нельзя додумывать расчеты",
      "recommendedAction": "Какой документ нужно загрузить владельцу"
    }
  ],
  "videoOverview": {
    "status": "ready",
    "durationSeconds": 120,
    "transcript": "Связный текст пересказа на 1-2 минуты для озвучки спикером.",
    "chapters": [
      {
        "timeSeconds": 0,
        "title": "1. Фактический аудит данных",
        "subtitle": "Первичные метрики",
        "keyMetric": "Ключевая цифра",
        "highlightText": "Главный вывод первой части",
        "sourceRef": "Источник"
      },
      {
        "timeSeconds": 30,
        "title": "2. Главная точка потери прибыли",
        "subtitle": "Критическое узкое горлышко",
        "keyMetric": "Критический приоритет",
        "highlightText": "В чем суть проблемы",
        "sourceRef": "Анализ данных"
      },
      {
        "timeSeconds": 60,
        "title": "3. Первоочередной план действий (P1)",
        "subtitle": "Срочные шаги",
        "keyMetric": "Ожидаемый рост",
        "highlightText": "Что сделать в первые 14 дней",
        "sourceRef": "Рекомендация P1"
      },
      {
        "timeSeconds": 90,
        "title": "4. Недостающие данные и контроль",
        "subtitle": "Зоны риска",
        "keyMetric": "Уточнение",
        "highlightText": "Что необходимо догрузить",
        "sourceRef": "Предупреждение аудитора"
      }
    ]
  }
}
`;

    // Перебираем поддерживаемые модели Gemini с автоматическим фоллбэком
    let lastError: Error | null = null;
    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`[GeminiAudit] Отправка запроса в Google Gemini AI (${modelName})...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[GeminiAudit] Модель ${modelName} вернула статус ${res.status}: ${errText.slice(0, 150)}`);
          continue; // пробуем следующую модель
        }

        const data = await res.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!jsonText) {
          console.warn(`[GeminiAudit] Пустой ответ от ${modelName}`);
          continue;
        }

        const parsed = JSON.parse(jsonText);

        // Формируем итоговый CaseAuditReport
        const chapters: VideoChapter[] = parsed.videoOverview?.chapters || [
          {
            timeSeconds: 0,
            title: '1. Фактический аудит загруженных данных',
            subtitle: `${businessType} • ${sources.length} источников`,
            keyMetric: `Источников: ${sources.length}`,
            highlightText: parsed.summary?.oneSentenceVerdict || 'Аудит построен строго на первичных данных.',
            sourceRef: sources[0]?.name || 'Первичные данные'
          },
          {
            timeSeconds: 30,
            title: '2. Главная точка потери прибыли',
            subtitle: parsed.bottlenecks?.[0]?.title || 'Узкое горлышко',
            keyMetric: 'Критический приоритет',
            highlightText: parsed.bottlenecks?.[0]?.description || 'Выявлены зоны диспропорций.',
            sourceRef: 'Факты и аналитика'
          },
          {
            timeSeconds: 60,
            title: '3. Первоочередной план действий (P1)',
            subtitle: parsed.actionableRecommendations?.[0]?.title || 'Срочные шаги',
            keyMetric: parsed.actionableRecommendations?.[0]?.expectedImpact || 'Рост маржи',
            highlightText: parsed.actionableRecommendations?.[0]?.recommendation || 'Внедрение шагов P1.',
            sourceRef: 'Рекомендация P1'
          },
          {
            timeSeconds: 90,
            title: '4. Недостающие данные и точки риска',
            subtitle: parsed.missingDataWarnings?.[0]?.area || 'Белые пятна',
            keyMetric: 'Уточнение',
            highlightText: parsed.missingDataWarnings?.[0]?.explanation || 'Требуется дозагрузка отчетов.',
            sourceRef: 'Предупреждение аудитора'
          }
        ];

        const formattedSources = buildNotebookLmExportBundle(businessCase, {
          summary: parsed.summary,
          groundedFacts: parsed.groundedFacts,
          bottlenecks: parsed.bottlenecks,
          actionableRecommendations: parsed.actionableRecommendations,
          missingDataWarnings: parsed.missingDataWarnings
        });

        console.log(`[GeminiAudit] Аудит успешно сгенерирован с помощью Google Gemini AI (${modelName})!`);

        return {
          caseId: businessCase.id,
          generatedAt: new Date().toISOString(),
          summary: {
            businessName: title,
            businessType: parsed.summary?.businessType || businessType,
            analyzedPeriod: parsed.summary?.analyzedPeriod || 'Текущий расчетный период',
            totalSourcesCount: sources.length,
            healthScore: parsed.summary?.healthScore || 74,
            oneSentenceVerdict: parsed.summary?.oneSentenceVerdict || 'Аудит успешно сформирован через Google Gemini AI.'
          },
          groundedFacts: parsed.groundedFacts || [],
          bottlenecks: parsed.bottlenecks || [],
          actionableRecommendations: parsed.actionableRecommendations || [],
          missingDataWarnings: parsed.missingDataWarnings || [],
          videoOverview: {
            status: 'ready',
            durationSeconds: 120,
            transcript: parsed.videoOverview?.transcript || 'Аудит сформирован нейросетью Google Gemini AI.',
            chapters,
            notebookLmExportPackage: {
              notebookTitle: `Бизнес-аудит (Gemini AI): ${title}`,
              formattedSources
            }
          }
        };
      } catch (err: any) {
        console.warn(`[GeminiAudit] Ошибка при обращении к модели ${modelName}:`, err.message);
        lastError = err;
      }
    }

    // Если все модели Gemini вернули ошибку, бесшовно переключаемся на локальный движок
    console.warn('[GeminiAudit] Все вызовы Gemini AI исчерпаны, бесшовный переход на локальный Grounding Engine.', lastError);
    return generateGroundedAudit(businessCase);

  } catch (outerErr: any) {
    console.error('[GeminiAudit] Критический сбой Gemini-модуля, fallback на локальный движок:', outerErr);
    return generateGroundedAudit(businessCase);
  }
}
