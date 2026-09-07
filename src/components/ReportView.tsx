'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  HelpCircle, 
  FileText, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
  Calendar,
  Building2,
  Printer,
  Download,
  Share2,
  Sparkles,
  Zap
} from 'lucide-react';
import { CaseAuditReport, GroundedFact } from '@/lib/types';
import { EvidenceDrawer } from './EvidenceDrawer';
import { ExecutiveDashboardWidgets } from './ExecutiveDashboardWidgets';
import { ExecutiveAudioBriefPlayer } from './ExecutiveAudioBriefPlayer';

interface ReportViewProps {
  report: CaseAuditReport;
}

export const ReportView: React.FC<ReportViewProps> = ({ report }) => {
  const [selectedFact, setSelectedFact] = useState<GroundedFact | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'p1_urgent':
        return <span className="badge badge-rose">P1: Внедрить немедленно</span>;
      case 'p2_medium':
        return <span className="badge badge-amber">P2: В течение 14 дней</span>;
      case 'p3_strategic':
        return <span className="badge badge-indigo">P3: Стратегическая цель</span>;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="badge badge-rose">Критическая потеря прибыли</span>;
      case 'warning':
        return <span className="badge badge-amber">Операционное узкое горлышко</span>;
      case 'info':
        return <span className="badge badge-cyan">Точка внимания</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Evidence Drawer for clickable source citations with neon highlight */}
      <EvidenceDrawer fact={selectedFact} isOpen={Boolean(selectedFact)} onClose={() => setSelectedFact(null)} />

      {/* Top Executive Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={13} />
            Верифицировано Google Gemini AI
          </span>
          <span className="badge badge-indigo">
            Strict Grounding (0% домыслов)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            title="Сформировать печатную версию или PDF для учредителей"
          >
            <Printer size={15} />
            <span>Скачать PDF для Совета Директоров</span>
          </button>
        </div>
      </div>

      {/* Executive Summary Card & Health Gauge */}
      <div className="glass-card" style={{
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(22, 32, 50, 0.95) 0%, rgba(17, 24, 39, 0.95) 100%)',
        border: '1px solid var(--border-glow)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: '#34D399',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px'
            }}>
              <ShieldCheck size={16} />
              <span>Фактологическое экспертное заключение</span>
            </div>
            <h2 style={{ fontSize: '1.85rem', color: '#FFFFFF', marginBottom: '8px' }}>
              {report.summary.businessName}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Building2 size={15} color="var(--accent-primary)" />
                {report.summary.businessType}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={15} color="var(--accent-cyan)" />
                {report.summary.analyzedPeriod}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Layers size={15} color="var(--accent-emerald)" />
                {report.summary.totalSourcesCount} первичных источников
              </span>
            </div>
          </div>

          {/* Health Score Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 22px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'conic-gradient(#10B981 0% 68%, rgba(255,255,255,0.1) 68% 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: '#34D399'
              }}>
                {report.summary.healthScore}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Индекс операционной устойчивости
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {report.summary.healthScore >= 70 ? 'Умеренный потенциал роста' : 'Требуется оптимизация затрат'}
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Callout */}
        <div style={{
          padding: '18px 22px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderLeft: '4px solid var(--accent-primary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '1.05rem',
          lineHeight: '1.6',
          color: '#E2E8F0'
        }}>
          <strong>Главный вывод аудитора:</strong> {report.summary.oneSentenceVerdict}
        </div>
      </div>
      
      {/* 2-MINUTE AI VOICE EXECUTIVE BRIEFING (Голосовой вердикт для Совета Директоров) */}
      {report.videoOverview && (
        <ExecutiveAudioBriefPlayer 
          videoOverview={report.videoOverview} 
          businessTitle={report.summary.businessName} 
        />
      )}

      {/* EXECUTIVE DASHBOARD WIDGETS: SPARKLINES, CASHFLOW, LAUNCH MATRIX, SCENARIO SIMULATOR */}
      <ExecutiveDashboardWidgets report={report} />

      {/* SECTION 1: GROUNDED FACTS (Что видно из данных) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#10B981" />
              <span>1. Что видно из данных (факты и доказательства)</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Только подтвержденные цифры из ваших таблиц и файлов. Кликните по ссылке источника для просмотра записи.
            </p>
          </div>
          <span className="badge badge-emerald">100% Grounded</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {report.groundedFacts.map((fact) => (
            <div key={fact.id} className="glass-card" style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px'
            }}>
              <div>
                {fact.metric && (
                  <div style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#34D399',
                    fontFamily: 'Outfit, sans-serif',
                    marginBottom: '8px'
                  }}>
                    {fact.metric}
                  </div>
                )}
                <div style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {fact.fact}
                </div>
              </div>

              {/* Source citation button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedFact(fact)}
                  className="source-citation-badge"
                  title="Посмотреть точную запись в источнике"
                >
                  <FileText size={12} />
                  <span>{fact.sourceFile}</span>
                  <ExternalLink size={10} />
                </button>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {fact.sourceLocation}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: BOTTLENECKS (Проблемные зоны) */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <span>2. Выявленные проблемные зоны (узкие горлышки)</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Где именно бизнес теряет маржу или упускает клиентов прямо сейчас.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {report.bottlenecks.map((bot) => (
            <div key={bot.id} className="glass-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {bot.title}
                </h4>
                {getSeverityBadge(bot.severity)}
              </div>

              <p style={{ fontSize: '0.92rem', color: '#CBD5E1', lineHeight: '1.6', marginBottom: '14px' }}>
                {bot.description}
              </p>

              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                fontSize: '0.85rem',
                color: '#FDE68A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldCheck size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                <span><strong>Фактическое подтверждение:</strong> {bot.evidenceSummary}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: ACTIONABLE RECOMMENDATIONS & PRIORITIZATION */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#6366F1" />
              <span>3. Конкретные рекомендации с привязкой к цифрам</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Пошаговый план внедрения с измеримым финансовым эффектом.
            </p>
          </div>
          <span className="badge badge-indigo">Приоритеты P1 / P2</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {report.actionableRecommendations.map((rec, index) => (
            <div key={rec.id} className="glass-card" style={{
              padding: '26px',
              border: rec.priority === 'p1_urgent' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: rec.priority === 'p1_urgent' ? 'var(--accent-rose-bg)' : 'var(--accent-amber-bg)',
                    color: rec.priority === 'p1_urgent' ? '#FB7185' : '#FBBF24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}>
                    {index + 1}
                  </div>
                  <h4 style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>
                    {rec.title}
                  </h4>
                </div>
                {getPriorityBadge(rec.priority)}
              </div>

              {/* Action content */}
              <p style={{ fontSize: '0.98rem', color: '#E2E8F0', lineHeight: '1.6', marginBottom: '16px' }}>
                {rec.recommendation}
              </p>

              {/* Data Proof & Expected Impact Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
                marginBottom: '18px'
              }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    ОЖИДАЕМЫЙ ФИНАНСОВЫЙ ЭФФЕКТ
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {rec.expectedImpact}
                  </div>
                </div>

                <div style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#A5B4FC', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    НА ОСНОВЕ ЦИФР КЛИЕНТА
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#E2E8F0' }}>
                    {rec.basedOnData}
                  </div>
                </div>
              </div>

              {/* Step by step checklist */}
              <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '10px' }}>
                  Шаги для внедрения:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rec.actionSteps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: MISSING DATA & AUDITOR WARNINGS */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={20} color="#F43F5E" />
            <span>4. Белые пятна и недостающие данные</span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Требование заказчика: платформа не додумывает выводы при нехватке исходных документов.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {report.missingDataWarnings.map((warn) => (
            <div key={warn.id} className="glass-card" style={{
              padding: '20px',
              borderLeft: '4px solid var(--accent-rose)',
              background: 'rgba(22, 32, 50, 0.7)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={18} color="#FB7185" />
                <h4 style={{ fontSize: '1rem', color: '#FB7185' }}>
                  [НЕДОСТАТОЧНО ДАННЫХ ДЛЯ ОЦЕНКИ]: {warn.area}
                </h4>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '8px', lineHeight: '1.5' }}>
                {warn.explanation}
              </p>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <strong>Влияние на бизнес:</strong> {warn.whyItMatters}
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                color: '#67E8F9',
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px'
              }}>
                <ArrowRight size={14} />
                <span><strong>Решение:</strong> {warn.recommendedAction}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
