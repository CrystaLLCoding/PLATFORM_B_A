import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateDirectorStoryboard } from '@/lib/videoDirectorEngine';
import { VideoPipelineProject, VisualStyle, StoryboardScene } from '@/lib/videoPipelineTypes';
import { populateScenesAudio } from '@/lib/audioSynthesizer';

export async function GET(
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

    if (businessCase.pipelineProject) {
      // If any scenes are missing audio, populate them automatically so the player always has sound
      const missingAudio = businessCase.pipelineProject.scenes.some(s => !s.audioUrl);
      if (missingAudio) {
        try {
          const enrichedScenes = await populateScenesAudio(businessCase.pipelineProject.scenes);
          businessCase.pipelineProject.scenes = enrichedScenes;
          storage.updateCasePipelineProject(id, businessCase.pipelineProject);
          await storage.saveToCloud();
        } catch (e) {
          console.warn('[GET storyboard] Audio auto-population warning:', e);
        }
      }
      return NextResponse.json({ success: true, project: businessCase.pipelineProject });
    }

    // Auto-generate initial storyboard if not existing
    const defaultStyle: VisualStyle = 'isometric_3d';
    const rawScenes = await generateDirectorStoryboard(businessCase, businessCase.report, defaultStyle);
    
    // Automatically synthesize initial audio for zero-latency instant playback
    let scenes = rawScenes;
    try {
      scenes = await populateScenesAudio(rawScenes);
    } catch (e) {
      console.warn('[GET storyboard] Initial audio pre-synthesis warning:', e);
    }

    const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

    const newProject: VideoPipelineProject = {
      caseId: id,
      businessTitle: businessCase.title,
      visualStyle: defaultStyle,
      status: 'storyboard_ready',
      scenes,
      totalDurationSeconds: totalDuration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storage.updateCasePipelineProject(id, newProject);
    await storage.saveToCloud();

    return NextResponse.json({ success: true, project: newProject });
  } catch (err: any) {
    console.error('[API/pipeline/storyboard GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

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
    const action = body.action || 'generate'; // 'generate' | 'save'
    const visualStyle: VisualStyle = body.visualStyle || businessCase.pipelineProject?.visualStyle || 'isometric_3d';

    if (action === 'generate') {
      const rawScenes = await generateDirectorStoryboard(businessCase, businessCase.report, visualStyle);
      
      // Auto-synthesize voice for all newly generated scenes
      let scenes = rawScenes;
      try {
        scenes = await populateScenesAudio(rawScenes);
      } catch (e) {
        console.warn('[POST storyboard:generate] Audio pre-synthesis warning:', e);
      }

      const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

      const updatedProject: VideoPipelineProject = {
        caseId: id,
        businessTitle: businessCase.title,
        visualStyle,
        status: 'storyboard_ready',
        scenes,
        totalDurationSeconds: totalDuration,
        createdAt: businessCase.pipelineProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      storage.updateCasePipelineProject(id, updatedProject);
      await storage.saveToCloud();

      return NextResponse.json({ success: true, project: updatedProject });
    }

    if (action === 'save') {
      const incomingScenes: StoryboardScene[] = body.scenes || [];
      const totalDuration = incomingScenes.reduce((sum, s) => sum + (s.durationSeconds || 15), 0);

      const savedProject: VideoPipelineProject = {
        caseId: id,
        businessTitle: businessCase.title,
        visualStyle,
        status: body.status || businessCase.pipelineProject?.status || 'storyboard_ready',
        scenes: incomingScenes,
        totalDurationSeconds: totalDuration,
        masterAudioUrl: body.masterAudioUrl !== undefined ? body.masterAudioUrl : businessCase.pipelineProject?.masterAudioUrl,
        masterAudioName: body.masterAudioName !== undefined ? body.masterAudioName : businessCase.pipelineProject?.masterAudioName,
        createdAt: businessCase.pipelineProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      storage.updateCasePipelineProject(id, savedProject);
      await storage.saveToCloud();

      return NextResponse.json({ success: true, project: savedProject });
    }

    return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    console.error('[API/pipeline/storyboard POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
