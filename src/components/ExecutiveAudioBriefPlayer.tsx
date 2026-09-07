'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square,
  Volume2, 
  VolumeX, 
  Headphones, 
  Sparkles, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  RotateCw,
  Sliders,
  CheckCircle2,
  FileText,
  Radio
} from 'lucide-react';
import { VideoOverviewData, VideoChapter } from '@/lib/types';

interface ExecutiveAudioBriefPlayerProps {
  videoOverview: VideoOverviewData;
  businessTitle: string;
}

export const ExecutiveAudioBriefPlayer: React.FC<ExecutiveAudioBriefPlayerProps> = ({
  videoOverview,
  businessTitle
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.25);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Split transcript into clean sentences for robust chunking
  const sentences = useMemo(() => {
    const raw = videoOverview.transcript || `Проведен полный фактологический аудит проекта ${businessTitle}.`;
    // Split by sentence endings (. ! ?) while keeping reasonable chunks
    const matches = raw.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
    if (!matches || matches.length === 0) return [raw];
    return matches.map(s => s.trim()).filter(Boolean);
  }, [videoOverview.transcript, businessTitle]);

  const chapters = videoOverview.chapters || [];

  // Map each chapter to an approximate sentence index
  const chapterSentenceMap = useMemo(() => {
    if (chapters.length === 0 || sentences.length === 0) return [];
    return chapters.map((ch, idx) => {
      const approxSentenceIndex = Math.min(
        sentences.length - 1,
        Math.floor((idx / chapters.length) * sentences.length)
      );
      return {
        chapter: ch,
        sentenceIndex: approxSentenceIndex
      };
    });
  }, [chapters, sentences]);

  // Active chapter based on currentSentenceIndex
  const activeChapterIndex = useMemo(() => {
    if (chapterSentenceMap.length === 0) return 0;
    for (let i = chapterSentenceMap.length - 1; i >= 0; i--) {
      if (currentSentenceIndex >= chapterSentenceMap[i].sentenceIndex) {
        return i;
      }
    }
    return 0;
  }, [chapterSentenceMap, currentSentenceIndex]);

  // Load Russian voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const ruVoices = allVoices.filter(v => v.lang.startsWith('ru') || v.lang.startsWith('RU'));
      const list = ruVoices.length > 0 ? ruVoices : allVoices;
      setAvailableVoices(list);

      // Prefer natural or online Microsoft/Google Russian voice
      const preferred = list.find(v => 
        (v.lang.startsWith('ru')) && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Dmitry'))
      ) || list.find(v => v.lang.startsWith('ru')) || list[0];

      if (preferred) {
        setSelectedVoiceUri(preferred.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Core speech execution with auto-chaining across sentences
  const sentenceIndexRef = useRef(0);
  sentenceIndexRef.current = currentSentenceIndex;

  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const playSentence = (index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (index >= sentences.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      return;
    }

    window.speechSynthesis.cancel();
    setCurrentSentenceIndex(index);

    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.lang = 'ru-RU';
    utterance.rate = playbackSpeed;
    utterance.volume = isMuted ? 0 : 1;

    if (selectedVoiceUri) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoiceUri);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      if (isPlayingRef.current) {
        playSentence(index + 1);
      }
    };

    utterance.onerror = (e) => {
      // Ignore normal cancel event
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('SpeechSynthesis error:', e);
      }
      if (isPlayingRef.current && index + 1 < sentences.length) {
        playSentence(index + 1);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(true);
    } else {
      setIsPlaying(true);
      setIsPaused(false);
      playSentence(currentSentenceIndex);
    }
  };

  const handleStop = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };

  const handleJumpChapter = (targetSentenceIndex: number) => {
    setCurrentSentenceIndex(targetSentenceIndex);
    if (isPlaying) {
      playSentence(targetSentenceIndex);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      playSentence(currentSentenceIndex);
    }
  };

  const handleSkip = (delta: number) => {
    const nextIdx = Math.max(0, Math.min(sentences.length - 1, currentSentenceIndex + delta));
    setCurrentSentenceIndex(nextIdx);
    if (isPlaying) {
      playSentence(nextIdx);
    }
  };

  // Progress calculation
  const progressPercent = sentences.length > 0 
    ? Math.round(((currentSentenceIndex + 1) / sentences.length) * 100) 
    : 0;

  const estimatedTotalSeconds = Math.round(sentences.join(' ').split(' ').length / (2.5 * playbackSpeed));
  const estimatedCurrentSeconds = Math.round((progressPercent / 100) * estimatedTotalSeconds);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      className="glass-card" 
      style={{
        padding: '22px 24px',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        background: 'linear-gradient(145deg, rgba(20, 24, 45, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        boxShadow: isPlaying ? '0 0 35px rgba(139, 92, 246, 0.25)' : '0 10px 25px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* 1. Header Bar with Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: isPlaying ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: isPlaying ? '0 0 18px rgba(16, 185, 129, 0.5)' : '0 4px 12px rgba(99, 102, 241, 0.35)',
            transition: 'all 0.3s ease'
          }}>
            {isPlaying ? <Radio size={22} className="animate-pulse" /> : <Headphones size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', fontWeight: 700, margin: 0 }}>
                Голосовой аудит Совета Директоров (AI Voice Brief)
              </h3>
              <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                <Sparkles size={11} style={{ marginRight: '3px' }} />
                100% Grounded
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Синтезированная озвучка ключевых выводов, рисков и рекомендаций спикером платформы.
            </p>
          </div>
        </div>

        {/* Right tools (Settings & Full text toggle) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              background: showVoiceSettings ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              color: showVoiceSettings ? '#A5B4FC' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
          >
            <Sliders size={13} />
            <span>Голос</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFullTranscript(!showFullTranscript)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              background: showFullTranscript ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              color: showFullTranscript ? '#A5B4FC' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
          >
            <FileText size={13} />
            <span>Текст сценария</span>
            {showFullTranscript ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Voice Selection Panel (Collapsible) */}
      {showVoiceSettings && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '10px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Диктор:
          </span>
          <select
            value={selectedVoiceUri}
            onChange={(e) => {
              setSelectedVoiceUri(e.target.value);
              if (isPlaying) playSentence(currentSentenceIndex);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#0F172A',
              border: '1px solid var(--border-subtle)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            {availableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            💡 Используется нативный синтезатор речи с поддержкой нейросетевых голосов ОС.
          </div>
        </div>
      )}

      {/* 2. Main Player Control Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Play/Pause & Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handlePlayPause}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: isPlaying 
                ? 'linear-gradient(135deg, #F43F5E, #E11D48)' 
                : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying 
                ? '0 0 24px rgba(244, 63, 94, 0.6)' 
                : '0 4px 16px rgba(99, 102, 241, 0.5)',
              transition: 'transform 0.15s ease'
            }}
            title={isPlaying ? 'Приостановить' : 'Воспроизвести аудит'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '3px' }} />}
          </button>

          {isPlaying && (
            <button
              type="button"
              onClick={handleStop}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid var(--border-subtle)',
                color: '#CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Остановить"
            >
              <Square size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSkip(-2)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px'
            }}
            title="Назад на 2 предложения"
          >
            <RotateCcw size={18} />
          </button>

          <button
            type="button"
            onClick={() => handleSkip(2)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px'
            }}
            title="Вперед на 2 предложения"
          >
            <RotateCw size={18} />
          </button>

          {/* Time Display */}
          <div style={{ marginLeft: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF', fontFamily: 'monospace' }}>
            <span>{formatTime(estimatedCurrentSeconds)}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{formatTime(estimatedTotalSeconds)}</span>
          </div>
        </div>

        {/* Animated Waveform Equalizer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '32px' }}>
          {[14, 26, 18, 30, 22, 16, 28, 20, 24, 14, 30, 18, 26, 16, 28, 22, 18, 26].map((h, i) => (
            <div
              key={i}
              style={{
                width: '3.5px',
                height: isPlaying ? `${Math.max(6, (h * ((i % 4) + 1)) % 30)}px` : '6px',
                backgroundColor: isPlaying ? (i % 2 === 0 ? '#34D399' : '#818CF8') : '#475569',
                borderRadius: '3px',
                transition: 'height 0.15s ease'
              }}
            />
          ))}
        </div>

        {/* Speed & Mute Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Speeds */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px' }}>
            {[1, 1.25, 1.5, 1.75].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSpeedChange(s)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  background: playbackSpeed === s ? '#6366F1' : 'transparent',
                  color: playbackSpeed === s ? '#FFFFFF' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            style={{
              padding: '6px',
              borderRadius: '6px',
              background: isMuted ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
              border: 'none',
              color: isMuted ? '#FB7185' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* 3. Scrubbable Progress Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div 
          style={{
            height: '6px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPos = (e.clientX - rect.left) / rect.width;
            const targetIndex = Math.floor(clickPos * sentences.length);
            setCurrentSentenceIndex(targetIndex);
            if (isPlaying) playSentence(targetIndex);
          }}
        >
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #6366F1, #34D399)',
            transition: 'width 0.2s ease',
            borderRadius: '4px'
          }} />
        </div>
      </div>

      {/* 4. Interactive Chapter Pills */}
      {chapters.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Главы:
          </span>
          {chapterSentenceMap.map((item, idx) => {
            const isActive = activeChapterIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleJumpChapter(item.sentenceIndex)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  border: '1px solid',
                  borderColor: isActive ? '#34D399' : 'rgba(255,255,255,0.08)',
                  background: isActive ? 'rgba(16, 185, 129, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                  color: isActive ? '#34D399' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{item.chapter.title}</span>
                {item.chapter.keyMetric && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: isActive ? '#10B981' : 'rgba(255,255,255,0.1)',
                    color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    {item.chapter.keyMetric}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Live Subtitle Ticker (Sentence Teleprompter) */}
      <div style={{
        padding: '14px 18px',
        background: 'rgba(0, 0, 0, 0.35)',
        borderLeft: isPlaying ? '3px solid #34D399' : '3px solid #6366F1',
        borderRadius: '8px',
        fontSize: '0.92rem',
        lineHeight: '1.55',
        color: isPlaying ? '#FFFFFF' : '#CBD5E1',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <div style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: isPlaying ? '#34D399' : 'var(--text-muted)',
          paddingTop: '2px',
          whiteSpace: 'nowrap'
        }}>
          {isPlaying ? 'Диктор:' : 'Тезис:'}
        </div>
        <div style={{ flex: 1 }}>
          {sentences[currentSentenceIndex] || sentences[0]}
        </div>
      </div>

      {/* 6. Full Transcript View (Expandable) */}
      {showFullTranscript && (
        <div style={{
          marginTop: '16px',
          padding: '16px 18px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          maxHeight: '260px',
          overflowY: 'auto',
          fontSize: '0.85rem',
          lineHeight: '1.65',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} color="#6366F1" />
            <span>Полный аудиторский сценарий пересказа:</span>
          </div>
          {sentences.map((sentence, idx) => (
            <span
              key={idx}
              onClick={() => {
                setCurrentSentenceIndex(idx);
                if (isPlaying) playSentence(idx);
              }}
              style={{
                cursor: 'pointer',
                background: idx === currentSentenceIndex ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: idx === currentSentenceIndex ? '#34D399' : 'inherit',
                fontWeight: idx === currentSentenceIndex ? 600 : 400,
                padding: '2px 3px',
                borderRadius: '3px',
                marginRight: '4px',
                transition: 'background 0.2s ease'
              }}
            >
              {sentence}{' '}
            </span>
          ))}
        </div>
      )}

    </div>
  );
};
