'use client';

import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Upload, 
  Sparkles, 
  Clock, 
  FileText,
  CheckCircle2,
  ExternalLink,
  Video,
  Share2,
  Volume2,
  AlertCircle,
  Film
} from 'lucide-react';
import { VideoOverviewData, VideoChapter } from '@/lib/types';
import { ExecutiveAudioBriefPlayer } from './ExecutiveAudioBriefPlayer';

interface VideoOverviewPlayerProps {
  videoData: VideoOverviewData;
  businessTitle: string;
  onUploadVideo?: (file: File) => void;
  onOpenNotebookLMExport?: () => void;
  onOpenStudio?: () => void;
}

export const VideoOverviewPlayer: React.FC<VideoOverviewPlayerProps> = ({
  videoData,
  businessTitle,
  onUploadVideo,
  onOpenNotebookLMExport,
  onOpenStudio
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasRealVideo = Boolean(videoData.videoUrl);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    if (onUploadVideo) {
      onUploadVideo(file);
    }
    setTimeout(() => {
      setIsUploading(false);
    }, 600);
  };

  return (
    <div className="glass-card" style={{ overflow: 'hidden', border: '1px solid var(--border-glow)' }}>
      {/* Header Bar */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        background: 'rgba(15, 23, 42, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Video size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Видеопересказ аудита (Google NotebookLM)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {hasRealVideo ? 'Готовое MP4 видео прикреплено и проигрывается на сайте' : 'Сценарий и факты подготовлены для создания видео в NotebookLM'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Upload size={15} />
            <span>{hasRealVideo ? 'Заменить MP4 видео' : 'Загрузить MP4 из NotebookLM'}</span>
          </button>

          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="button-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, #6366F1, #EC4899)',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '700'
              }}
            >
              <Film size={15} />
              <span>AI Video Studio</span>
            </button>
          )}

          {onOpenNotebookLMExport && (
            <button
              type="button"
              onClick={onOpenNotebookLMExport}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <ExternalLink size={15} />
              <span>Создать в NotebookLM</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport or Honest Upload/Creation Hub */}
      {hasRealVideo ? (
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video
            src={videoData.videoUrl}
            controls
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      ) : (
        /* Honest NotebookLM Hub without fake presentation cards */
        <div style={{
          padding: '40px 24px',
          background: 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.8) 70%)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#818CF8'
          }}>
            <Video size={30} />
          </div>

          <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '10px' }}>
            Пакет видеопересказа по «{businessTitle}» сформирован
          </h3>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
            Все ключевые выводы, факты и рекомендации скомпонованы в готовый бандл. Вы можете создать видео в Google NotebookLM в 1 клик или загрузить готовый MP4 файл для встроенного воспроизведения.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <button
              type="button"
              onClick={onOpenNotebookLMExport}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Sparkles size={18} />
              <span>1-Клик создание в NotebookLM</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              style={{ padding: '12px 22px', fontSize: '0.95rem' }}
            >
              <Upload size={18} />
              <span>Прикрепить MP4 видео</span>
            </button>
          </div>

          {/* Executive Audio Player Bar */}
          <div style={{ maxWidth: '800px', margin: '0 auto 28px', textAlign: 'left' }}>
            <ExecutiveAudioBriefPlayer videoOverview={videoData} businessTitle={businessTitle} />
          </div>

          {/* Chapters Timeline List (Clean structured data instead of fake slide mockup) */}
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Clock size={14} />
              <span>Структура видеопересказа по главам:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {videoData.chapters.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#A5B4FC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ch.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {ch.subtitle} • {ch.highlightText}
                      </div>
                    </div>
                  </div>

                  {ch.keyMetric && (
                    <span className="badge badge-emerald" style={{ fontSize: '0.75rem', flexShrink: 0 }}>
                      {ch.keyMetric}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
