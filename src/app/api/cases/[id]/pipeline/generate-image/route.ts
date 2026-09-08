import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { VisualStyle } from '@/lib/videoPipelineTypes';
import { generateSvgDataCard } from '@/lib/svgCardGenerator';

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
    const action = body.action || 'single';

    // 1. BATCH GENERATE FOR ALL SCENES
    if (action === 'generate_all') {
      if (!businessCase.pipelineProject || !businessCase.pipelineProject.scenes.length) {
        return NextResponse.json({ success: false, error: 'Сцены не найдены' }, { status: 400 });
      }

      const style = body.visualStyle || businessCase.pipelineProject.visualStyle || 'isometric_3d';
      const updatedScenes = businessCase.pipelineProject.scenes.map((scene, idx) => {
        const svgUrl = generateSvgDataCard(scene.title, scene.keyMetricBadge, idx + 1, style);
        return {
          ...scene,
          imageUrl: svgUrl
        };
      });

      storage.updateCasePipelineProject(id, {
        ...businessCase.pipelineProject,
        scenes: updatedScenes,
        updatedAt: new Date().toISOString()
      });
      await storage.saveToCloud();

      return NextResponse.json({
        success: true,
        scenes: updatedScenes
      });
    }

    // 2. SINGLE SCENE GENERATION
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
        scene?.sceneIndex || 1,
        visualStyle
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
