'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Film,
  Mic,
  Image as ImageIcon,
  Sliders,
  Download,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Eye,
  Settings2,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Layers,
  Wand2,
  User,
  Radio,
  FileVideo,
  Flame
} from 'lucide-react';
import {
  StoryboardScene,
  VideoPipelineProject,
  VisualStyle,
  SpeakerRole
} from '@/lib/videoPipelineTypes';

interface AIVideoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  businessTitle: string;
  initialProject?: VideoPipelineProject;
  onProjectUpdated?: (project: VideoPipelineProject) => void;
}

export const AIVideoStudioModal: React.FC<AIVideoStudioModalProps> = ({
  isOpen,
  onClose,
  caseId,
  businessTitle,
  initialProject,
  onProjectUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'storyboard' | 'visuals' | 'voice' | 'player'>('storyboard');
  const [project, setProject] = useState<VideoPipelineProject | null>(initialProject || null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [generatingImagesMap, setGeneratingImagesMap] = useState<Record<string, boolean>>({});
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingSceneIdx, setCurrentPlayingSceneIdx] = useState(0);
  const [sceneElapsedTime, setSceneElapsedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.2);
  const [isRecordingExport, setIsRecordingExport] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Voice synthesis state
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hostVoiceUri, setHostVoiceUri] = useState<string>('');
  const [cohostVoiceUri, setCohostVoiceUri] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load project on open
  useEffect(() => {
    if (!isOpen) return;

    if (!project) {
      fetchProject();
    }

    // Load available voices
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Auto-select Russian/English voices
        const ruVoices = voices.filter(v => v.lang.startsWith('ru'));
        if (ruVoices.length > 1) {
          setHostVoiceUri(ruVoices[0].voiceURI);
          setCohostVoiceUri(ruVoices[1].voiceURI);
        } else if (ruVoices.length === 1) {
          setHostVoiceUri(ruVoices[0].voiceURI);
          setCohostVoiceUri(ruVoices[0].voiceURI);
        } else if (voices.length > 0) {
          setHostVoiceUri(voices[0].voiceURI);
          setCohostVoiceUri(voices[1]?.voiceURI || voices[0].voiceURI);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [isOpen, caseId]);

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/pipeline/storyboard`);
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        if (onProjectUpdated) onProjectUpdated(data.project);
      }
    } catch (err) {
      console.error('Failed to fetch storyboard project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateStoryboard = async (style?: VisualStyle) => {
    setIsGeneratingScenes(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/pipeline/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          visualStyle: style || project?.visualStyle || 'cinematic_realistic'
        })
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        if (onProjectUpdated) onProjectUpdated(data.project);
      }
    } catch (err) {
      console.error('Failed to regenerate storyboard:', err);
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  const handleSaveSceneChanges = async (updatedScenes: StoryboardScene[]) => {
    if (!project) return;
    const updated = { ...project, scenes: updatedScenes };
    setProject(updated);

    try {
      await fetch(`/api/cases/${caseId}/pipeline/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          scenes: updatedScenes,
          visualStyle: project.visualStyle
        })
      });
      if (onProjectUpdated) onProjectUpdated(updated);
    } catch (err) {
      console.error('Failed to save scenes:', err);
    }
  };

  const handleUpdateScene = (index: number, patch: Partial<StoryboardScene>) => {
    if (!project) return;
    const newScenes = [...project.scenes];
    newScenes[index] = { ...newScenes[index], ...patch };
    handleSaveSceneChanges(newScenes);
  };

  const handleGenerateImageForScene = async (scene: StoryboardScene) => {
    setGeneratingImagesMap(prev => ({ ...prev, [scene.id]: true }));
    try {
      const res = await fetch(`/api/cases/${caseId}/pipeline/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          prompt: scene.visualPrompt,
          visualStyle: project?.visualStyle || 'cinematic_realistic'
        })
      });
      const data = await res.json();
      if (data.success && data.imageUrl && project) {
        const updatedScenes = project.scenes.map(s =>
          s.id === scene.id ? { ...s, imageUrl: data.imageUrl } : s
        );
        handleSaveSceneChanges(updatedScenes);
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setGeneratingImagesMap(prev => ({ ...prev, [scene.id]: false }));
    }
  };

  const handleGenerateAllImages = async () => {
    if (!project) return;
    for (const scene of project.scenes) {
      await handleGenerateImageForScene(scene);
    }
  };

  // --- AUDIO SYNTHESIS PLAYBACK ---
  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const playSceneAudio = (sceneIndex: number) => {
    if (!project || sceneIndex >= project.scenes.length) {
      stopAudio();
      return;
    }

    const scene = project.scenes[sceneIndex];
    setCurrentPlayingSceneIdx(sceneIndex);
    setSceneElapsedTime(0);

    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted) {
      // Fake timer if muted or no speech synthesis
      const duration = (scene.durationSeconds || 15) * 1000;
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        setSceneElapsedTime(elapsed);
        if (elapsed >= (scene.durationSeconds || 15)) {
          clearInterval(interval);
          playSceneAudio(sceneIndex + 1);
        }
      }, 100);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(scene.scriptText);
    utterance.rate = playbackSpeed;

    // Pick voice based on speaker role
    const chosenUri = scene.speaker === 'cohost_strategist' ? cohostVoiceUri : hostVoiceUri;
    const voiceObj = availableVoices.find(v => v.voiceURI === chosenUri);
    if (voiceObj) utterance.voice = voiceObj;

    utterance.onend = () => {
      if (sceneIndex + 1 < project.scenes.length) {
        playSceneAudio(sceneIndex + 1);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error, advancing:', e);
      if (sceneIndex + 1 < project.scenes.length) {
        playSceneAudio(sceneIndex + 1);
      } else {
        setIsPlaying(false);
      }
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playSceneAudio(currentPlayingSceneIdx);
    }
  };

  // Close cleanup
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
    }
  }, [isOpen]);

  // --- CANVAS MOTION RENDERER ---
  useEffect(() => {
    if (activeTab !== 'player' || !project) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = Date.now();
    let currentImageObj: HTMLImageElement | null = null;
    let lastLoadedUrl = '';

    const currentScene = project.scenes[currentPlayingSceneIdx] || project.scenes[0];

    // Preload image
    if (currentScene?.imageUrl && currentScene.imageUrl !== lastLoadedUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentScene.imageUrl;
      img.onload = () => {
        currentImageObj = img;
        lastLoadedUrl = currentScene.imageUrl!;
      };
    }

    const renderLoop = () => {
      const width = canvas.width;
      const height = canvas.height;
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;

      // 1. Draw Background
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Scene Visual with subtle Ken Burns (zoom & slow pan)
      if (currentImageObj && currentImageObj.complete) {
        const zoom = 1 + (Math.sin(elapsed * 0.15) + 1) * 0.04;
        const panX = Math.cos(elapsed * 0.1) * 15;
        const panY = Math.sin(elapsed * 0.08) * 10;

        ctx.save();
        ctx.translate(width / 2 + panX, height / 2 + panY);
        ctx.scale(zoom, zoom);
        ctx.drawImage(currentImageObj, -width / 2, -height / 2, width, height);
        ctx.restore();

        // Dark gradient overlay for text readability
        const gradient = ctx.createLinearGradient(0, height * 0.3, 0, height);
        gradient.addColorStop(0, 'rgba(11, 15, 25, 0)');
        gradient.addColorStop(0.5, 'rgba(11, 15, 25, 0.65)');
        gradient.addColorStop(1, 'rgba(11, 15, 25, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Fallback procedural visual if image not yet loaded
        const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.5);
        grad.addColorStop(0, currentScene?.speaker === 'cohost_strategist' ? '#1E1B4B' : '#042F2E');
        grad.addColorStop(1, '#0B0F19');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Animated grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const step = 60;
        for (let x = (elapsed * 20) % step; x < width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }

      // 3. Top Badges (Speaker & Mood)
      if (currentScene) {
        // Speaker Badge
        const isHost = currentScene.speaker === 'host_analyst';
        ctx.fillStyle = isHost ? 'rgba(6, 182, 212, 0.2)' : 'rgba(139, 92, 246, 0.2)';
        ctx.strokeStyle = isHost ? '#06B6D4' : '#8B5CF6';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 40, 40, 260, 44, 10, true, true);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText(currentScene.speakerName, 60, 68);

        // Key Metric Badge (Top Right)
        if (currentScene.keyMetricBadge) {
          const badge = currentScene.keyMetricBadge;
          const badgeX = width - 280;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.5;
          roundRect(ctx, badgeX, 40, 240, 44, 10, true, true);

          ctx.fillStyle = '#A7F3D0';
          ctx.font = '12px Inter, sans-serif';
          ctx.fillText(badge.label.slice(0, 18), badgeX + 20, 58);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 16px Outfit, Inter, sans-serif';
          ctx.fillText(badge.value, badgeX + 20, 75);
        }

        // 4. Bottom Subtitle / Script Overlay
        const subBoxY = height - 160;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        roundRect(ctx, 40, subBoxY, width - 80, 110, 14, true, true);

        // Scene Title
        ctx.fillStyle = '#94A3B8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`Сцена ${currentScene.sceneIndex}: ${currentScene.title.toUpperCase()}`, 65, subBoxY + 30);

        // Script text with wrapping
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '500 18px Inter, sans-serif';
        wrapText(ctx, currentScene.scriptText, 65, subBoxY + 60, width - 130, 26);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeTab, currentPlayingSceneIdx, project]);

  // Canvas utility: rounded rectangle
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: boolean,
    stroke: boolean
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Canvas utility: wrap text
  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
        linesDrawn++;
        if (linesDrawn >= 2) {
          ctx.fillText(line.trim() + '...', x, curY);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  // --- EXPORT VIDEO (MediaRecorder on Canvas) ---
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    try {
      setIsRecordingExport(true);
      setExportProgress(10);

      // Start capture stream from canvas
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm'
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI_Video_${businessTitle.replace(/\s+/g, '_')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecordingExport(false);
        setExportProgress(100);
      };

      recorder.start();
      setExportProgress(30);

      // Record sequence for total project duration or fast preview (10 sec preview capture)
      setTimeout(() => {
        setExportProgress(80);
        recorder.stop();
      }, 8000);
    } catch (err) {
      console.error('Recording failed:', err);
      setIsRecordingExport(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '1240px',
          height: '92vh',
          backgroundColor: '#0D1321',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px rgba(99, 102, 241, 0.2)'
        }}
      >
        {/* Top Navigation Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(17, 24, 39, 0.7)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1, #EC4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Film size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC' }}>
                  AI Video & Podcast Studio
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: '#818CF8',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}
                >
                  NotebookLM Pipeline Engine
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {businessTitle} • {project?.scenes?.length || 0} сцен • ~{project?.totalDurationSeconds || 0} сек.
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {[
              { id: 'storyboard', label: '1. Раскадровка', icon: Layers },
              { id: 'visuals', label: '2. Кадры и Стили', icon: ImageIcon },
              { id: 'voice', label: '3. Озвучка', icon: Mic },
              { id: 'player', label: '4. Кинозал и Рендер', icon: Play }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id !== 'player') stopAudio();
                    setActiveTab(tab.id as any);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)'
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              stopAudio();
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {/* TAB 1: STORYBOARD */}
          {activeTab === 'storyboard' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Storyboard Controls Toolbar */}
              <div
                style={{
                  padding: '14px 24px',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Стиль съемки:</span>
                  <select
                    value={project?.visualStyle || 'cinematic_realistic'}
                    onChange={(e) => {
                      const newStyle = e.target.value as VisualStyle;
                      if (project) {
                        setProject({ ...project, visualStyle: newStyle });
                        handleRegenerateStoryboard(newStyle);
                      }
                    }}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="cinematic_realistic">Кинематографичный реализм (8K)</option>
                    <option value="isometric_3d">3D Isometric (Pixar Tech)</option>
                    <option value="dark_tech_hud">Cyberpunk Dark Tech / HUD</option>
                    <option value="corporate_minimal">Swiss Corporate Minimal</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleRegenerateStoryboard()}
                    disabled={isGeneratingScenes}
                    className="button-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '13px'
                    }}
                  >
                    <Wand2 size={16} className={isGeneratingScenes ? 'animate-spin' : ''} />
                    {isGeneratingScenes ? 'AI Режиссер пишет сценарий...' : 'Переписать сценарий с AI'}
                  </button>
                </div>
              </div>

              {/* Scenes List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {isGeneratingScenes ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Wand2 size={36} color="var(--accent-primary)" style={{ animation: 'spin 2s linear infinite', margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>AI-режиссер создает раскадровку...</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                      Генерируем реплики для двух спикеров, вычисляем тайминги и формируем промпты для каждого кадра.
                    </p>
                  </div>
                ) : project?.scenes && project.scenes.length > 0 ? (
                  project.scenes.map((scene, idx) => {
                    const isHost = scene.speaker === 'host_analyst';
                    return (
                      <div
                        key={scene.id}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: 'var(--radius-lg)',
                          border: `1px solid ${isHost ? 'rgba(6, 182, 212, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Scene Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: '700'
                              }}
                            >
                              {scene.sceneIndex}
                            </span>
                            <input
                              type="text"
                              value={scene.title}
                              onChange={(e) => handleUpdateScene(idx, { title: e.target.value })}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#F8FAFC',
                                fontSize: '16px',
                                fontWeight: '700',
                                borderBottom: '1px dashed rgba(255, 255, 255, 0.2)',
                                padding: '2px 6px'
                              }}
                            />
                          </div>

                          {/* Speaker Selector */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                backgroundColor: isHost ? 'rgba(6, 182, 212, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                                color: isHost ? '#22D3EE' : '#C084FC',
                                border: `1px solid ${isHost ? 'rgba(6, 182, 212, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                              }}
                            >
                              <User size={14} />
                              {scene.speakerName}
                            </span>
                            <button
                              onClick={() => {
                                const nextSpeaker = isHost ? 'cohost_strategist' : 'host_analyst';
                                const nextName = isHost ? 'Елена (Стратег)' : 'Алекс (Аналитик)';
                                handleUpdateScene(idx, { speaker: nextSpeaker, speakerName: nextName });
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border-medium)',
                                color: 'var(--text-secondary)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Сменить спикера
                            </button>
                          </div>
                        </div>

                        {/* Editable Script Text */}
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                            Текст реплики (озвучка):
                          </label>
                          <textarea
                            value={scene.scriptText}
                            rows={3}
                            onChange={(e) => handleUpdateScene(idx, { scriptText: e.target.value })}
                            style={{
                              width: '100%',
                              backgroundColor: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              color: '#F8FAFC',
                              fontSize: '14px',
                              lineHeight: '1.6',
                              resize: 'vertical'
                            }}
                          />
                        </div>

                        {/* Visual Prompt Section */}
                        <div
                          style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ImageIcon size={14} />
                              Промпт для генератора кадра (Midjourney / DALL-E / Flux):
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Ракурс: {scene.cameraAngle}
                            </span>
                          </div>
                          <textarea
                            value={scene.visualPrompt}
                            rows={2}
                            onChange={(e) => handleUpdateScene(idx, { visualPrompt: e.target.value })}
                            style={{
                              width: '100%',
                              backgroundColor: 'transparent',
                              border: '1px dashed rgba(255, 255, 255, 0.15)',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              color: '#CBD5E1',
                              fontSize: '13px',
                              fontFamily: 'monospace'
                            }}
                          />
                          {scene.keyMetricBadge && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Плашка метрики:</span>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                                {scene.keyMetricBadge.label}: {scene.keyMetricBadge.value}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Раскадровка еще не создана.</p>
                    <button
                      onClick={() => handleRegenerateStoryboard()}
                      className="button-primary"
                      style={{ marginTop: '14px' }}
                    >
                      Сгенерировать раскадровку
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VISUALS GALLERY */}
          {activeTab === 'visuals' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F8FAFC' }}>
                    Генерация опорных кадров для каждой сцены
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Кадры генерируются моделью Flux по выверенным кинематографичным промптам AI-режиссера.
                  </p>
                </div>
                <button
                  onClick={handleGenerateAllImages}
                  className="button-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                >
                  <Sparkles size={16} />
                  Сгенерировать все кадры
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '20px'
                }}
              >
                {project?.scenes.map((scene, idx) => {
                  const isGen = generatingImagesMap[scene.id];
                  return (
                    <div
                      key={scene.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {/* Image Preview Box */}
                      <div
                        style={{
                          height: '200px',
                          backgroundColor: '#070B14',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        {scene.imageUrl ? (
                          <img
                            src={scene.imageUrl}
                            alt={scene.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            <ImageIcon size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Кадр еще не сгенерирован</span>
                          </div>
                        )}

                        {/* Top Badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(6px)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#F8FAFC'
                          }}
                        >
                          Сцена {scene.sceneIndex}
                        </div>
                      </div>

                      {/* Scene Info & Controls */}
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', marginBottom: '4px' }}>
                            {scene.title}
                          </h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {scene.visualPrompt}
                          </p>
                        </div>

                        <button
                          onClick={() => handleGenerateImageForScene(scene)}
                          disabled={isGen}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            borderRadius: '8px',
                            color: '#818CF8',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <RefreshCw size={14} className={isGen ? 'animate-spin' : ''} />
                          {isGen ? 'Генерация изображения...' : scene.imageUrl ? 'Перегенерировать кадр' : 'Сгенерировать кадр'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: VOICE SETTINGS */}
          {activeTab === 'voice' && (
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC' }}>
                    Синтез речи и настройка ведущих подкаста
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Два отдельных голоса озвучивают диалог: Алекс вскрывает риски, Елена представляет решения.
                  </p>
                </div>

                {/* Host (Analyst) Voice Card */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} color="#06B6D4" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#F8FAFC' }}>Спикер 1: Алекс (Аналитик)</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Критический разбор, вопросы, аудит первичных цифр</p>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Голос синтеза речи:
                    </label>
                    <select
                      value={hostVoiceUri}
                      onChange={(e) => setHostVoiceUri(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px'
                      }}
                    >
                      {availableVoices.map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cohost (Strategist) Voice Card */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} color="#8B5CF6" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#F8FAFC' }}>Спикер 2: Елена (Стратег)</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Стратегические выводы, расчетные модели P1/P2, план роста</p>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Голос синтеза речи:
                    </label>
                    <select
                      value={cohostVoiceUri}
                      onChange={(e) => setCohostVoiceUri(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '13px'
                      }}
                    >
                      {availableVoices.map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Speed Slider */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Скорость воспроизведения:</span>
                    <span style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: '700' }}>{playbackSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.8"
                    step="0.1"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CINEMA PLAYER & RENDERER */}
          {activeTab === 'player' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '20px' }}>
              {/* Canvas Screen */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#000000',
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(99, 102, 241, 0.2)',
                  border: '1px solid var(--border-glow)'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />

                {/* Big Center Play Button Overlay if not playing */}
                {!isPlaying && (
                  <button
                    onClick={handleTogglePlay}
                    style={{
                      position: 'absolute',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.9)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)',
                      transition: 'transform 0.2s',
                      backdropFilter: 'blur(8px)'
                    }}
                  >
                    <Play size={36} color="#FFFFFF" style={{ marginLeft: '4px' }} />
                  </button>
                )}
              </div>

              {/* Player Timeline & Controls Bar */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  padding: '16px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Left Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={handleTogglePlay}
                    className="button-primary"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                  </button>

                  <button
                    onClick={() => {
                      if (currentPlayingSceneIdx > 0) {
                        playSceneAudio(currentPlayingSceneIdx - 1);
                      }
                    }}
                    disabled={currentPlayingSceneIdx === 0}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: currentPlayingSceneIdx === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <span style={{ fontSize: '13px', fontWeight: '600' }}>
                    Сцена {currentPlayingSceneIdx + 1} из {project?.scenes.length || 1}
                  </span>

                  <button
                    onClick={() => {
                      if (project && currentPlayingSceneIdx + 1 < project.scenes.length) {
                        playSceneAudio(currentPlayingSceneIdx + 1);
                      }
                    }}
                    disabled={!project || currentPlayingSceneIdx + 1 >= project.scenes.length}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: !project || currentPlayingSceneIdx + 1 >= project.scenes.length ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>

                {/* Center Scene Progress Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {project?.scenes.map((sc, i) => (
                    <button
                      key={sc.id}
                      onClick={() => playSceneAudio(i)}
                      style={{
                        width: i === currentPlayingSceneIdx ? '28px' : '10px',
                        height: '10px',
                        borderRadius: '5px',
                        backgroundColor: i === currentPlayingSceneIdx ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={`Сцена ${i + 1}: ${sc.title}`}
                    />
                  ))}
                </div>

                {/* Right Controls: Sound & Export */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isMuted ? 'var(--accent-rose)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>

                  <button
                    onClick={handleExportVideo}
                    disabled={isRecordingExport}
                    className="button-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      fontSize: '13px',
                      background: 'linear-gradient(135deg, #10B981, #059669)'
                    }}
                  >
                    <Download size={16} />
                    {isRecordingExport ? `Рендер видео (${exportProgress}%)...` : 'Скачать видео (WebM / MP4)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
