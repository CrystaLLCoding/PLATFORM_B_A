'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  Database, 
  Share2, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  Upload,
  Film
} from 'lucide-react';
import { BusinessCase } from '@/lib/types';
import { VideoOverviewPlayer } from '@/components/VideoOverviewPlayer';
import { ReportView } from '@/components/ReportView';
import { NotebookLMExportModal } from '@/components/NotebookLMExportModal';
import { AICaseChatDrawer } from '@/components/AICaseChatDrawer';
import { AIVideoStudioModal } from '@/components/AIVideoStudioModal';

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.id;

  const [businessCase, setBusinessCase] = useState<BusinessCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'report' | 'video' | 'sources'>('report');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      const data = await res.json();
      if (data.success) {
        setBusinessCase(data.case);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading case:', err);
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBusinessCase(data.case);
      }
    } catch (err) {
      console.error('Error re-analyzing:', err);
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleCustomVideoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch(`/api/cases/${caseId}/upload-video`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setBusinessCase(data.case);
      }
    } catch (err) {
      console.error('Error uploading custom video:', err);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Загрузка аудита кейса...
      </div>
    );
  }

  if (!businessCase) {
    return (
      <div className="container" style={{ paddingTop: '60px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '12px' }}>Кейс не найден</h2>
        <Link href="/" className="btn-primary">
          Вернуться на главную
        </Link>
      </div>
    );
  }

  const report = businessCase.report;

  return (
    <div className="container" style={{ paddingTop: '28px' }}>
      {/* NotebookLM Export Modal */}
      {report && (
        <NotebookLMExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          exportData={report.videoOverview.notebookLmExportPackage}
          businessCase={businessCase}
          report={report}
        />
      )}

      {/* Breadcrumb & Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <Link href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
          fontWeight: 500
        }}>
          <ArrowLeft size={16} />
          <span>К списку кейсов</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsStudioModalOpen(true)}
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

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Share2 size={15} />
            <span>Экспорт в NotebookLM</span>
          </button>

          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            title="Запустить повторный аудит"
          >
            <RefreshCw size={15} className={isReanalyzing ? 'animate-spin' : ''} />
            <span>{isReanalyzing ? 'Анализ...' : 'Обновить аудит'}</span>
          </button>
        </div>
      </div>

      {/* Case Header Card */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-indigo">{businessCase.businessType}</span>
              <span className="badge badge-emerald">
                <CheckCircle2 size={12} />
                <span>Аудит сформирован</span>
              </span>
              {report?.summary.healthScore && (
                <span className="badge badge-cyan">
                  Здоровье: {report.summary.healthScore}/100
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '2.1rem', color: '#FFFFFF', marginBottom: '8px' }}>
              {businessCase.title}
            </h1>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: '1.5' }}>
              {report?.summary.oneSentenceVerdict || businessCase.description}
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'var(--bg-input)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={14} color="var(--accent-primary)" />
              <span>Источников: <strong>{businessCase.sources.length}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              <span>Дата: <strong>{new Date(businessCase.updatedAt).toLocaleDateString('ru-RU')}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '28px'
      }}>
        <button
          onClick={() => setActiveTab('report')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'report' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'report' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <FileText size={18} color={activeTab === 'report' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Текстовое заключение &amp; рекомендации</span>
        </button>

        <button
          onClick={() => setActiveTab('video')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'video' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'video' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <Video size={18} color={activeTab === 'video' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Видеопересказ (NotebookLM)</span>
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sources' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'sources' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <Database size={18} color={activeTab === 'sources' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Первичные источники ({businessCase.sources.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: VIDEO OVERVIEW */}
      {activeTab === 'video' && report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <VideoOverviewPlayer
            videoData={report.videoOverview}
            businessTitle={businessCase.title}
            onUploadVideo={handleCustomVideoUpload}
            onOpenNotebookLMExport={() => setIsExportModalOpen(true)}
            onOpenStudio={() => setIsStudioModalOpen(true)}
          />

          {/* Transcript accordion box */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
              Текстовый сценарий видеопересказа (Transcript)
            </h4>
            <p style={{ fontSize: '0.92rem', color: '#CBD5E1', lineHeight: '1.6', background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              {report.videoOverview.transcript}
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: REPORT VIEW */}
      {activeTab === 'report' && report && (
        <ReportView report={report} />
      )}

      {/* TAB CONTENT 3: RAW SOURCES & DATA PREVIEWS */}
      {activeTab === 'sources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                Загруженные материалы бизнеса
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Все первичные данные изолированы и защищены. На их основе сформирован данный аудит.
              </p>
            </div>

            <span className="badge badge-emerald">Все файлы верифицированы</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {businessCase.sources.map((src, idx) => (
              <div key={src.id} className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {src.name}
                        </span>
                        {src.fromArchive && (
                          <span 
                            className="badge badge-purple" 
                            style={{ 
                              fontSize: '0.72rem', 
                              padding: '2px 8px',
                              background: 'rgba(139, 92, 246, 0.18)',
                              color: '#DDD6FE',
                              border: '1px solid rgba(139, 92, 246, 0.35)'
                            }}
                          >
                            📦 из архива: {src.fromArchive}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Тип: {src.type.toUpperCase()} • Загружено: {new Date(src.uploadedAt).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-indigo">
                    Готово к аудиту
                  </span>
                </div>

                <div style={{ fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '16px' }}>
                  {src.summary || 'Данные прочитаны без ошибок.'}
                </div>

                {/* Table Preview if available */}
                {src.parsedDataPreview?.sampleRows && src.parsedDataPreview.sampleRows.length > 0 && (
                  <div style={{ overflowX: 'auto', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '12px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Предпросмотр первых 3 строк таблицы ({src.parsedDataPreview.totalRows || 'множество'} записей всего):
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                          {src.parsedDataPreview.columns?.map((col, cIdx) => (
                            <th key={cIdx} style={{ padding: '6px 12px' }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {src.parsedDataPreview.sampleRows.slice(0, 3).map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            {src.parsedDataPreview?.columns?.map((col, cIdx) => (
                              <td key={cIdx} style={{ padding: '6px 12px', color: 'var(--text-primary)' }}>
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Text Snippet Preview if available (HTML reports, text files) */}
                {src.parsedDataPreview?.textSnippet && (!src.parsedDataPreview.sampleRows || src.parsedDataPreview.sampleRows.length === 0) && (
                  <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '14px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>
                      Извлеченный контент ({src.type === 'html' ? 'HTML веб-отчет' : 'Документ'}):
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#CBD5E1', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto', lineHeight: '1.5' }}>
                      {src.parsedDataPreview.textSnippet}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Интерактивный AI-Консультант по кейсу (Q&A на базе Gemini AI) */}
      <AICaseChatDrawer caseId={caseId} businessCase={businessCase} />



      {/* AI Video & Podcast Studio Modal */}
      {businessCase && (
        <AIVideoStudioModal
          isOpen={isStudioModalOpen}
          onClose={() => setIsStudioModalOpen(false)}
          caseId={caseId}
          businessTitle={businessCase.title}
          initialProject={businessCase.pipelineProject}
          onProjectUpdated={(proj) => {
            setBusinessCase(prev => prev ? { ...prev, pipelineProject: proj } : null);
          }}
        />
      )}
    </div>
  );
}
