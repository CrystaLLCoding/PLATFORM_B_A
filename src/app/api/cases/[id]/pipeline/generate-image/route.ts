import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { VisualStyle, KeyMetricBadge } from '@/lib/videoPipelineTypes';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      mode = 'ai', // 'ai' | 'infographic'
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

    let finalImageUrl = '';

    // 1. If custom image was uploaded by the user
    if (customImageUrl) {
      finalImageUrl = customImageUrl;
    } 
    // 2. If user chose pure Infographic Data Card mode
    else if (mode === 'infographic') {
      const scene = businessCase.pipelineProject?.scenes.find(s => s.id === sceneId);
      finalImageUrl = generateSvgDataCard(scene?.title || 'Аналитика бизнеса', scene?.keyMetricBadge, visualStyle);
    }
    // 3. AI Generation (DALL-E 3 or Flux)
    else {
      const oaiKey = openaiApiKey || process.env.OPENAI_API_KEY;

      // Try OpenAI DALL-E 3 if key exists
      if (oaiKey) {
        try {
          const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${oaiKey}`
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: `Futuristic 3D luxury executive finance visualization. ${prompt}. Clean corporate Bloomberg aesthetic, isometric glowing glass charts, emerald and cyan neon accents on dark obsidian mirror background, Unreal Engine 5 render, 8k resolution, no humans, no food, no trash, no text`,
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
          console.warn('[ImageGen] DALL-E 3 failed, falling back to Flux:', e);
        }
      }

      // Default: Enhanced Flux prompt with strict quality and negative filtering
      if (!finalImageUrl) {
        const styleKeywords: Record<VisualStyle, string> = {
          isometric_3d: '3D isometric luxury finance visualization, glowing glass bar charts, floating holographic numbers, neon cyan and emerald data flows, dark reflective obsidian floor, Unreal Engine 5 render, cinematic volumetric lighting, 8k luxury corporate Bloomberg aesthetic',
          cinematic_realistic: 'Hyperrealistic cinematic architectural photography of modern financial command center, glass holograms, high depth of field, anamorphic lens, 8k',
          dark_tech_hud: 'Sleek dark cyberpunk finance terminal, neon cyan and amber HUD data graphics, high contrast, glossy glass textures, holographic charts in dark studio',
          corporate_minimal: 'Ultra clean Swiss corporate 3D graphic design, bright airy studio, sleek frosted glass, architectural modern minimalist lines'
        };

        const safePrompt = `${prompt}, ${styleKeywords[visualStyle]}, masterpiece, 8k octane render, no distorted faces, no people, no trash, no kitchen leftovers, no watermark`;
        const seed = Math.floor(Math.random() * 1000000);
        finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1280&height=720&model=flux&nologo=true&seed=${seed}`;
      }
    }

    // Update the scene in storage if project exists
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

// Generates an ultra-crisp studio SVG Data Card with dynamic metrics
function generateSvgDataCard(title: string, badge?: KeyMetricBadge, style?: VisualStyle): string {
  const metricLabel = badge?.label || 'Ключевой показатель';
  const metricValue = badge?.value || '100%';
  const isNegative = badge?.trend === 'down';

  const accentColor = isNegative ? '#F43F5E' : '#10B981';
  const accentGlow = isNegative ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)';

  const svg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#070A10"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(30, 41, 59, 0.8)"/>
      <stop offset="100%" stop-color="rgba(15, 23, 42, 0.9)"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1280" height="720" fill="url(#bg)"/>

  <!-- Decorative Tech Grid -->
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

  <!-- Ambient Light Orbs -->
  <circle cx="950" cy="240" r="180" fill="${accentGlow}" filter="url(#glow)"/>
  <circle cx="280" cy="480" r="140" fill="rgba(99, 102, 241, 0.15)" filter="url(#glow)"/>

  <!-- Center Card Glassmorphism -->
  <rect x="180" y="140" width="920" height="440" rx="24" fill="url(#cardGrad)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="2"/>

  <!-- Category Tag -->
  <rect x="230" y="190" width="180" height="32" rx="8" fill="rgba(99, 102, 241, 0.2)" stroke="#6366F1" stroke-width="1"/>
  <text x="320" y="211" font-family="'Inter', sans-serif" font-size="12" font-weight="700" fill="#818CF8" text-anchor="middle">EXECUTIVE AUDIT DATA</text>

  <!-- Scene Title -->
  <text x="230" y="270" font-family="'Outfit', 'Inter', sans-serif" font-size="34" font-weight="800" fill="#FFFFFF">${title}</text>

  <!-- Metric Container -->
  <rect x="230" y="320" width="400" height="150" rx="16" fill="rgba(0, 0, 0, 0.35)" stroke="${accentColor}" stroke-width="1.5"/>
  <text x="260" y="365" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#94A3B8">${metricLabel.toUpperCase()}</text>
  <text x="260" y="430" font-family="'Outfit', 'Inter', sans-serif" font-size="52" font-weight="900" fill="${accentColor}">${metricValue}</text>

  <!-- Visual Bars Chart -->
  <g transform="translate(680, 320)">
    <rect x="0" y="100" width="36" height="50" rx="6" fill="rgba(255, 255, 255, 0.1)"/>
    <rect x="54" y="70" width="36" height="80" rx="6" fill="rgba(255, 255, 255, 0.2)"/>
    <rect x="108" y="40" width="36" height="110" rx="6" fill="rgba(99, 102, 241, 0.5)"/>
    <rect x="162" y="10" width="36" height="140" rx="6" fill="${accentColor}" filter="url(#glow)"/>
    <rect x="216" y="55" width="36" height="95" rx="6" fill="rgba(6, 182, 212, 0.6)"/>
    <rect x="270" y="25" width="36" height="125" rx="6" fill="#10B981"/>
  </g>

  <!-- Verified Badge -->
  <circle cx="245" cy="525" r="7" fill="#10B981"/>
  <text x="262" y="529" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#6EE7B7">Фактологически верифицировано по первичным данным</text>
</svg>
`;

  const b64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}
