import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { SpeakerRole } from '@/lib/videoPipelineTypes';
import { synthesizeSceneAudio, populateScenesAudio } from '@/lib/audioSynthesizer';

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

    // 1. BATCH SYNTHESIZE ALL SCENES
    if (body.action === 'synthesize_all') {
      if (!businessCase.pipelineProject || !businessCase.pipelineProject.scenes.length) {
        return NextResponse.json({ success: false, error: 'Сцены еще не созданы' }, { status: 400 });
      }

      const updatedScenes = await populateScenesAudio(businessCase.pipelineProject.scenes, {
        provider: body.provider || 'edge-tts',
        apiKey: body.apiKey,
        speed: body.speed || 1.0
      });

      storage.updateCasePipelineProject(id, {
        ...businessCase.pipelineProject,
        scenes: updatedScenes,
        updatedAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        scenes: updatedScenes
      });
    }

    // 2. SINGLE SCENE SYNTHESIS
    const {
      sceneId,
      text,
      speaker = 'host_analyst',
      provider = 'edge-tts',
      apiKey,
      speed = 1.0
    } = body as {
      sceneId?: string;
      text: string;
      speaker?: SpeakerRole;
      provider?: 'edge-tts' | 'elevenlabs' | 'openai';
      apiKey?: string;
      speed?: number;
    };

    if (!text) {
      return NextResponse.json({ success: false, error: 'Текст для озвучки пуст' }, { status: 400 });
    }

    const audioDataUri = await synthesizeSceneAudio({
      text,
      speaker,
      provider,
      apiKey,
      speed
    });

    // Update scene audioUrl in storage if sceneId provided
    if (sceneId && businessCase.pipelineProject) {
      const updatedScenes = businessCase.pipelineProject.scenes.map((s) => {
        if (s.id === sceneId) {
          return { ...s, audioUrl: audioDataUri };
        }
        return s;
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
      audioUrl: audioDataUri
    });
  } catch (err: any) {
    console.error('[API/pipeline/synthesize-voice] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
