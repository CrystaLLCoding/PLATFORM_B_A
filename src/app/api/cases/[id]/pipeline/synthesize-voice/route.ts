import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { storage } from '@/lib/storage';
import { SpeakerRole } from '@/lib/videoPipelineTypes';

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

    let audioDataUri = '';

    // 1. ELEVENLABS OPTION
    const elevenLabsKey = apiKey || process.env.ELEVENLABS_API_KEY;
    if (provider === 'elevenlabs' && elevenLabsKey) {
      try {
        // Default voice IDs for ElevenLabs (Adam/Host, Rachel/Cohost or custom)
        const voiceId = speaker === 'cohost_strategist' ? '21m00Tcm4TlvDq8ikWAM' : 'pNInz6obpgDQGcFmaJgB';
        const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsKey
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.8 }
          })
        });

        if (elRes.ok) {
          const buffer = Buffer.from(await elRes.arrayBuffer());
          audioDataUri = `data:audio/mp3;base64,${buffer.toString('base64')}`;
        }
      } catch (e) {
        console.warn('[TTS] ElevenLabs failed, falling back to Edge TTS:', e);
      }
    }

    // 2. OPENAI TTS OPTION
    const openaiKey = apiKey || process.env.OPENAI_API_KEY;
    if (provider === 'openai' && openaiKey && !audioDataUri) {
      try {
        const voice = speaker === 'cohost_strategist' ? 'nova' : 'onyx';
        const oaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'tts-1-hd',
            input: text,
            voice,
            speed
          })
        });

        if (oaiRes.ok) {
          const buffer = Buffer.from(await oaiRes.arrayBuffer());
          audioDataUri = `data:audio/mp3;base64,${buffer.toString('base64')}`;
        }
      } catch (e) {
        console.warn('[TTS] OpenAI TTS failed, falling back to Edge TTS:', e);
      }
    }

    // 3. MICROSOFT NEURAL EDGE-TTS (DEFAULT / FREE / STUDIO QUALITY)
    if (!audioDataUri) {
      const scriptPath = path.join(process.cwd(), 'src', 'lib', 'tts_generator.py');
      const pythonCmd = process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');

      const voice = speaker === 'cohost_strategist' ? 'ru-RU-SvetlanaNeural' : 'ru-RU-DmitryNeural';
      const ratePct = speed !== 1.0 ? `${Math.round((speed - 1) * 100)}%` : '+0%';

      const pyProcess = spawn(pythonCmd, [scriptPath]);
      const resultPromise = new Promise<any>((resolve) => {
        let outputBuffer = Buffer.alloc(0);
        let errorString = '';

        pyProcess.stdout.on('data', (d) => {
          outputBuffer = Buffer.concat([outputBuffer, d]);
        });
        pyProcess.stderr.on('data', (d) => {
          errorString += d.toString();
        });
        pyProcess.on('close', (code) => {
          if (code !== 0 && outputBuffer.length === 0) {
            resolve({ success: false, error: errorString || `Python exited with code ${code}` });
            return;
          }
          try {
            const parsed = JSON.parse(outputBuffer.toString('utf-8'));
            resolve(parsed);
          } catch (err: any) {
            resolve({ success: false, error: err.message });
          }
        });

        pyProcess.stdin.write(JSON.stringify({ text, voice, rate: ratePct }));
        pyProcess.stdin.end();
      });

      const res = await resultPromise;
      if (res.success && res.dataUri) {
        audioDataUri = res.dataUri;
      } else {
        throw new Error(res.error || 'Не удалось сгенерировать речь через Edge-TTS');
      }
    }

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
