'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Sparkles, Video, HelpCircle } from 'lucide-react';
import { VideoOverviewData } from '@/lib/types';

interface NotebookLMExportModalProps {
  exportData?: VideoOverviewData['notebookLmExportPackage'];
  isOpen: boolean;
  onClose: () => void;
}

export const NotebookLMExportModal: React.FC<NotebookLMExportModalProps> = ({
  exportData,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !exportData) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData.formattedSources);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '720px',
        padding: '30px',
        border: '1px solid var(--border-glow)',
        boxShadow: 'var(--shadow-glow)',
        position: 'relative'
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-secondary)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>
              Пакет данных для NotebookLM (Video Overview)
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Готовый структурированный конспект источников для создания видео-обзора
            </div>
          </div>
        </div>

        {/* Step by step guide */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          marginBottom: '20px',
          fontSize: '0.86rem',
          color: '#CBD5E1',
          lineHeight: '1.6'
        }}>
          <div style={{ fontWeight: 600, color: '#A5B4FC', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Video size={16} />
            <span>Как сгенерировать видео через NotebookLM:</span>
          </div>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Нажмите <strong>«Скопировать пакет источников»</strong> ниже.</li>
            <li>Откройте <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#06B6D4', textDecoration: 'underline' }}>notebooklm.google.com</a> и создайте новый блокнот.</li>
            <li>Вставьте скопированный текст как новый текстовый источник (Copied Text).</li>
            <li>В правой панели нажмите <strong>«Audio Overview / Video Overview»</strong> (Generate).</li>
            <li>После готовности скачайте файл <code>.mp4</code> и нажмите в плеере платформы <strong>«Загрузить NotebookLM MP4»</strong>.</li>
          </ol>
        </div>

        {/* Source Content Preview */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Текстовый бандл (готовый к вставке):
            </span>

            <button
              onClick={handleCopy}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Скопировано!' : 'Скопировать пакет источников'}</span>
            </button>
          </div>

          <textarea
            readOnly
            value={exportData.formattedSources}
            rows={8}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              color: '#94A3B8',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href="https://notebooklm.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ fontSize: '0.88rem' }}
          >
            <span>Открыть NotebookLM</span>
            <ExternalLink size={14} />
          </a>

          <button onClick={onClose} className="btn-secondary">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
