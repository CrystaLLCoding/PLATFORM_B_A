'use client';

import React from 'react';
import { X, FileText, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { GroundedFact } from '@/lib/types';

interface EvidenceModalProps {
  fact: GroundedFact | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ fact, onClose }) => {
  if (!fact) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glow)',
          padding: '28px',
          boxShadow: 'var(--shadow-glow)',
          position: 'relative'
        }}
      >
        {/* Close button */}
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

        {/* Header with Grounding badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#34D399', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Подтверждение из исходных данных
            </div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Фактологическая выписка
            </h3>
          </div>
        </div>

        {/* Fact title */}
        <div style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: '1.5',
          marginBottom: '20px',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 'var(--radius-sm)',
          borderLeft: '4px solid var(--accent-primary)'
        }}>
          {fact.fact}
        </div>

        {/* Evidence details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              ИСХОДНЫЙ ФАЙЛ
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
              {fact.sourceFile}
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              ТОЧНАЯ ЛОКАЦИЯ / СТРОКА
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#A5B4FC' }}>
              {fact.sourceLocation}
            </div>
          </div>
        </div>

        {/* Raw Quote / Data extract */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} />
            <span>Фактическая запись из документа:</span>
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.88rem',
            color: '#E2E8F0',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap'
          }}>
            «{fact.quoteOrData}»
          </div>
        </div>

        {/* Footer Guarantee */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#10B981' }}>
            <CheckCircle size={16} />
            <span>0% общих домыслов — вывод строго верифицирован</span>
          </div>

          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 18px' }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
