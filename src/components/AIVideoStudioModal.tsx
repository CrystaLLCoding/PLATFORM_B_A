'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Play,
  Pause,
  Film,
  Mic,
  Image as ImageIcon,
  Download,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Layers,
  Wand2,
  User,
  Radio,
  Upload,
  BarChart3,
  Sliders,
  Key,
  Volume1,
  ExternalLink,
  Clock,
  Music,
  Trash2,
  Copy,
  Check
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
  const [synthesizingVoiceMap, setSynthesizingVoiceMap] = useState<Record<string, boolean>>({});
  const [isBatchSynthesizing, setIsBatchSynthesizing] = useState(false);

  // Settings & Custom API Keys
  const [showSettings, setShowSettings] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [voiceProvider, setVoiceProvider] = useState<'edge-tts' | 'elevenlabs' | 'openai'>('edge-tts');

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingSceneIdx, setCurrentPlayingSceneIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isRecordingExport, setIsRecordingExport] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const masterAudioInputRef = useRef<HTMLInputElement | null>(null);
  const [notebookLmTimerSeconds, setNotebookLmTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [copiedSources, setCopiedSources] = useState(false);
  const [isPlayingMasterPreview, setIsPlayingMasterPreview] = useState(false);
  const masterAudioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Load project & saved keys
  useEffect(() => {
    if (!isOpen) return;

    // Load saved keys from localStorage
    if (typeof window !== 'undefined') {
      const savedOAI = localStorage.getItem('pipeline_openai_key') || '';
      const savedEL = localStorage.getItem('pipeline_elevenlabs_key') || '';
      const savedProv = (localStorage.getItem('pipeline_voice_provider') as any) || 'edge-tts';
      setOpenaiKey(savedOAI);
      setElevenlabsKey(savedEL);
      setVoiceProvider(savedProv);

      // Pre-warm SpeechSynthesis voices list
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }

    if (!project) {
      fetchProject();
    } else if (project.scenes?.some(s => !s.audioUrl)) {
      triggerAutoSynthesize(project);
    }
  }, [isOpen, caseId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && notebookLmTimerSeconds !== null && notebookLmTimerSeconds > 0) {
      interval = setInterval(() => {
        setNotebookLmTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, notebookLmTimerSeconds]);

  const saveSettings = (oai: string, el: string, prov: 'edge-tts' | 'elevenlabs' | 'openai') => {
    setOpenaiKey(oai);
    setElevenlabsKey(el);
    setVoiceProvider(prov);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pipeline_openai_key', oai);
      localStorage.setItem('pipeline_elevenlabs_key', el);
      localStorage.setItem('pipeline_voice_provider', prov);
    }
  };

  const triggerAutoSynthesize = async (proj: VideoPipelineProject) => {
    if (isBatchSynthesizing) return;
    setIsBatchSynthesizing(true);
    try {
      const activeKey = voiceProvider === 'elevenlabs' ? elevenlabsKey : (voiceProvider === 'openai' ? openaiKey : undefined);
      const res = await fetch(`/api/cases/${caseId}/pipeline/synthesize-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'synthesize_all',
          provider: voiceProvider,
          apiKey: activeKey,
          speed: playbackSpeed
        })
      });
      const data = await res.json();
      if (data.success && data.scenes) {
        const updated = { ...proj, scenes: data.scenes };
        setProject(updated);
        if (onProjectUpdated) onProjectUpdated(updated);
      }
    } catch (e) {
      console.warn('[triggerAutoSynthesize] Error:', e);
    } finally {
      setIsBatchSynthesizing(false);
    }
  };

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/pipeline/storyboard`);
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        if (onProjectUpdated) onProjectUpdated(data.project);
        if (data.project.scenes?.some((s: StoryboardScene) => !s.audioUrl)) {
          triggerAutoSynthesize(data.project);
        }
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
          visualStyle: style || project?.visualStyle || 'isometric_3d'
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

  // --- IMAGE GENERATION / UPLOADING ---
  const handleGenerateImageForScene = async (scene: StoryboardScene, mode: 'ai' | 'infographic' = 'ai') => {
    setGeneratingImagesMap(prev => ({ ...prev, [scene.id]: true }));
    try {
      const res = await fetch(`/api/cases/${caseId}/pipeline/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          prompt: scene.visualPrompt,
          visualStyle: project?.visualStyle || 'isometric_3d',
          mode,
          openaiApiKey: openaiKey
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

  const handleCustomImageUpload = (sceneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setGeneratingImagesMap(prev => ({ ...prev, [sceneId]: true }));
        try {
          const res = await fetch(`/api/cases/${caseId}/pipeline/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneId,
              customImageUrl: base64Url
            })
          });
          const data = await res.json();
          if (data.success && data.imageUrl) {
            const updatedScenes = project.scenes.map(s =>
              s.id === sceneId ? { ...s, imageUrl: data.imageUrl } : s
            );
            handleSaveSceneChanges(updatedScenes);
          }
        } finally {
          setGeneratingImagesMap(prev => ({ ...prev, [sceneId]: false }));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAllImages = async (mode: 'ai' | 'infographic' = 'ai') => {
    if (!project) return;
    for (const scene of project.scenes) {
      await handleGenerateImageForScene(scene, mode);
    }
  };

  // --- NEURAL VOICE SYNTHESIS ---
  const handleSynthesizeVoiceForScene = async (scene: StoryboardScene) => {
    setSynthesizingVoiceMap(prev => ({ ...prev, [scene.id]: true }));
    try {
      const activeKey = voiceProvider === 'elevenlabs' ? elevenlabsKey : (voiceProvider === 'openai' ? openaiKey : undefined);
      const res = await fetch(`/api/cases/${caseId}/pipeline/synthesize-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          text: scene.scriptText,
          speaker: scene.speaker,
          provider: voiceProvider,
          apiKey: activeKey,
          speed: playbackSpeed
        })
      });
      const data = await res.json();
      if (data.success && data.audioUrl && project) {
        const updatedScenes = project.scenes.map(s =>
          s.id === scene.id ? { ...s, audioUrl: data.audioUrl } : s
        );
        handleSaveSceneChanges(updatedScenes);
      }
    } catch (err) {
      console.error('Failed to synthesize voice:', err);
    } finally {
      setSynthesizingVoiceMap(prev => ({ ...prev, [scene.id]: false }));
    }
  };

  const handleBatchSynthesizeAll = async () => {
    if (!project) return;
    await triggerAutoSynthesize(project);
  };

  // Diagnostic Sound Test for user
  const testAudioSound = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const audioCtx = new AudioCtxClass();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.38);
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        const testUtt = new SpeechSynthesisUtterance('Звук студии активен');
        testUtt.lang = 'ru-RU';
        testUtt.rate = 1.1;
        setTimeout(() => {
          window.speechSynthesis.speak(testUtt);
        }, 150);
      }
    } catch (e) {
      console.warn('Audio test error:', e);
    }
  };

  // --- AUDIO & MOTION PLAYER ---
  const stopPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (masterAudioPreviewRef.current) {
      masterAudioPreviewRef.current.pause();
      setIsPlayingMasterPreview(false);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const playScene = (sceneIndex: number) => {
    if (!project || sceneIndex >= project.scenes.length) {
      stopPlayback();
      return;
    }

    const scene = project.scenes[sceneIndex];
    setCurrentPlayingSceneIdx(sceneIndex);

    // Stop previous audio & speech
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (isMuted) {
      fallbackTimerAdvance(scene, sceneIndex);
      return;
    }

    // 1. If real Neural MP3 audio is available, play it directly!
    if (scene.audioUrl) {
      const audio = new Audio();
      audio.src = scene.audioUrl;
      audio.playbackRate = playbackSpeed;
      audioPlayerRef.current = audio;

      audio.onended = () => {
        if (sceneIndex + 1 < project.scenes.length) {
          playScene(sceneIndex + 1);
        } else {
          setIsPlaying(false);
        }
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, falling back to browser speech:', e);
        speakWithBrowserTts(scene, sceneIndex);
      };

      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Autoplay blocked or audio error, falling back to speech:', err);
        speakWithBrowserTts(scene, sceneIndex);
      });
      return;
    }

    // 2. If Neural Audio is not ready yet:
    // Speak via browser speech synthesis immediately so there is ZERO SILENCE!
    speakWithBrowserTts(scene, sceneIndex);

    // And trigger background neural synthesis for this scene right away!
    handleSynthesizeVoiceForScene(scene);
  };

  const speakWithBrowserTts = (scene: StoryboardScene, sceneIndex: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted) {
      fallbackTimerAdvance(scene, sceneIndex);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(scene.scriptText);
      utterance.rate = playbackSpeed;
      utterance.lang = 'ru-RU';

      const voices = window.speechSynthesis.getVoices();
      const ruVoices = voices.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith('ru'));
      if (scene.speaker === 'cohost_strategist' && ruVoices.length > 1) {
        utterance.voice = ruVoices[1];
      } else if (ruVoices.length > 0) {
        utterance.voice = ruVoices[0];
      }

      utterance.onend = () => {
        if (sceneIndex + 1 < (project?.scenes.length || 0)) {
          playScene(sceneIndex + 1);
        } else {
          setIsPlaying(false);
        }
      };

      utterance.onerror = (e) => {
        console.warn('Browser speech error, timer fallback:', e);
        fallbackTimerAdvance(scene, sceneIndex);
      };

      setIsPlaying(true);
      setTimeout(() => {
        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('speechSynthesis.speak failed:', e);
          fallbackTimerAdvance(scene, sceneIndex);
        }
      }, 50);
    } catch (e) {
      console.warn('Speech synthesis caught error, advancing timer:', e);
      fallbackTimerAdvance(scene, sceneIndex);
    }
  };

  const fallbackTimerAdvance = (scene: StoryboardScene, sceneIndex: number) => {
    setIsPlaying(true);
    const duration = (scene.durationSeconds || 15) * 1000;
    setTimeout(() => {
      if (sceneIndex + 1 < (project?.scenes.length || 0)) {
        playScene(sceneIndex + 1);
      } else {
        setIsPlaying(false);
      }
    }, duration);
  };

  const playMasterAudioTrack = (startSceneIdx?: number) => {
    if (!project || !project.masterAudioUrl) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    let audio = audioPlayerRef.current;
    if (!audio || audio.src !== project.masterAudioUrl) {
      audio = new Audio(project.masterAudioUrl);
      audioPlayerRef.current = audio;
    }

    audio.playbackRate = playbackSpeed;

    if (startSceneIdx !== undefined && audio.duration && !isNaN(audio.duration) && project.scenes.length > 0) {
      const targetTime = (startSceneIdx / project.scenes.length) * audio.duration;
      audio.currentTime = targetTime;
      setCurrentPlayingSceneIdx(startSceneIdx);
    }

    audio.ontimeupdate = () => {
      if (audio && audio.duration && !isNaN(audio.duration) && project.scenes.length > 0) {
        const progress = audio.currentTime / audio.duration;
        const currentIdx = Math.min(
          Math.floor(progress * project.scenes.length),
          project.scenes.length - 1
        );
        setCurrentPlayingSceneIdx(currentIdx);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentPlayingSceneIdx(0);
      if (audioPlayerRef.current) audioPlayerRef.current.currentTime = 0;
    };

    audio.onerror = (e) => {
      console.warn('Master audio playback error:', e);
      setIsPlaying(false);
    };

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.warn('Master audio autoplay blocked:', err);
      setIsPlaying(false);
    });
  };

  const handleOpenNotebookLmWithTimer = () => {
    const facts = project?.scenes.map(s => `[${s.speakerName}]: ${s.scriptText}`).join('\n\n') || businessTitle;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`Аналитический аудит для подкаста: ${businessTitle}\n\n${facts}`);
    }
    setCopiedSources(true);
    setTimeout(() => setCopiedSources(false), 3000);

    if (typeof window !== 'undefined') {
      window.open('https://notebooklm.google.com', '_blank');
    }

    setNotebookLmTimerSeconds(150);
    setIsTimerRunning(true);
  };

  const handleUploadMasterAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        const updated = {
          ...project,
          masterAudioUrl: base64Url,
          masterAudioName: file.name
        };
        setProject(updated);
        if (onProjectUpdated) onProjectUpdated(updated);

        try {
          await fetch(`/api/cases/${caseId}/pipeline/storyboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save',
              scenes: project.scenes,
              visualStyle: project.visualStyle,
              masterAudioUrl: base64Url,
              masterAudioName: file.name
            })
          });
        } catch (err) {
          console.error('Failed to save master audio:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMasterAudio = async () => {
    if (!project) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (masterAudioPreviewRef.current) {
      masterAudioPreviewRef.current.pause();
      setIsPlayingMasterPreview(false);
    }
    const updated = {
      ...project,
      masterAudioUrl: undefined,
      masterAudioName: undefined
    };
    setProject(updated);
    if (onProjectUpdated) onProjectUpdated(updated);

    try {
      await fetch(`/api/cases/${caseId}/pipeline/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          scenes: project.scenes,
          visualStyle: project.visualStyle,
          masterAudioUrl: '',
          masterAudioName: ''
        })
      });
    } catch (err) {
      console.error('Failed to remove master audio:', err);
    }
  };

  const toggleMasterAudioPreview = () => {
    if (!project?.masterAudioUrl) return;
    if (isPlayingMasterPreview && masterAudioPreviewRef.current) {
      masterAudioPreviewRef.current.pause();
      setIsPlayingMasterPreview(false);
    } else {
      if (!masterAudioPreviewRef.current || masterAudioPreviewRef.current.src !== project.masterAudioUrl) {
        masterAudioPreviewRef.current = new Audio(project.masterAudioUrl);
        masterAudioPreviewRef.current.onended = () => setIsPlayingMasterPreview(false);
      }
      masterAudioPreviewRef.current.play().then(() => {
        setIsPlayingMasterPreview(true);
      }).catch(err => {
        console.warn('Preview play blocked:', err);
      });
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      // Unlock AudioContext on direct user click
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          const ctx = new AudioCtxClass();
          if (ctx.state === 'suspended') ctx.resume();
        }
      } catch {}

      if (project?.masterAudioUrl) {
        playMasterAudioTrack(currentPlayingSceneIdx);
      } else {
        playScene(currentPlayingSceneIdx);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopPlayback();
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

      // 1. Dark Studio Background
      ctx.fillStyle = '#070A12';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Scene Visual with smooth Ken Burns motion
      if (currentImageObj && currentImageObj.complete) {
        const zoom = 1 + (Math.sin(elapsed * 0.12) + 1) * 0.035;
        const panX = Math.cos(elapsed * 0.08) * 12;
        const panY = Math.sin(elapsed * 0.06) * 8;

        ctx.save();
        ctx.translate(width / 2 + panX, height / 2 + panY);
        ctx.scale(zoom, zoom);
        ctx.drawImage(currentImageObj, -width / 2, -height / 2, width, height);
        ctx.restore();

        // Dark gradient overlay
        const gradient = ctx.createLinearGradient(0, height * 0.35, 0, height);
        gradient.addColorStop(0, 'rgba(7, 10, 18, 0)');
        gradient.addColorStop(0.6, 'rgba(7, 10, 18, 0.7)');
        gradient.addColorStop(1, 'rgba(7, 10, 18, 0.95)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else {
        // High-end fallback geometric studio grid
        const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.4);
        grad.addColorStop(0, currentScene?.speaker === 'cohost_strategist' ? '#1E1B4B' : '#042F2E');
        grad.addColorStop(1, '#070A12');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 3. Top Badges (Speaker & Audio Status)
      if (currentScene) {
        if (project.masterAudioUrl) {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
          ctx.strokeStyle = '#06B6D4';
          ctx.lineWidth = 1.5;
          roundRect(ctx, 40, 40, 310, 46, 12, true, true);

          ctx.fillStyle = '#22D3EE';
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.fillText('🎙️ NotebookLM Audio Master', 65, 69);
        } else {
          const isHost = currentScene.speaker === 'host_analyst';
          ctx.fillStyle = isHost ? 'rgba(6, 182, 212, 0.25)' : 'rgba(139, 92, 246, 0.25)';
          ctx.strokeStyle = isHost ? '#06B6D4' : '#8B5CF6';
          ctx.lineWidth = 1.5;
          roundRect(ctx, 40, 40, 260, 46, 12, true, true);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 15px Inter, sans-serif';
          ctx.fillText(currentScene.speakerName, 65, 69);
        }

        // Key Metric Badge (Top Right)
        if (currentScene.keyMetricBadge) {
          const badge = currentScene.keyMetricBadge;
          const badgeX = width - 290;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.5;
          roundRect(ctx, badgeX, 40, 250, 46, 12, true, true);

          ctx.fillStyle = '#A7F3D0';
          ctx.font = '11px Inter, sans-serif';
          ctx.fillText(badge.label.slice(0, 20), badgeX + 20, 58);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 16px Outfit, Inter, sans-serif';
          ctx.fillText(badge.value, badgeX + 20, 77);
        }

        // Subtitle Overlay
        const subBoxY = height - 165;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        roundRect(ctx, 40, subBoxY, width - 80, 115, 14, true, true);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(`СЦЕНА ${currentScene.sceneIndex}: ${currentScene.title.toUpperCase()}`, 65, subBoxY + 32);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '500 18px Inter, sans-serif';
        wrapText(ctx, currentScene.scriptText, 65, subBoxY + 64, width - 130, 26);
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeTab, currentPlayingSceneIdx, project]);

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean, stroke: boolean) {
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

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let curY = y;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
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

  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;

    try {
      setIsRecordingExport(true);
      setExportProgress(15);

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
      setExportProgress(40);
      setTimeout(() => {
        setExportProgress(85);
        recorder.stop();
      }, 9000);
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
        backgroundColor: 'rgba(5, 8, 16, 0.92)',
        backdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '1260px',
          height: '94vh',
          backgroundColor: '#0D1321',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 50px rgba(99, 102, 241, 0.25)'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(17, 24, 39, 0.75)'
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
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34D399',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Neural Studio V2
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {businessTitle} • {project?.scenes?.length || 0} сцен
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
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
              { id: 'visuals', label: '2. Кадры & Слайды', icon: ImageIcon },
              { id: 'voice', label: '3. Нейрозвук', icon: Mic },
              { id: 'player', label: '4. Кинозал & Рендер', icon: Play }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id !== 'player') stopPlayback();
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

          {/* Settings & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: showSettings ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: '1px solid var(--border-medium)',
                color: showSettings ? 'var(--accent-primary)' : 'var(--text-secondary)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sliders size={16} />
              <span>API Ключи</span>
            </button>

            <button
              onClick={() => {
                stopPlayback();
                onClose();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Settings Bar Dropdown */}
        {showSettings && (
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}
          >
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Движок озвучки:
              </label>
              <select
                value={voiceProvider}
                onChange={(e) => saveSettings(openaiKey, elevenlabsKey, e.target.value as any)}
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: '#F8FAFC',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '12px'
                }}
              >
                <option value="edge-tts">Microsoft Neural (Edge-TTS) — Бесплатно &amp; Студийно</option>
                <option value="elevenlabs">ElevenLabs API (Свой ключ)</option>
                <option value="openai">OpenAI TTS HD (Свой ключ)</option>
              </select>
            </div>

            {voiceProvider === 'elevenlabs' && (
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  ElevenLabs API Key:
                </label>
                <input
                  type="password"
                  value={elevenlabsKey}
                  placeholder="xi-api-key..."
                  onChange={(e) => saveSettings(openaiKey, e.target.value, voiceProvider)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    color: '#F8FAFC',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px'
                  }}
                />
              </div>
            )}

            {voiceProvider === 'openai' && (
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  OpenAI API Key (для TTS и DALL-E 3):
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  placeholder="sk-..."
                  onChange={(e) => saveSettings(e.target.value, elevenlabsKey, voiceProvider)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    color: '#F8FAFC',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Main Content Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {/* TAB 1: STORYBOARD */}
          {activeTab === 'storyboard' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                    value={project?.visualStyle || 'isometric_3d'}
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
                    <option value="isometric_3d">3D Изометрия &amp; Данные (Bloomberg / Pixar Tech)</option>
                    <option value="cinematic_realistic">Кинематографичный 8K (Архитектура &amp; Аналитика)</option>
                    <option value="dark_tech_hud">Cyberpunk Dark Tech / HUD</option>
                    <option value="corporate_minimal">Swiss Corporate Minimal</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRegenerateStoryboard()}
                  disabled={isGeneratingScenes}
                  className="button-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                >
                  <Wand2 size={16} className={isGeneratingScenes ? 'animate-spin' : ''} />
                  {isGeneratingScenes ? 'AI Режиссер пишет...' : 'Переписать сценарий с AI'}
                </button>
              </div>

              {/* Scenes List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {project?.scenes.map((scene, idx) => {
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
                        gap: '14px'
                      }}
                    >
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
                            lineHeight: '1.6'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VISUALS & SLIDES */}
          {activeTab === 'visuals' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#F8FAFC' }}>
                    Кадры &amp; Слайды бизнес-аналитики
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Каждая сцена может использовать: 3D-арт, инфографическую карточку данных или ваш собственный слайд.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleGenerateAllImages('infographic')}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}
                  >
                    <BarChart3 size={15} color="#10B981" />
                    Все сцены в Инфографику
                  </button>
                  <button
                    onClick={() => handleGenerateAllImages('ai')}
                    className="button-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
                  >
                    <Sparkles size={15} />
                    Сгенерировать 3D-кадры
                  </button>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
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
                      {/* Image Preview Box (16:9 Ratio) */}
                      <div
                        style={{
                          width: '100%',
                          aspectRatio: '16 / 9',
                          backgroundColor: '#070B14',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}
                      >
                        {scene.imageUrl ? (
                          <img
                            src={scene.imageUrl}
                            alt={scene.title}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              // If image fails, auto-trigger clean infographic generation
                              handleGenerateImageForScene(scene, 'infographic');
                            }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            <ImageIcon size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Кадр не установлен</span>
                          </div>
                        )}

                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#F8FAFC'
                          }}
                        >
                          Сцена {scene.sceneIndex}
                        </div>
                      </div>

                      {/* Controls Bar */}
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#F8FAFC', marginBottom: '4px' }}>
                            {scene.title}
                          </h4>
                          {scene.keyMetricBadge && (
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '6px' }}>
                              {scene.keyMetricBadge.label}: {scene.keyMetricBadge.value}
                            </span>
                          )}
                        </div>

                        {/* Actions for this frame */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button
                            onClick={() => handleGenerateImageForScene(scene, 'infographic')}
                            disabled={isGen}
                            style={{
                              padding: '8px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              borderRadius: '6px',
                              color: '#6EE7B7',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <BarChart3 size={13} />
                            Инфографика
                          </button>

                          <button
                            onClick={() => handleGenerateImageForScene(scene, 'ai')}
                            disabled={isGen}
                            style={{
                              padding: '8px',
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.35)',
                              borderRadius: '6px',
                              color: '#818CF8',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Sparkles size={13} />
                            3D-Арт
                          </button>
                        </div>

                        {/* Custom Upload Button */}
                        <input
                          ref={el => { fileInputsRef.current[scene.id] = el; }}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleCustomImageUpload(scene.id, e)}
                        />
                        <button
                          onClick={() => fileInputsRef.current[scene.id]?.click()}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: 'transparent',
                            border: '1px dashed var(--border-medium)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Upload size={13} />
                          Загрузить свой слайд / скриншот
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: NEURAL VOICEOVER */}
          {activeTab === 'voice' && (
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F8FAFC' }}>
                      Нейронная озвучка дикторов (Студийное качество)
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Два профессиональных голоса: Алекс (Аналитик) и Елена (Стратег) с правильными интонациями и дыханием.
                    </p>
                  </div>

                  <button
                    onClick={handleBatchSynthesizeAll}
                    disabled={isBatchSynthesizing}
                    className="button-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px' }}
                  >
                    <Mic size={16} className={isBatchSynthesizing ? 'animate-spin' : ''} />
                    {isBatchSynthesizing ? 'Озвучиваем все сцены...' : 'Озвучить все сцены нейросетью'}
                  </button>
                </div>

                {/* GOOGLE NOTEBOOKLM MASTER TRACK BRIDGE */}
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    padding: '24px',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF'
                        }}
                      >
                        <Radio size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                            Google NotebookLM Master Audio (Оригинал)
                          </h4>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(6, 182, 212, 0.2)',
                              color: '#22D3EE',
                              fontWeight: '700',
                              border: '1px solid rgba(6, 182, 212, 0.3)'
                            }}
                          >
                            100% Живой звук Google
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                          Google SoundStorm / Gemini Dialog генерирует естественный разговорный подкаст с перебиваниями и смехом.
                        </p>
                      </div>
                    </div>

                    {project?.masterAudioUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={toggleMasterAudioPreview}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            backgroundColor: isPlayingMasterPreview ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            border: `1px solid ${isPlayingMasterPreview ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                            borderRadius: '6px',
                            color: isPlayingMasterPreview ? '#FCA5A5' : '#6EE7B7',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          {isPlayingMasterPreview ? <Pause size={14} /> : <Play size={14} />}
                          {isPlayingMasterPreview ? 'Остановить тест' : 'Слушать мастер-трек'}
                        </button>
                        <button
                          onClick={handleRemoveMasterAudio}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 10px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '6px',
                            color: '#F87171',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          title="Удалить мастер-трек"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {project?.masterAudioUrl ? (
                    <div
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={18} color="#10B981" />
                        <span style={{ fontSize: '13px', color: '#E2E8F0', fontWeight: '500' }}>
                          Подключен файл: <strong style={{ color: '#6EE7B7' }}>{project.masterAudioName || 'notebooklm_audio.m4a'}</strong>
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#A7F3D0' }}>
                        В Кинотеатре (Вкладка 4) слайды автоматически сменяются под этот звук!
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '14px',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px dashed var(--border-subtle)'
                      }}
                    >
                      {/* Step 1 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(99, 102, 241, 0.25)',
                              color: '#818CF8',
                              fontSize: '11px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            1
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#F8FAFC' }}>
                            Сгенерировать в Google
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                          Скопирует все выводы и откроет блокнот NotebookLM. Нажмите «Generate Audio Overview».
                        </p>
                        <button
                          onClick={handleOpenNotebookLmWithTimer}
                          style={{
                            marginTop: 'auto',
                            padding: '9px 14px',
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            borderRadius: '6px',
                            color: '#C7D2FE',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          {copiedSources ? <Check size={14} color="#10B981" /> : <ExternalLink size={14} />}
                          {copiedSources ? 'Факты скопированы! Открываем...' : 'Скопировать факты и открыть NotebookLM'}
                        </button>

                        {isTimerRunning && notebookLmTimerSeconds !== null && (
                          <div
                            style={{
                              marginTop: '4px',
                              fontSize: '11px',
                              color: '#38BDF8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Clock size={13} className="animate-spin" />
                            <span>
                              Обычно генерация занимает ~2-3 мин (осталось ~
                              {Math.floor(notebookLmTimerSeconds / 60)}:
                              {(notebookLmTimerSeconds % 60).toString().padStart(2, '0')})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Step 2 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(6, 182, 212, 0.25)',
                              color: '#22D3EE',
                              fontSize: '11px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            2
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#F8FAFC' }}>
                            Загрузить сюда аудиофайл
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                          Скачайте готовый подкаст из NotebookLM (.m4a или .mp3) и прикрепите как единый Мастер-трек.
                        </p>
                        <input
                          ref={masterAudioInputRef}
                          type="file"
                          accept="audio/*,.m4a,.mp3,.wav"
                          style={{ display: 'none' }}
                          onChange={handleUploadMasterAudio}
                        />
                        <button
                          onClick={() => masterAudioInputRef.current?.click()}
                          style={{
                            marginTop: 'auto',
                            padding: '9px 14px',
                            backgroundColor: 'rgba(6, 182, 212, 0.2)',
                            border: '1px solid rgba(6, 182, 212, 0.4)',
                            borderRadius: '6px',
                            color: '#A5F3FC',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          <Upload size={14} />
                          Загрузить подкаст (.m4a / .mp3)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Per-scene voice synthesize cards */}
                {project?.scenes.map((scene, idx) => {
                  const isSynth = synthesizingVoiceMap[scene.id];
                  const hasAudio = Boolean(scene.audioUrl);
                  const isHost = scene.speaker === 'host_analyst';

                  return (
                    <div
                      key={scene.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        padding: '18px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: isHost ? 'rgba(6, 182, 212, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isHost ? '#06B6D4' : '#8B5CF6',
                            flexShrink: 0
                          }}
                        >
                          <Mic size={18} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF' }}>
                              Сцена {scene.sceneIndex}: {scene.speakerName}
                            </span>
                            {hasAudio ? (
                              <span style={{ fontSize: '10px', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                Аудио готово
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                Ожидает генерации
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {scene.scriptText}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasAudio && (
                          <button
                            onClick={() => {
                              const audio = new Audio(scene.audioUrl);
                              audio.play();
                            }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: 'none',
                              color: '#FFFFFF',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px'
                            }}
                          >
                            <Volume2 size={14} />
                            Слушать
                          </button>
                        )}

                        <button
                          onClick={() => handleSynthesizeVoiceForScene(scene)}
                          disabled={isSynth}
                          style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            color: '#818CF8',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          {isSynth ? 'Генерация MP3...' : hasAudio ? 'Перезаписать' : 'Озвучить'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: CINEMA PLAYER & RENDERER */}
          {activeTab === 'player' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px', gap: '18px' }}>
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
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 35px rgba(99, 102, 241, 0.25)',
                  border: '1px solid var(--border-glow)'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />

                {!isPlaying && (
                  <button
                    onClick={handleTogglePlay}
                    style={{
                      position: 'absolute',
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.95)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 0 45px rgba(99, 102, 241, 0.7)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Play size={38} color="#FFFFFF" style={{ marginLeft: '4px' }} />
                  </button>
                )}
              </div>

              {/* Player Timeline Bar */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={handleTogglePlay}
                    className="button-primary"
                    style={{ width: '44px', height: '44px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
                  </button>

                  <button
                    onClick={() => {
                      const prev = currentPlayingSceneIdx - 1;
                      if (prev >= 0) {
                        if (project?.masterAudioUrl) playMasterAudioTrack(prev);
                        else playScene(prev);
                      }
                    }}
                    disabled={currentPlayingSceneIdx === 0}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <span style={{ fontSize: '13px', fontWeight: '700' }}>
                    Сцена {currentPlayingSceneIdx + 1} из {project?.scenes.length || 1}
                  </span>

                  <button
                    onClick={() => {
                      const nxt = currentPlayingSceneIdx + 1;
                      if (project && nxt < project.scenes.length) {
                        if (project?.masterAudioUrl) playMasterAudioTrack(nxt);
                        else playScene(nxt);
                      }
                    }}
                    disabled={!project || currentPlayingSceneIdx + 1 >= project.scenes.length}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>

                {/* Center Dots & Audio Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {project?.scenes.map((sc, i) => (
                      <button
                        key={sc.id}
                        onClick={() => {
                          if (project?.masterAudioUrl) playMasterAudioTrack(i);
                          else playScene(i);
                        }}
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

                  {/* Audio Readiness Pill & Action */}
                  {project && (() => {
                    if (project.masterAudioUrl) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(6, 182, 212, 0.18)',
                              color: '#22D3EE',
                              border: '1px solid rgba(6, 182, 212, 0.4)',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Radio size={12} className={isPlaying ? 'animate-pulse' : ''} />
                            Master Track: {project.masterAudioName || 'Google NotebookLM'}
                          </span>
                        </div>
                      );
                    }

                    const audioCount = project.scenes.filter(s => !!s.audioUrl).length;
                    const totalCount = project.scenes.length;
                    const allReady = audioCount === totalCount && totalCount > 0;

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: allReady ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: allReady ? '#34D399' : '#FBBF24',
                            border: `1px solid ${allReady ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Mic size={12} />
                          {allReady ? `Студийный звук: ${audioCount}/${totalCount}` : `Озвучено: ${audioCount}/${totalCount}`}
                        </span>

                        {!allReady && (
                          <button
                            onClick={handleBatchSynthesizeAll}
                            disabled={isBatchSynthesizing}
                            style={{
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              border: '1px solid rgba(99, 102, 241, 0.4)',
                              color: '#A5B4FC',
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Sparkles size={12} className={isBatchSynthesizing ? 'animate-spin' : ''} />
                            {isBatchSynthesizing ? 'Озвучиваем...' : 'Озвучить все'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Sound, Test & Export */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={testAudioSound}
                    title="Проверить звук динамиков / наушников"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Volume1 size={14} />
                    Тест звука
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    style={{ background: 'transparent', border: 'none', color: isMuted ? 'var(--accent-rose)' : 'var(--text-secondary)', cursor: 'pointer' }}
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
                    {isRecordingExport ? `Запись видео (${exportProgress}%)...` : 'Скачать видео (WebM / MP4)'}
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
