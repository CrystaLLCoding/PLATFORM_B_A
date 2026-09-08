import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateDirectorStoryboard } from '@/lib/videoDirectorEngine';
import { VideoPipelineProject, VisualStyle, StoryboardScene } from '@/lib/videoPipelineTypes';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const businessCase = storage.getCaseById(id);
    if (!businessCase) {
      return NextResponse.json({ success: false, error: 'Кейс не найден' }, { status: 404 });
    }

    if (businessCase.pipelineProject) {
      return NextResponse.json({ success: true, project: businessCase.pipelineProject });
    }

    // Auto-generate initial storyboard if not existing
    const defaultStyle: VisualStyle = 'cinematic_realistic';
    const scenes = await generateDirectorStoryboard(businessCase, businessCase.report, defaultStyle);
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
    const businessCase = storage.getCaseById(id);
    if (!businessCase) {
      return NextResponse.json({ success: false, error: 'Кейс не найден' }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action || 'generate'; // 'generate' | 'save'
    const visualStyle: VisualStyle = body.visualStyle || businessCase.pipelineProject?.visualStyle || 'cinematic_realistic';

    if (action === 'generate') {
      const scenes = await generateDirectorStoryboard(businessCase, businessCase.report, visualStyle);
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
        createdAt: businessCase.pipelineProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      storage.updateCasePipelineProject(id, savedProject);
      return NextResponse.json({ success: true, project: savedProject });
    }

    return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    console.error('[API/pipeline/storyboard POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
