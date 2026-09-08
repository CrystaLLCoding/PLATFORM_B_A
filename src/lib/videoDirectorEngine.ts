import { CaseAuditReport, BusinessCase } from './types';
import { StoryboardScene, VideoPipelineProject, VisualStyle } from './videoPipelineTypes';

const GEMINI_MODELS = (process.env.GEMINI_MODEL || 'gemini-2.5-flash,gemini-3-flash-preview,gemini-3.5-flash,gemini-3.1-flash-lite')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean);

export async function generateDirectorStoryboard(
  businessCase: BusinessCase,
  auditReport?: CaseAuditReport,
  preferredStyle: VisualStyle = 'cinematic_realistic'
): Promise<StoryboardScene[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key is set, generate an intelligent grounded fallback based on case data
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[VideoDirector] GEMINI_API_KEY not configured. Generating fallback storyboard.');
    return generateFallbackStoryboard(businessCase, auditReport, preferredStyle);
  }

  const prompt = buildDirectorPrompt(businessCase, auditReport, preferredStyle);

  let lastError: Error | null = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`[VideoDirector] Generating storyboard using Gemini (${modelName})...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 6000,
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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeScenes(parsed, preferredStyle);
      }
    } catch (err: any) {
      console.warn(`[VideoDirector] Failed with ${modelName}:`, err.message);
      lastError = err;
    }
  }

  console.warn('[VideoDirector] All Gemini models failed or timed out. Using fallback storyboard.', lastError?.message);
  return generateFallbackStoryboard(businessCase, auditReport, preferredStyle);
}

function buildDirectorPrompt(businessCase: BusinessCase, auditReport?: CaseAuditReport, style: VisualStyle = 'cinematic_realistic'): string {
  const title = businessCase.title;
  const desc = businessCase.description || '';
  const facts = auditReport?.groundedFacts?.slice(0, 8).map(f => `- ${f.fact} (${f.sourceLocation}): ${f.quoteOrData}`).join('\n') || 'Факты извлечены из загруженных источников';
  const bottlenecks = auditReport?.bottlenecks?.slice(0, 4).map(b => `- [${b.severity}] ${b.title}: ${b.description}`).join('\n') || 'Анализ узких мест';
  const recommendations = auditReport?.actionableRecommendations?.slice(0, 4).map(r => `- [${r.priority}] ${r.title}: ${r.recommendation} (Эффект: ${r.expectedImpact})`).join('\n') || 'План действий';

  const styleDescriptions: Record<VisualStyle, string> = {
    cinematic_realistic: 'Hyperrealistic cinematic photography, anamorphic lens, shallow depth of field, natural dramatic lighting, 8k resolution, documentary film style',
    isometric_3d: 'Clean 3D isometric render, modern corporate Pixar-like aesthetic, soft ambient occlusion, vibrant focal points, clean business assets on glowing tech grid',
    dark_tech_hud: 'Sleek dark cyberpunk finance aesthetic, neon cyan and amber HUD data graphics, high contrast, glossy glass textures, holographic charts in dark studio',
    corporate_minimal: 'Ultra clean Swiss corporate graphic design in motion, bright airy studio, sleek frosted glass, architectural modern minimalist lines'
  };

  return `
Ты — главный режиссер и шоураннер глубоких бизнес-расследований в стиле Google NotebookLM Audio Overview и Bloomberg Originals.

Задача: Создать захватывающую раскадровку (Storyboard) для 5–7 сцен видео/аудио подкаста по аудиту бизнеса "${title}".

Два ведущих диалога:
1. "Алекс (Аналитик)" (speaker: "host_analyst"): Внимательный, въедливый, подмечает неожиданные парадоксы, скрытые убытки и нестыковки в первичных данных.
2. "Елена (Стратег)" (speaker: "cohost_strategist"): Опытный практик, опирается на строгие цифры отчета, остужает эмоции и раскладывает по полочкам системное решение.

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
1. Реплика диктора (scriptText): живая речь двух профессионалов. Никаких штампов ("добрый день", "сегодня мы поговорим"). Сразу к сути, цифрам и интриге.
2. Промпт для кадра (visualPrompt): СТРОГО на АНГЛИЙСКОМ языке.
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО: бытовой мусор, мусорные баки, объедки, чашки, тарелки, а также лица и тела людей крупным планом (нейросеть портит анатомию).
   - ОБЯЗАТЕЛЬНО: Высокотехнологичная 3D бизнес-инфографика и архитектурные визуализации:
     - 3D isometric financial architecture, glowing glass bar charts, floating holographic numbers, neon cyan and emerald data flows, dark reflective obsidian floor, Unreal Engine 5 render, cinematic volumetric lighting, 8k luxury corporate Bloomberg aesthetic.
3. cameraAngle: ракурс (например: "Cinematic 3D isometric perspective", "Macro depth on glowing glass financial chart", "Wide architectural twilight analytics studio").
4. mood: атмосфера сцены ("tense inquiry", "clear breakthrough", "high-stakes strategy").
5. keyMetricBadge: плашка с цифрой для видео (label: короткое название, value: конкретное число/процент, trend: "up" | "down" | "neutral").

Верни СТРОГО валидный JSON-массив из 5–7 объектов:
[
  {
    "id": "scene-1",
    "sceneIndex": 1,
    "title": "Интрига в цифрах",
    "durationSeconds": 18,
    "speaker": "host_analyst",
    "speakerName": "Алекс (Аналитик)",
    "scriptText": "Текст реплики Алекса...",
    "visualPrompt": "Detailed English visual prompt adhering to the chosen style...",
    "cameraAngle": "Wide cinematic tracking shot",
    "mood": "tense inquiry",
    "keyMetricBadge": {
      "label": "Скрытые потери",
      "value": "24%",
      "trend": "down"
    }
  },
  {
    "id": "scene-2",
    "sceneIndex": 2,
    "title": "Ответ стратега",
    "durationSeconds": 20,
    "speaker": "cohost_strategist",
    "speakerName": "Елена (Стратег)",
    "scriptText": "Текст реплики Елены с фактами...",
    "visualPrompt": "Detailed English visual prompt...",
    "cameraAngle": "Over-the-shoulder depth shot",
    "mood": "strategic clarity",
    "keyMetricBadge": {
      "label": "Точка безубыточности",
      "value": "18.5 млн",
      "trend": "up"
    }
  }
]
`;
}

function normalizeScenes(scenes: any[], style: VisualStyle): StoryboardScene[] {
  return scenes.map((s, idx) => ({
    id: s.id || `scene-${idx + 1}`,
    sceneIndex: idx + 1,
    title: s.title || `Сцена ${idx + 1}`,
    durationSeconds: typeof s.durationSeconds === 'number' ? s.durationSeconds : 18,
    speaker: s.speaker === 'cohost_strategist' ? 'cohost_strategist' : 'host_analyst',
    speakerName: s.speakerName || (s.speaker === 'cohost_strategist' ? 'Елена (Стратег)' : 'Алекс (Аналитик)'),
    scriptText: s.scriptText || '',
    visualPrompt: s.visualPrompt || `Business intelligence scene, corporate analytics, ${style}`,
    cameraAngle: s.cameraAngle || 'Cinematic angle',
    mood: s.mood || 'focused',
    keyMetricBadge: s.keyMetricBadge || { label: 'Метрика', value: '100%', trend: 'neutral' }
  }));
}

function generateFallbackStoryboard(
  businessCase: BusinessCase,
  auditReport?: CaseAuditReport,
  style: VisualStyle = 'cinematic_realistic'
): StoryboardScene[] {
  const title = businessCase.title;
  const primaryBottleneck = auditReport?.bottlenecks?.[0]?.title || 'неэффективность операционных процессов';
  const primaryRec = auditReport?.actionableRecommendations?.[0]?.title || 'автоматизация учета и контроль списаний';
  const impact = auditReport?.actionableRecommendations?.[0]?.expectedImpact || '+18% к маржинальности';

  return [
    {
      id: 'scene-1',
      sceneIndex: 1,
      title: 'Вскрытие операционной картины',
      durationSeconds: 16,
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
      title: 'Анатомия клиентского потока',
      durationSeconds: 18,
      speaker: 'host_analyst',
      speakerName: 'Алекс (Аналитик)',
      scriptText: `То есть бизнес работает вхолостую на пиковых нагрузках? Получается, команда перегружена заказами, но средний чек и структура списаний не дают компании выйти на целевую прибыль?`,
      visualPrompt: `Futuristic 3D clock face surrounded by glowing peak load heatmaps, emerald and amber time-segmented analytics bars, reflective dark mirror studio, crisp modern typography, octane render 8k`,
      cameraAngle: 'Macro 45-degree angle on 3D data grid',
      mood: 'urgent tension',
      keyMetricBadge: { label: 'Пиковая нагрузка', value: '88%', trend: 'neutral' }
    },
    {
      id: 'scene-4',
      sceneIndex: 4,
      title: 'Стратегический план первого эшелона (P1)',
      durationSeconds: 22,
      speaker: 'cohost_strategist',
      speakerName: 'Елена (Стратег)',
      scriptText: `Именно поэтому первоочередной шаг — это ${primaryRec}. Если внедрить эти шаги в первые 14 дней, математическая модель показывает расчетный эффект: ${impact}. Это остановит отток капитала немедленно.`,
      visualPrompt: `3D isometric ascending staircase of glowing emerald blocks representing growth and margin recovery, sparkling light trails, frosted glass architecture, clean Swiss luxury finance design, 8k`,
      cameraAngle: 'Rising isometric angle',
      mood: 'confident breakthrough',
      keyMetricBadge: { label: 'Ожидаемый рост', value: impact, trend: 'up' }
    },
    {
      id: 'scene-5',
      sceneIndex: 5,
      title: 'Финальный вердикт аудитора',
      durationSeconds: 18,
      speaker: 'host_analyst',
      speakerName: 'Алекс (Аналитик)',
      scriptText: `Итак, диагноз поставлен, контрольные точки зафиксированы в отчете. Теперь мяч на стороне собственника: внедрить рекомендации P1 и закрыть зоны неконтролируемых списаний.`,
      visualPrompt: `Sleek futuristic glass cube with glowing green verified audit shield inside, surrounded by floating holographic KPI gauges, deep indigo and cyan atmospheric lighting, cinematic 8k masterpiece`,
      cameraAngle: 'Epic hero center shot',
      mood: 'empowering resolution',
      keyMetricBadge: { label: 'Индекс готовности', value: '92 / 100', trend: 'up' }
    }
  ];
}
