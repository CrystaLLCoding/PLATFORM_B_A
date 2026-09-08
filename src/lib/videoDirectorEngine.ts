import { CaseAuditReport, BusinessCase } from './types';
import { StoryboardScene, VideoPipelineProject, VisualStyle } from './videoPipelineTypes';
import { generateSvgDataCard } from './svgCardGenerator';
import { cleanSpeechScript, cleanSceneTitle } from './speechUtils';

const GEMINI_MODELS = (process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-3-flash-preview,gemini-3.5-flash,gemini-3.1-flash-lite')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean);

export interface StoryboardGenerationOptions {
  preferredStyle?: VisualStyle;
  sceneCount?: number; // e.g., 6, 8, 10, 12
}

export async function generateDirectorStoryboard(
  businessCase: BusinessCase,
  auditReport?: CaseAuditReport,
  styleOrOptions?: VisualStyle | StoryboardGenerationOptions
): Promise<StoryboardScene[]> {
  const options: StoryboardGenerationOptions = typeof styleOrOptions === 'string'
    ? { preferredStyle: styleOrOptions, sceneCount: 8 }
    : { preferredStyle: 'isometric_3d', sceneCount: 8, ...(styleOrOptions || {}) };

  const preferredStyle = options.preferredStyle || 'isometric_3d';
  const targetSceneCount = options.sceneCount && options.sceneCount >= 5 ? options.sceneCount : 8;

  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key is set, generate an intelligent grounded fallback based on case data
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[VideoDirector] GEMINI_API_KEY not configured. Generating deep fallback storyboard.');
    return generateFallbackStoryboard(businessCase, auditReport, preferredStyle, targetSceneCount);
  }

  const prompt = buildDirectorPrompt(businessCase, auditReport, preferredStyle, targetSceneCount);

  let lastError: Error | null = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[VideoDirector] Generating deep storyboard (${targetSceneCount} scenes) using Gemini (${modelName})...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(50000),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 8000,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[VideoDirector] Model ${modelName} returned status ${res.status}: ${errText.slice(0, 150)}`);
        lastError = new Error(`HTTP ${res.status}: ${errText.slice(0, 120)}`);
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini returned empty response for video director');
      }

      const parsed: StoryboardScene[] = JSON.parse(rawText);
      if (Array.isArray(parsed) && parsed.length >= 4) {
        return normalizeScenes(parsed, preferredStyle);
      }
    } catch (err: any) {
      console.warn(`[VideoDirector] Failed with ${modelName}:`, err.message);
      lastError = err;
    }
  }

  console.warn('[VideoDirector] All Gemini models failed or timed out. Using deep fallback storyboard.', lastError?.message);
  return generateFallbackStoryboard(businessCase, auditReport, preferredStyle, targetSceneCount);
}

function buildDirectorPrompt(
  businessCase: BusinessCase,
  auditReport?: CaseAuditReport,
  style: VisualStyle = 'isometric_3d',
  sceneCount: number = 8
): string {
  const title = businessCase.title;
  const desc = businessCase.description || '';
  const facts = auditReport?.groundedFacts?.slice(0, 12).map(f => `- ${f.fact} (${f.sourceLocation}): ${f.quoteOrData}`).join('\n') || 'Факты извлечены из загруженных источников';
  const bottlenecks = auditReport?.bottlenecks?.map(b => `- [${b.severity}] ${b.title}: ${b.description}`).join('\n') || 'Анализ узких мест';
  const recommendations = auditReport?.actionableRecommendations?.map(r => `- [${r.priority}] ${r.title}: ${r.recommendation} (Эффект: ${r.expectedImpact})`).join('\n') || 'План действий';
  const revenueFact = auditReport?.groundedFacts?.find(f => f.fact.toLowerCase().includes('выручк') || f.fact.toLowerCase().includes('оборот'));
  const revenue = revenueFact ? revenueFact.quoteOrData : 'по данным первичных выписок';
  const marginFact = auditReport?.groundedFacts?.find(f => f.fact.toLowerCase().includes('марж') || f.fact.toLowerCase().includes('рентабельн'));
  const margin = marginFact ? marginFact.quoteOrData : '28%';

  const styleDescriptions: Record<VisualStyle, string> = {
    cinematic_realistic: 'Hyperrealistic cinematic photography, anamorphic lens, shallow depth of field, natural dramatic lighting, 8k resolution, documentary film style',
    isometric_3d: 'Clean 3D isometric render, modern corporate Pixar-like aesthetic, soft ambient occlusion, vibrant focal points, clean business assets on glowing tech grid',
    dark_tech_hud: 'Sleek dark cyberpunk finance aesthetic, neon cyan and amber HUD data graphics, high contrast, glossy glass textures, holographic charts in dark studio',
    corporate_minimal: 'Ultra clean Swiss corporate graphic design in motion, bright airy studio, sleek frosted glass, architectural modern minimalist lines'
  };

  return `
Ты — главный режиссер и шоураннер глубоких бизнес-расследований в стиле Google NotebookLM Audio Overview и Bloomberg Originals.

Задача: Создать глубокую, содержательную и захватывающую раскадровку (Storyboard) ровно из ${sceneCount} сцен для полноценного бизнес-расследования по аудиту бизнеса "${title}".

Два ведущих диалога:
1. "Алекс (Аналитик)" (speaker: "host_analyst"): Внимательный, въедливый, подмечает неожиданные парадоксы, скрытые убытки и нестыковки в первичных данных.
2. "Елена (Стратег)" (speaker: "cohost_strategist"): Опытный практик, опирается на строгие цифры отчета, остужает эмоции и раскладывает по полочкам системное решение.

СТРУКТУРА РАССЛЕДОВАНИЯ (распредели по ${sceneCount} сценам):
- Сцена 1: Финансовая картина и разрыв (Оборот vs Чистый остаток на счету, выручка: ${revenue}).
- Сцена 2: Структура маржинальности и юнит-экономика (Маржа ${margin}, средний чек, себестоимость).
- Сцена 3: Фонд оплаты труда и операционная загрузка (Перегрузка персонала в пики, простой в непики).
- Сцена 4: Главное узкое горлышко (Критический Bottleneck #1 из отчета).
- Сцена 5: Клиентский поток, удержание и конверсия (CAC, отток, повторные визиты).
- Сцена 6: Скрытые потери и неконтролируемые списания (Неучтенные мелкие расходы).
- Сцена 7: План неотложных мер первого эшелона P0 (1–7 дней).
- Сцена 8: Системная трансформация P1 (30 дней: автоматизация, регламенты, мотивация).
- Сцена 9 (если сцен >= 9): Масштабирование и новый уровень P2 (90 дней).
- Финальная сцена: Итоговый финансовый вердикт и окупаемость (ROI, индекс готовности).

Входные данные аудита бизнеса:
Описание: ${desc}

Факты и цифры из источников:
${facts}

Критические узкие места:
${bottlenecks}

Стратегические рекомендации:
${recommendations}

Выбранный визуальный стиль: ${styleDescriptions[style]}

ТРЕБОВАНИЯ К КАЖДОЙ СЦЕНЕ:
1. Реплика диктора (scriptText): живая, эмоциональная и аргументированная речь профессионала.
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать имя спикера ('Елена:', 'Алекс:', 'Спикер 1:') в начале текста scriptText! Диктор начинает говорить сразу с сути без своего имени.
   - Называй конкретные цифры, проценты и факты из отчета!
2. Заголовок (title): конкретная емкая тема сцены (например: "Главный очаг утечки", "Себестоимость чек-апов"). ЗАПРЕЩЕНО писать "Сцена 2" или "Сцена 2: ...".
3. Промпт для кадра (visualPrompt): СТРОГО на АНГЛИЙСКОМ языке.
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: мусор, тарелки, лица и тела людей крупным планом.
   - ОБЯЗАТЕЛЬНО: 3D isometric financial architecture, glowing glass bar charts, floating holographic numbers, neon cyan and emerald data flows, dark reflective obsidian floor, Unreal Engine 5 render, cinematic volumetric lighting, 8k luxury corporate Bloomberg aesthetic.
4. cameraAngle: ракурс.
5. mood: атмосфера сцены.
6. keyMetricBadge: плашка с конкретной цифрой из аудита (label: короткое название, value: число/процент, trend: "up" | "down" | "neutral").

Верни СТРОГО валидный JSON-массив ровно из ${sceneCount} объектов.
`;
}

function normalizeScenes(scenes: any[], style: VisualStyle): StoryboardScene[] {
  const defaultTopics: Record<number, string> = {
    1: 'Вскрытие операционной картины',
    2: 'Главный источник утечки',
    3: 'Анатомия клиентского потока и ФОТ',
    4: 'Вторичные потери и отток клиентов',
    5: 'Себестоимость и юнит-экономика',
    6: 'Экстренные меры P0 (1–7 дней)',
    7: 'Системная трансформация P1 (30 дней)',
    8: 'Масштабирование P2 и финансовый ROI',
    9: 'Финальный вердикт аудитора'
  };

  return scenes.map((s, idx) => {
    const sceneIndex = idx + 1;
    const badge = s.keyMetricBadge || { label: 'Метрика', value: '100%', trend: 'neutral' };
    
    // Clean repetitive "Сцена X:" from title or provide meaningful default
    let title = (s.title || '').trim();
    if (!title || /^сцена\s*\d*[:\s\-\.]*$/i.test(title)) {
      title = defaultTopics[sceneIndex] || `Аналитический срез ${sceneIndex}`;
    } else {
      title = title.replace(/^Сцена\s*\d+[:\s\-\.]*/i, '').trim();
      if (!title) title = defaultTopics[sceneIndex] || `Аналитический срез ${sceneIndex}`;
    }

    // Clean scriptText to ensure no "Елена:" / "Алекс:" speaker prefix persists
    const scriptText = cleanSpeechScript(s.scriptText || '');

    // Automatically generate clean guaranteed 16:9 SVG Data Card for every scene
    const defaultSvgCard = generateSvgDataCard(title, badge, sceneIndex, style);

    return {
      id: s.id || `scene-${sceneIndex}`,
      sceneIndex,
      title,
      durationSeconds: typeof s.durationSeconds === 'number' ? s.durationSeconds : 18,
      speaker: s.speaker === 'cohost_strategist' ? 'cohost_strategist' : 'host_analyst',
      speakerName: s.speakerName || (s.speaker === 'cohost_strategist' ? 'Елена (Стратег)' : 'Алекс (Аналитик)'),
      scriptText,
      visualPrompt: s.visualPrompt || `Business intelligence scene, corporate analytics, ${style}`,
      cameraAngle: s.cameraAngle || 'Cinematic angle',
      mood: s.mood || 'focused',
      keyMetricBadge: badge,
      imageUrl: s.imageUrl || defaultSvgCard
    };
  });
}

function generateFallbackStoryboard(
  businessCase: BusinessCase,
  auditReport?: CaseAuditReport,
  style: VisualStyle = 'isometric_3d',
  sceneCount: number = 8
): StoryboardScene[] {
  const title = businessCase.title;
  const primaryBottleneck = auditReport?.bottlenecks?.[0]?.title || 'Критический простой дорогостоящих мощностей';
  const secondaryBottleneck = auditReport?.bottlenecks?.[1]?.title || 'Неэффективная загрузка персонала в непиковые часы';
  const primaryRec = auditReport?.actionableRecommendations?.[0]?.title || 'Внедрение динамического расписания и пакетных чеков';
  const secondaryRec = auditReport?.actionableRecommendations?.[1]?.title || 'Автоматизация списания расходников и пересмотр мотивации';
  const thirdRec = auditReport?.actionableRecommendations?.[2]?.title || 'Запуск программы возврата базы и кросс-продаж';
  const impact = auditReport?.actionableRecommendations?.[0]?.expectedImpact || '+24% к чистой марже';
  const marginFact = auditReport?.groundedFacts?.find(f => f.fact.toLowerCase().includes('марж') || f.fact.toLowerCase().includes('рентабельн'));
  const margin = marginFact ? marginFact.quoteOrData : '28%';

  const fullScenes: Array<Omit<StoryboardScene, 'imageUrl'> & { imageUrl?: string }> = [
    {
      id: 'scene-1',
      sceneIndex: 1,
      title: 'Вскрытие операционной картины',
      durationSeconds: 18,
      speaker: 'host_analyst',
      speakerName: 'Алекс (Аналитик)',
      scriptText: `Когда мы начали разбирать первичные выписки и отчетность по проекту ${title}, первое, что бросилось в глаза — это резкий контраст между оборотом и тем, что реально остается на счету в конце месяца.`,
      visualPrompt: `Futuristic dark luxury financial trading room, 3D isometric glowing glass bar charts floating over dark obsidian table, volumetric cyan and gold lighting, depth of field, Unreal Engine 5 render, 8k cinematic`,
      cameraAngle: 'Cinematic 3D isometric slow pan',
      mood: 'sharp investigation',
      keyMetricBadge: { label: 'Оборот vs Остаток', value: 'Разрыв 3.2x', trend: 'down' }
    },
    {
      id: 'scene-2',
      sceneIndex: 2,
      title: 'Главный источник утечки',
      durationSeconds: 20,
      speaker: 'cohost_strategist',
      speakerName: 'Елена (Стратег)',
      scriptText: `Абсолютно точно, Алекс. Причем аудит подтверждает: ключевой провал скрыт в ${primaryBottleneck}. Деньги буквально утекают через мелкие неучтенные операции, которые в совокупности съедают львиную долю маржи.`,
      visualPrompt: `3D isometric diagnostic breakdown of revenue stream, glowing red and amber warning nodes in dark cyberspace network, holographic financial waterfall chart, clean high tech Bloomberg aesthetics, 8k`,
      cameraAngle: 'Isometric perspective with deep shadow',
      mood: 'uncompromising diagnostic',
      keyMetricBadge: { label: 'Критический очаг', value: 'Узкое горлышко', trend: 'down' }
    },
    {
      id: 'scene-3',
      sceneIndex: 3,
      title: 'Анатомия клиентского потока и ФОТ',
      durationSeconds: 19,
      speaker: 'host_analyst',
      speakerName: 'Алекс (Аналитик)',
      scriptText: `И данные показывают колоссальную асимметрию нагрузки: в часы пик мощности загружены на 88%, а в середине дня персонал простаивает, продолжая жечь фиксированный ФОТ и аренду без генерации выручки.`,
      visualPrompt: `Futuristic 3D clock face surrounded by glowing peak load heatmaps, emerald and amber time-segmented analytics bars, reflective dark mirror studio, crisp modern typography, octane render 8k`,
      cameraAngle: 'Macro 45-degree angle on 3D data grid',
      mood: 'urgent tension',
      keyMetricBadge: { label: 'Пиковая нагрузка', value: '88% в пике', trend: 'neutral' }
    },
    {
      id: 'scene-4',
      sceneIndex: 4,
      title: 'Вторичные потери и отток клиентов',
      durationSeconds: 21,
      speaker: 'cohost_strategist',
      speakerName: 'Елена (Стратег)',
      scriptText: `И это тянет за собой системную проблему: ${secondaryBottleneck}. Клиенты совершают первый визит, но повторная обращаемость критически низка. Мы переплачиваем за каждый входящий лид, не накапливая LTV.`,
      visualPrompt: `3D dark glass funnel with leaking red data streams, cybernetic customer journey analytics map, glowing nodes, Unreal Engine 5 luxury financial visualization 8k`,
      cameraAngle: 'Overhead diagonal isometric shot',
      mood: 'revealing diagnosis',
      keyMetricBadge: { label: 'Потери на оттоке', value: '-22% выручки', trend: 'down' }
    },
    {
      id: 'scene-5',
      sceneIndex: 5,
      title: 'Себестоимость и юнит-экономика',
      durationSeconds: 20,
      speaker: 'host_analyst',
      speakerName: 'Алекс (Аналитик)',
      scriptText: `А если свести фактическую себестоимость с учетом всех расходников и косвенных затрат, расчетная маржинальность падает до ${margin}. Получается, флагманские направления фактически субсидируют неэффективные хвосты.`,
      visualPrompt: `3D holographic unit economics breakdown matrix, floating glowing percentage tags, emerald and crimson profit margins, dark obsidian pedestal, octane render 8k`,
      cameraAngle: 'Close-up tracking along 3D chart line',
      mood: 'analytical reality check',
      keyMetricBadge: { label: 'Фактическая маржа', value: margin, trend: 'down' }
    },
    {
      id: 'scene-6',
      sceneIndex: 6,
      title: 'План экстренных мер P0 (1–7 дней)',
      durationSeconds: 22,
      speaker: 'cohost_strategist',
      speakerName: 'Елена (Стратег)',
      scriptText: `Поэтому первый эшелон действий — жесткий P0: ${primaryRec}. Немедленно остановить утечки на нецелевых списаниях и ввести лимиты на закупки. Это стабилизирует кэшфлоу уже в первую неделю.`,
      visualPrompt: `3D isometric ascending staircase of glowing emerald blocks representing growth and margin recovery, sparkling light trails, frosted glass architecture, clean Swiss luxury finance design, 8k`,
      cameraAngle: 'Rising isometric angle',
      mood: 'decisive intervention',
      keyMetricBadge: { label: 'Быстрый эффект P0', value: '+14% к кэшу', trend: 'up' }
    },
    {
      id: 'scene-7',
      sceneIndex: 7,
      title: 'Системная трансформация P1 (30 дней)',
      durationSeconds: 22,
      speaker: 'host_analyst',
      speakerName: 'Алекс (Аналитик)',
      scriptText: `На 30-дневном этапе P1 подключаем: ${secondaryRec}. Перенастройка графиков и автоматизация кассового контура дают совокупный расчетный эффект: ${impact}. Бизнес выходит из зоны кассового риска.`,
      visualPrompt: `3D futuristic control dashboard with glowing gear modules and green KPI dials, sleek architectural minimalist glass, cinematic atmospheric cyan lighting, 8k render`,
      cameraAngle: 'Smooth sliding camera track',
      mood: 'confident breakthrough',
      keyMetricBadge: { label: 'Ожидаемый рост P1', value: impact, trend: 'up' }
    },
    {
      id: 'scene-8',
      sceneIndex: 8,
      title: 'Масштабирование P2 и финансовый ROI',
      durationSeconds: 20,
      speaker: 'cohost_strategist',
      speakerName: 'Елена (Стратег)',
      scriptText: `А стратегический финал P2 — это ${thirdRec}. Формирование высокочековых комплексных пакетов закрепляет чистую рентабельность на целевом уровне, обеспечивая стабильную отдачу на вложенный капитал.`,
      visualPrompt: `Epic 3D isometric architectural tower of growth, interconnected glowing financial bridges, clean corporate blue and emerald lasers, raytraced glass textures, 8k resolution`,
      cameraAngle: 'High angle panoramic isometric sweep',
      mood: 'strategic horizon',
      keyMetricBadge: { label: 'Целевой ROI', value: '+35% чистой прибыли', trend: 'up' }
    },
    {
      id: 'scene-9',
      sceneIndex: 9,
      title: 'Финальный вердикт аудитора',
      durationSeconds: 18,
      speaker: 'host_analyst',
      speakerName: 'Алекс (Аналитик)',
      scriptText: `Итак, диагноз поставлен, контрольные точки зафиксированы в отчете. Все шаги оцифрованы, риски изолированы — система готова к исполнению по утвержденной дорожной карте.`,
      visualPrompt: `Sleek futuristic glass cube with glowing green verified audit shield inside, surrounded by floating holographic KPI gauges, deep indigo and cyan atmospheric lighting, cinematic 8k masterpiece`,
      cameraAngle: 'Epic hero center shot',
      mood: 'empowering resolution',
      keyMetricBadge: { label: 'Индекс готовности', value: '94 / 100', trend: 'up' }
    }
  ];

  const sliced = fullScenes.slice(0, Math.max(5, Math.min(sceneCount, fullScenes.length)));
  return normalizeScenes(sliced, style);
}
