'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  Play, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { DropZone } from '@/components/DropZone';
import { UploadedSource } from '@/lib/types';

export default function NewCasePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [businessType, setBusinessType] = useState('Консалтинг / B2B Услуги (Финансовый отчет)');
  const [description, setDescription] = useState('');
  const [sources, setSources] = useState<UploadedSource[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    const low = val.toLowerCase();
    if (low.includes('консалт') || low.includes('отчет') || low.includes('финанс') || low.includes('b2b') || low.includes('тест')) {
      setBusinessType('Консалтинг / B2B Услуги (Финансовый отчет)');
    } else if (low.includes('одежд') || low.includes('зара') || low.includes('zara') || low.includes('магазин') || low.includes('бутик') || low.includes('товар')) {
      setBusinessType('Розничная торговля / Ритейл');
    } else if (low.includes('авто') || low.includes('сто') || low.includes('машин') || low.includes('мотор') || low.includes('сервис')) {
      setBusinessType('Автосервис / СТО');
    } else if (low.includes('кофе') || low.includes('кафе') || low.includes('ресторан') || low.includes('еда') || low.includes('бургер') || low.includes('пицца')) {
      setBusinessType('Кофейня / Кафе / Общепит');
    } else if (low.includes('салон') || low.includes('барбер') || low.includes('красот') || low.includes('стрижк')) {
      setBusinessType('Салон красоты / Барбершоп');
    } else if (low.includes('клиник') || low.includes('стомат') || low.includes('зуб') || low.includes('мед')) {
      setBusinessType('Медицина / Стоматология');
    }
  };

  const handleSourcesChange = (newSources: UploadedSource[]) => {
    setSources(newSources);
    if (newSources.length > 0) {
      const src = newSources[0];
      const nameLow = src.name.toLowerCase();
      const textSnippet = src.parsedDataPreview?.textSnippet?.toLowerCase() || '';
      const summaryLow = (src.summary || '').toLowerCase();

      const allNames = newSources.map(s => (s.name + ' ' + (s.fromArchive || '')).toLowerCase()).join(' ');
      const allSummaries = newSources.map(s => (s.summary || '').toLowerCase()).join(' ');

      if (
        nameLow.includes('avers') ||
        nameLow.includes('аверс') ||
        textSnippet.includes('аверс') ||
        summaryLow.includes('аверс')
      ) {
        setBusinessType('B2B Технологии / Корпоративные финансы (Годовой отчет)');
        if (!title.trim() || title === 'Новый кейс' || title.toLowerCase().includes('тест') || title.toLowerCase().includes('пдф')) {
          setTitle('АО «АВЕРС ТЕХНОЛОДЖИ» (Годовой отчет)');
        }
      } else if (
        allNames.includes('кофейн') ||
        allNames.includes('кофе') ||
        allSummaries.includes('кофе') ||
        allSummaries.includes('эспрессо') ||
        allNames.includes('выгрузка_продаж_касса')
      ) {
        setBusinessType('Кофейня / Кафе / Общепит');
        if (!title.trim() || title === 'Новый кейс' || title.toLowerCase().includes('тест') || title.toLowerCase().includes('архив')) {
          setTitle('Сеть кофеен «Coffee Point» (Аудит продаж и ФОТ из архива)');
        }
      } else if (
        nameLow.includes('96ecxn') ||
        nameLow.includes('тест') ||
        nameLow.includes('консалт') ||
        nameLow.includes('отчет') ||
        nameLow.includes('report') ||
        textSnippet.includes('тест-консалтинг') ||
        textSnippet.includes('годовой отчет') ||
        summaryLow.includes('тест-консалтинг')
      ) {
        setBusinessType('Консалтинг / B2B Услуги (Финансовый отчет)');
        if (!title.trim() || title === 'Новый кейс' || title.toLowerCase().includes('тест') || title.toLowerCase().includes('фото')) {
          setTitle('ООО «ТЕСТ-КОНСАЛТИНГ» (Годовой отчет)');
        }
      } else if (
        nameLow.includes('zara') ||
        nameLow.includes('payroll') ||
        nameLow.includes('зарплат') ||
        textSnippet.includes('зарплат')
      ) {
        setBusinessType('Розничная торговля / Fashion-ритейл');
        if (!title.trim() || title.toLowerCase().includes('кейс')) {
          setTitle('Магазин ZARA (Штат и ФОТ)');
        }
      } else if (src.type === 'html' || nameLow.endsWith('.html') || nameLow.endsWith('.htm')) {
        const titleMatch = src.summary?.match(/«([^»]+)»/);
        const pageTitle = titleMatch ? titleMatch[1] : '';
        if (textSnippet.includes('магазин') || textSnippet.includes('ecommerce') || textSnippet.includes('заказ') || summaryLow.includes('магазин')) {
          setBusinessType('Онлайн-магазин / E-commerce');
        }
        if (pageTitle && (!title.trim() || title === 'Новый кейс' || title.toLowerCase().includes('тест'))) {
          setTitle(pageTitle);
        }
      } else if (
        allNames.includes('mlp') ||
        allNames.includes('planner') ||
        allSummaries.includes('mlp') ||
        allSummaries.includes('life planner') ||
        textSnippet.includes('my life planner') ||
        textSnippet.includes('мамасаидов') ||
        textSnippet.includes('запусков')
      ) {
        setBusinessType('Онлайн-образование / Инфобизнес (Запуски)');
        if (!title.trim() || title === 'Новый кейс' || title.toLowerCase().includes('тест')) {
          setTitle('Проект MLP — My Life Planner (Аудит 8 запусков)');
        }
      }
    }
  };

  const businessTypePresets = [
    'Консалтинг / B2B Услуги (Финансовый отчет)',
    'Розничная торговля / Ритейл',
    'Кофейня / Кафе / Общепит',
    'Автосервис / СТО',
    'Салон красоты / Барбершоп',
    'Медицина / Стоматология',
    'Онлайн-магазин / E-commerce'
  ];

  const handleStartAnalysis = async () => {
    if (!title.trim()) {
      setErrorMessage('Укажите название вашего бизнеса или кейса (например, «Кофейня на Чиланзаре»).');
      return;
    }

    if (sources.length === 0) {
      setErrorMessage('Загрузите хотя бы один файл (Excel, PDF, фото витрины/чека) или ссылку на Google Таблицу.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // Stage 1: Create Case
      setAnalysisStage('1/5: Формирование защищенного пакета кейса...');
      setAnalysisProgress(20);

      const createRes = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          businessType,
          description,
          sources
        })
      });

      const createData = await createRes.json();
      if (!createData.success) {
        throw new Error(createData.error || 'Ошибка при создании кейса');
      }

      const caseId = createData.case.id;

      // Stage 2: Parsing files
      await new Promise(r => setTimeout(r, 600));
      setAnalysisStage('2/5: Извлечение транзакций, формул и Vision OCR анализ...');
      setAnalysisProgress(45);

      // Stage 3: Grounded AI Analysis
      await new Promise(r => setTimeout(r, 800));
      setAnalysisStage('3/5: Запуск ревизии без домыслов (Grounded Fact Engine)...');
      setAnalysisProgress(70);

      const analyzeRes = await fetch(`/api/cases/${caseId}/analyze`, {
        method: 'POST'
      });
      const analyzeData = await analyzeRes.json();

      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'Ошибка анализа данных');
      }

      // Stage 4: Video Overview Synthesis
      await new Promise(r => setTimeout(r, 700));
      setAnalysisStage('4/5: Подготовка таймкодов и видеопересказа NotebookLM...');
      setAnalysisProgress(90);

      // Stage 5: Ready
      await new Promise(r => setTimeout(r, 500));
      setAnalysisStage('5/5: Аудит успешно завершен! Открываем отчет...');
      setAnalysisProgress(100);

      await new Promise(r => setTimeout(r, 400));
      router.push(`/cases/${caseId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Произошла непредвиденная ошибка');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '28px', maxWidth: '960px' }}>
      {/* Back button */}
      <Link href="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        marginBottom: '20px',
        fontWeight: 500
      }}>
        <ArrowLeft size={16} />
        <span>Назад к списку кейсов</span>
      </Link>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', color: '#FFFFFF', marginBottom: '8px' }}>
          Создание нового аудита бизнеса
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Укажите название и загрузите файлы в любом удобном виде. Наша система автоматически распознает данные и подготовит фактологическое заключение с видеопересказом.
        </p>
      </div>

      {errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          color: '#FB7185',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '24px',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <div className="glass-card" style={{ padding: '32px', marginBottom: '28px' }}>
        {/* Step 1: Case Details */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Название бизнеса или торговой точки <span style={{ color: 'var(--accent-rose)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="Например: Кофейня на Чиланзаре или Автомойка на Юнусабаде"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: '1rem',
              color: 'var(--text-primary)',
              outline: 'none',
              marginBottom: '16px'
            }}
          />

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Категория бизнеса
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {businessTypePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBusinessType(preset)}
                disabled={isSubmitting}
                style={{
                  background: businessType === preset ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  border: businessType === preset ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  color: businessType === preset ? '#FFFFFF' : 'var(--text-secondary)',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s'
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Краткое описание / цель аудита (опционально)
          </label>
          <textarea
            rows={2}
            placeholder="Например: Хотим понять, почему при высоком трафике падает чистая прибыль и какие позиции списываются чаще всего."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        {/* Step 2: Data Ingestion */}
        <div>
          <label style={{ display: 'block', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Загрузка первичных материалов бизнеса
          </label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Загрузите файлы любого формата (до 20 файлов, до 500 МБ). Платформа сама определит структуру и проверит формулы.
          </p>

          <DropZone
            sources={sources}
            onSourcesChange={handleSourcesChange}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Analysis In-Progress Modal / Bar */}
      {isSubmitting && (
        <div className="glass-card" style={{
          padding: '24px',
          marginBottom: '28px',
          border: '1px solid var(--accent-primary)',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={20} className="animate-spin" color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>
                {analysisStage}
              </span>
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
              {analysisProgress}%
            </span>
          </div>

          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${analysisProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366F1 0%, #06B6D4 100%)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>
      )}

      {/* Action Footer Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', alignItems: 'center' }}>
        <Link href="/" className="btn-secondary">
          Отмена
        </Link>

        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={isSubmitting || sources.length === 0}
          className="btn-primary"
          style={{
            padding: '12px 28px',
            fontSize: '1rem',
            opacity: sources.length === 0 || isSubmitting ? 0.6 : 1,
            cursor: sources.length === 0 || isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Выполняется анализ...</span>
            </>
          ) : (
            <>
              <Play size={18} />
              <span>Начать анализ и создать видеопересказ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
