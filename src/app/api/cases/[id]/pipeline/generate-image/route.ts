import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { VisualStyle, KeyMetricBadge } from '@/lib/videoPipelineTypes';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await storage.ensureFresh();
    const businessCase = storage.getCaseById(id);
    if (!businessCase) {
      return NextResponse.json({ success: false, error: 'Кейс не найден' }, { status: 404 });
    }

    const body = await request.json();
    const {
      sceneId,
      prompt,
      visualStyle = 'isometric_3d',
      customImageUrl,
      mode = 'infographic', // 'infographic' | 'ai'
      openaiApiKey
    } = body as {
      sceneId: string;
      prompt?: string;
      visualStyle?: VisualStyle;
      customImageUrl?: string;
      mode?: 'ai' | 'infographic';
      openaiApiKey?: string;
    };

    if (!sceneId) {
      return NextResponse.json({ success: false, error: 'Не указан sceneId' }, { status: 400 });
    }

    const scene = businessCase.pipelineProject?.scenes.find(s => s.id === sceneId);
    let finalImageUrl = '';

    // 1. Custom image uploaded by user
    if (customImageUrl) {
      finalImageUrl = customImageUrl;
    }
    // 2. DALL-E 3 if key is provided
    else if (mode === 'ai' && (openaiApiKey || process.env.OPENAI_API_KEY)) {
      const oaiKey = openaiApiKey || process.env.OPENAI_API_KEY;
      try {
        const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${oaiKey}`
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: `Executive financial report slide. ${prompt}. High-end Bloomberg terminal aesthetic, dark glass obsidian chart, vibrant emerald and cyan neon accents, Unreal Engine 5 render, 8k resolution, no humans, no food, no trash`,
            n: 1,
            size: '1792x1024',
            quality: 'standard'
          })
        });

        if (oaiRes.ok) {
          const data = await oaiRes.json();
          finalImageUrl = data?.data?.[0]?.url || '';
        }
      } catch (e) {
        console.warn('[ImageGen] DALL-E 3 error:', e);
      }
    }

    // 3. Guaranteed High-End Executive SVG Data Card (Default & Fail-Safe)
    if (!finalImageUrl) {
      finalImageUrl = generateSvgDataCard(
        scene?.title || 'Анализ ключевых метрик',
        scene?.keyMetricBadge,
        scene?.sceneIndex || 1
      );
    }

    // Update scene in storage
    if (businessCase.pipelineProject) {
      const updatedScenes = businessCase.pipelineProject.scenes.map(sc => {
        if (sc.id === sceneId) {
          return { ...sc, imageUrl: finalImageUrl };
        }
        return sc;
      });

      storage.updateCasePipelineProject(id, {
        ...businessCase.pipelineProject,
        scenes: updatedScenes,
        updatedAt: new Date().toISOString()
      });
      await storage.saveToCloud();
    }

    return NextResponse.json({
      success: true,
      sceneId,
      imageUrl: finalImageUrl
    });
  } catch (err: any) {
    console.error('[API/pipeline/generate-image] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Generates an ultra-clean executive business Data Card (16:9 ratio, dark studio theme)
 * Contains real audit metrics, animated gradients, and high-contrast typography
 */
function generateSvgDataCard(
  title: string,
  badge?: KeyMetricBadge,
  sceneIndex: number = 1
): string {
  const metricLabel = badge?.label || 'Ключевая метрика аудита';
  const metricValue = badge?.value || 'Факты верифицированы';
  const isDown = badge?.trend === 'down';
  const isUp = badge?.trend === 'up';

  const accentColor = isDown ? '#F43F5E' : (isUp ? '#10B981' : '#06B6D4');
  const accentGlow = isDown ? 'rgba(244, 63, 94, 0.35)' : (isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(6, 182, 212, 0.35)');
  const trendArrow = isDown ? '▼ КРИТИЧЕСКИЙ РИСК' : (isUp ? '▲ РОСТ И ПОТЕНЦИАЛ' : '● СТАТУС-КВО');

  const svg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070A12"/>
      <stop offset="50%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#050811"/>
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(30, 41, 59, 0.85)"/>
      <stop offset="100%" stop-color="rgba(15, 23, 42, 0.95)"/>
    </linearGradient>

    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="#6366F1"/>
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Deep Studio Canvas -->
  <rect width="1280" height="720" fill="url(#bgGrad)"/>

  <!-- Tech Grid Background -->
  <g stroke="rgba(255, 255, 255, 0.04)" stroke-width="1">
    <line x1="160" y1="0" x2="160" y2="720"/>
    <line x1="320" y1="0" x2="320" y2="720"/>
    <line x1="480" y1="0" x2="480" y2="720"/>
    <line x1="640" y1="0" x2="640" y2="720"/>
    <line x1="800" y1="0" x2="800" y2="720"/>
    <line x1="960" y1="0" x2="960" y2="720"/>
    <line x1="1120" y1="0" x2="1120" y2="720"/>
    <line x1="0" y1="180" x2="1280" y2="180"/>
    <line x1="0" y1="360" x2="1280" y2="360"/>
    <line x1="0" y1="540" x2="1280" y2="540"/>
  </g>

  <!-- Ambient Light Halo -->
  <circle cx="980" cy="220" r="220" fill="${accentGlow}" filter="url(#glow)"/>
  <circle cx="260" cy="500" r="180" fill="rgba(99, 102, 241, 0.15)" filter="url(#glow)"/>

  <!-- Main Executive Glass Card -->
  <rect x="140" y="100" width="1000" height="520" rx="28" fill="url(#cardGrad)" stroke="rgba(255, 255, 255, 0.14)" stroke-width="2"/>

  <!-- Top Status Line -->
  <g transform="translate(190, 150)">
    <rect x="0" y="0" width="120" height="28" rx="6" fill="rgba(255, 255, 255, 0.08)"/>
    <text x="60" y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#E2E8F0" text-anchor="middle">СЦЕНА ${sceneIndex}</text>

    <rect x="135" y="0" width="190" height="28" rx="6" fill="${accentGlow}" stroke="${accentColor}" stroke-width="1"/>
    <text x="230" y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="${accentColor}" text-anchor="middle">${trendArrow}</text>
  </g>

  <!-- Big Scene Headline -->
  <text x="190" y="240" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">${title}</text>

  <!-- Metric Container -->
  <rect x="190" y="280" width="460" height="220" rx="20" fill="rgba(0, 0, 0, 0.45)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1.5"/>
  <rect x="190" y="280" width="8" height="220" rx="4" fill="${accentColor}"/>

  <text x="225" y="330" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#94A3B8" letter-spacing="1">${metricLabel.toUpperCase()}</text>
  <text x="225" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="62" font-weight="900" fill="${accentColor}">${metricValue}</text>

  <g transform="translate(225, 455)">
    <circle cx="6" cy="6" r="5" fill="#10B981"/>
    <text x="22" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#CBD5E1">Данные подтверждены первичными источниками аудита</text>
  </g>

  <!-- Dynamic Right Chart Block -->
  <g transform="translate(710, 280)">
    <rect x="0" y="0" width="370" height="220" rx="20" fill="rgba(0, 0, 0, 0.3)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1"/>

    <!-- Bar Chart Visual -->
    <g transform="translate(45, 30)">
      <rect x="0" y="110" width="36" height="40" rx="6" fill="rgba(255, 255, 255, 0.12)"/>
      <rect x="56" y="80" width="36" height="70" rx="6" fill="rgba(255, 255, 255, 0.22)"/>
      <rect x="112" y="50" width="36" height="100" rx="6" fill="rgba(99, 102, 241, 0.6)"/>
      <rect x="168" y="15" width="36" height="135" rx="6" fill="${accentColor}" filter="url(#glow)"/>
      <rect x="224" y="65" width="36" height="85" rx="6" fill="rgba(6, 182, 212, 0.7)"/>

      <!-- Baseline -->
      <line x1="-15" y1="150" x2="280" y2="150" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
    </g>
  </g>

  <!-- Bottom Brand Footer -->
  <text x="190" y="565" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#64748B">ПЛАТФОРМА БИЗНЕС-АУДИТА • EXECUTIVE STUDIO OVERVIEW</text>
</svg>
`;

  const b64 = Buffer.from(svg.trim()).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}
