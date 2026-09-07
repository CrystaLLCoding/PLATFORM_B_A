'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, PlusCircle, FolderKanban, ShieldCheck, Video } from 'lucide-react';

interface NavbarProps {
  activeCasesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeCasesCount = 2 }) => {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px'
      }}>
        {/* Logo & Platform Name */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
          }}>
            <Sparkles size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #FFFFFF 0%, #E2E8F0 60%, #A5B4FC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              DataAudit <span style={{ color: '#06B6D4', WebkitTextFillColor: '#06B6D4' }}>AI</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Фактологические бизнес-советы &amp; NotebookLM Видео
            </div>
          </div>
        </Link>

        {/* Center navigation & assurances */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            padding: '6px 13px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            color: '#67E8F9',
            fontWeight: 600,
            boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)'
          }}>
            <Sparkles size={15} color="#38BDF8" />
            <span>Google Gemini AI: Активен</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            color: '#34D399',
            fontWeight: 500
          }}>
            <ShieldCheck size={15} />
            <span>Strict Grounding: 0% домыслов</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            color: '#A5B4FC',
            fontWeight: 500
          }}>
            <Video size={15} />
            <span>NotebookLM Video Ready</span>
          </div>
        </div>

        {/* Right side CTA & Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'color 0.2s'
          }}>
            <FolderKanban size={18} />
            <span>Мои кейсы</span>
          </Link>

          <Link href="/cases/new" className="btn-primary">
            <PlusCircle size={18} />
            <span>Новый кейс</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
