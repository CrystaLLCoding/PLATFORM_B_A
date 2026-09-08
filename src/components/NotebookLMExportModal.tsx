'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Sparkles, Video, Download, Database } from 'lucide-react';
import { VideoOverviewData, BusinessCase, CaseAuditReport } from '@/lib/types';
import { buildNotebookLmExportBundle } from '@/lib/notebookLmBundleBuilder';

interface NotebookLMExportModalProps {
  exportData?: VideoOverviewData['notebookLmExportPackage'];
  businessCase?: BusinessCase;
  report?: CaseAuditReport;
  isOpen: boolean;
  onClose: () => void;
}

export const NotebookLMExportModal: React.FC<NotebookLMExportModalProps> = ({
  exportData,
  businessCase,
  report,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Use dynamically generated rich bundle if businessCase is provided, or fallback to exportData
  const bundleText = businessCase 
    ? buildNotebookLmExportBundle(businessCase, report)
    : (exportData?.formattedSources || '');

  if (!bundleText) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(bundleText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `NotebookLM_Dossier_${(businessCase?.title || 'Audit').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_')}.txt`;
    const blob = new Blob([bundleText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sourcesCount = businessCase?.sources?.length || 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px',
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
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Полное досье для Google NotebookLM (Audio Overview)
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span>Включает реальные таблицы, строки выгрузок, факты и расчет окупаемости</span>
              {sourcesCount > 0 && (
                <span style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22D3EE', padding: '1px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '11px' }}>
                  {sourcesCount} источников
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Informative Banner */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          marginBottom: '16px',
          fontSize: '0.84rem',
          color: '#CBD5E1',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: 600, color: '#38BDF8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={15} />
            <span>Почему теперь NotebookLM знает всё о ваших файлах:</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
            В этот документ включены <strong>полные текстовые фрагменты, структура колонок и строки таблиц</strong> из ваших файлов. Google NotebookLM получит готовую доказательную базу и создаст подкаст строго по вашим цифрам без домыслов и без чтения имен спикеров вслух.
          </p>
        </div>

        {/* Source Content Preview */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: '18px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Содержимое досье (готово к копированию или скачиванию):
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleDownload}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Скачать файлом .txt для удобной загрузки в NotebookLM"
              >
                <Download size={14} />
                <span>Скачать .txt</span>
              </button>

              <button
                onClick={handleCopy}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                <span>{copied ? 'Скопировано в буфер!' : 'Скопировать весь текст'}</span>
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={bundleText}
            style={{
              flex: 1,
              minHeight: '220px',
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              color: '#CBD5E1',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          <a
            href="https://notebooklm.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Открыть Google NotebookLM</span>
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
