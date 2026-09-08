import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { generateDirectorStoryboard } from '@/lib/videoDirectorEngine';
import { VideoPipelineProject, VisualStyle, StoryboardScene } from '@/lib/videoPipelineTypes';
import { populateScenesAudio } from '@/lib/audioSynthesizer';
import { cleanSpeechScript } from '@/lib/speechUtils';
import { generateSvgDataCard } from '@/lib/svgCardGenerator';

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

    const defaultStyle: VisualStyle = 'isometric_3d';

    if (businessCase.pipelineProject) {
      let needsSave = false;

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

      // 1. Ensure EVERY scene has clean title, clean script, and valid imageUrl
      const verifiedScenes = businessCase.pipelineProject.scenes.map((s, idx) => {
        let title = (s.title || '').trim();
        if (!title || /^сцена\s*\d*[:\s\-\.]*$/i.test(title)) {
          title = defaultTopics[idx + 1] || `Аналитический срез ${idx + 1}`;
          needsSave = true;
        } else if (/^Сцена\s*\d+[:\s\-\.]*/i.test(title)) {
          title = title.replace(/^Сцена\s*\d+[:\s\-\.]*/i, '').trim() || defaultTopics[idx + 1];
          needsSave = true;
        }

        const cleanedScript = cleanSpeechScript(s.scriptText || '');
        if (cleanedScript !== s.scriptText) {
          needsSave = true;
        }

        let imageUrl = s.imageUrl;
        if (!imageUrl) {
          needsSave = true;
          imageUrl = generateSvgDataCard(
            title,
            s.keyMetricBadge,
            idx + 1,
            businessCase.pipelineProject?.visualStyle || defaultStyle
          );
        }

        return {
          ...s,
          title,
          scriptText: cleanedScript,
          imageUrl
        };
      });

      if (needsSave) {
        businessCase.pipelineProject.scenes = verifiedScenes;
      }

      // 2. Ensure audio is populated
      const missingAudio = businessCase.pipelineProject.scenes.some(s => !s.audioUrl);
      if (missingAudio) {
        try {
          const enrichedScenes = await populateScenesAudio(businessCase.pipelineProject.scenes);
          businessCase.pipelineProject.scenes = enrichedScenes;
          needsSave = true;
        } catch (e) {
          console.warn('[GET storyboard] Audio auto-population warning:', e);
        }
      }

      if (needsSave) {
        storage.updateCasePipelineProject(id, businessCase.pipelineProject);
        await storage.saveToCloud();
      }

      return NextResponse.json({ success: true, project: businessCase.pipelineProject });
    }

    // Auto-generate initial deep storyboard (8 scenes default)
    const rawScenes = await generateDirectorStoryboard(businessCase, businessCase.report, {
      preferredStyle: defaultStyle,
      sceneCount: 8
    });

    // Automatically synthesize initial audio
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
    const action = body.action || 'generate'; // 'generate' | 'save' | 'add_scene' | 'delete_scene'
    const visualStyle: VisualStyle = body.visualStyle || businessCase.pipelineProject?.visualStyle || 'isometric_3d';
    const sceneCount: number = body.sceneCount && body.sceneCount >= 5 ? body.sceneCount : 8;

    // 1. REGENERATE DEEP STORYBOARD
    if (action === 'generate') {
      const rawScenes = await generateDirectorStoryboard(businessCase, businessCase.report, {
        preferredStyle: visualStyle,
        sceneCount
      });

      // Auto-synthesize voice
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

    // 2. SAVE SCENE EDITS
    if (action === 'save') {
      const incomingScenes: StoryboardScene[] = (body.scenes || []).map((s: StoryboardScene, idx: number) => {
        const cleanTitle = (s.title || '').replace(/^Сцена\s*\d+[:\s\-\.]*/i, '').trim() || s.title || `Сцена ${idx + 1}`;
        const cleanScript = cleanSpeechScript(s.scriptText || '');
        return {
          ...s,
          sceneIndex: idx + 1,
          title: cleanTitle,
          scriptText: cleanScript,
          imageUrl: s.imageUrl || generateSvgDataCard(cleanTitle, s.keyMetricBadge, idx + 1, visualStyle)
        };
      });

      const totalDuration = incomingScenes.reduce((sum, s) => sum + (s.durationSeconds || 18), 0);

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
      await storage.saveToCloud();

      return NextResponse.json({ success: true, project: savedProject });
    }

    // 3. ADD A NEW CUSTOM SCENE
    if (action === 'add_scene') {
      const existing = businessCase.pipelineProject?.scenes || [];
      const newIdx = existing.length + 1;
      const speaker = newIdx % 2 === 1 ? 'host_analyst' : 'cohost_strategist';
      const speakerName = speaker === 'host_analyst' ? 'Алекс (Аналитик)' : 'Елена (Стратег)';
      const title = body.title || `Сцена ${newIdx}: Дополнительный анализ`;
      const badge = { label: 'Новый фокус', value: '100%', trend: 'up' as const };

      const newScene: StoryboardScene = {
        id: `scene-${Date.now()}`,
        sceneIndex: newIdx,
        title,
        durationSeconds: 18,
        speaker,
        speakerName,
        scriptText: body.scriptText || 'Дополнительный аналитический комментарий к аудиту.',
        visualPrompt: `Business analytics 3D isometric slide, ${visualStyle}`,
        cameraAngle: 'Cinematic wide angle',
        mood: 'focused',
        keyMetricBadge: badge,
        imageUrl: generateSvgDataCard(title, badge, newIdx, visualStyle)
      };

      const updatedScenes = [...existing, newScene];
      const totalDuration = updatedScenes.reduce((sum, s) => sum + s.durationSeconds, 0);

      const updatedProject: VideoPipelineProject = {
        caseId: id,
        businessTitle: businessCase.title,
        visualStyle,
        status: 'storyboard_ready',
        scenes: updatedScenes,
        totalDurationSeconds: totalDuration,
        createdAt: businessCase.pipelineProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      storage.updateCasePipelineProject(id, updatedProject);
      await storage.saveToCloud();

      return NextResponse.json({ success: true, project: updatedProject });
    }

    // 4. DELETE A SCENE
    if (action === 'delete_scene') {
      const { sceneId } = body;
      const existing = businessCase.pipelineProject?.scenes || [];
      const filtered = existing
        .filter(s => s.id !== sceneId)
        .map((s, idx) => ({ ...s, sceneIndex: idx + 1 }));

      const totalDuration = filtered.reduce((sum, s) => sum + s.durationSeconds, 0);

      const updatedProject: VideoPipelineProject = {
        caseId: id,
        businessTitle: businessCase.title,
        visualStyle,
        status: 'storyboard_ready',
        scenes: filtered,
        totalDurationSeconds: totalDuration,
        createdAt: businessCase.pipelineProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      storage.updateCasePipelineProject(id, updatedProject);
      await storage.saveToCloud();

      return NextResponse.json({ success: true, project: updatedProject });
    }

    return NextResponse.json({ success: false, error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    console.error('[API/pipeline/storyboard POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
