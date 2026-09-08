import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { VisualStyle } from '@/lib/videoPipelineTypes';

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
    const { sceneId, prompt, visualStyle } = body as {
      sceneId: string;
      prompt: string;
      visualStyle?: VisualStyle;
    };

    if (!sceneId || !prompt) {
      return NextResponse.json({ success: false, error: 'Не указан sceneId или prompt' }, { status: 400 });
    }

    // Enhance prompt based on visual style
    const styleKeywords: Record<VisualStyle, string> = {
      cinematic_realistic: 'cinematic lighting, photorealistic, 8k, depth of field, documentary color grade, high budget film frame',
      isometric_3d: 'isometric 3d illustration, clean digital render, vibrant palette, modern corporate Pixar tech aesthetic, smooth ambient occlusion',
      dark_tech_hud: 'dark tech aesthetic, glowing neon cyan and amber HUD data graphics, cyber financial terminal, high contrast, glossy glass',
      corporate_minimal: 'minimalist swiss graphic design, modern bright corporate studio, clean architectural lines, premium aesthetic'
    };

    const enhancedPrompt = `${prompt}, ${styleKeywords[visualStyle || 'cinematic_realistic']}, masterpiece, detailed, no text watermark`;

    // 1. Generate image using Pollinations (Flux model, 16:9 cinematic ratio)
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1280&height=720&model=flux&nologo=true&seed=${seed}`;

    // Update the scene in storage if project exists
    if (businessCase.pipelineProject) {
      const updatedScenes = businessCase.pipelineProject.scenes.map(sc => {
        if (sc.id === sceneId) {
          return { ...sc, imageUrl: pollinationsUrl };
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
      imageUrl: pollinationsUrl
    });
  } catch (err: any) {
    console.error('[API/pipeline/generate-image] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
