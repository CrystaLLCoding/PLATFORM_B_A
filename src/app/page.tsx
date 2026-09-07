'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  ArrowUpRight, 
  ShieldCheck, 
  Video, 
  FileSpreadsheet, 
  Activity, 
  Clock, 
  Sparkles,
  ChevronRight,
  Database,
  Layers,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { BusinessCase } from '@/lib/types';

export default function DashboardPage() {
  const [cases, setCases] = useState<BusinessCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCases(data.cases);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching cases:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container" style={{ paddingTop: '36px' }}>
      {/* Top Welcome & KPI Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '36px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            color: '#A5B4FC',
            marginBottom: '12px'
          }}>
            <Sparkles size={14} />
            <span>Личный кабинет владельца бизнеса</span>
          </div>

          <h1 style={{ fontSize: '2.3rem', color: '#FFFFFF', lineHeight: '1.2', marginBottom: '8px' }}>
            Аудит бизнеса на основе ваших данных
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Загружайте кассовые выгрузки, складские остатки, чеки и фото. Мы анализируем <strong>только ваши первичные материалы</strong> и формируем конкретный план действий с видеопересказом NotebookLM.
          </p>
        </div>

        <Link href="/cases/new" className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
          <PlusCircle size={20} />
          <span>Создать новый кейс</span>
        </Link>
      </div>

      {/* Metrics Highlights Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '18px',
        marginBottom: '36px'
      }}>
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Активные кейсы аудита</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <FolderOpen size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF' }}>
            {cases.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <CheckCircle2 size={13} />
            <span>Все отчеты сформированы</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Проверено источников данных</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981'
            }}>
              <Database size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF' }}>
            {cases.reduce((acc, c) => acc + c.sources.length, 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Excel, PDF, сканы чеков, ссылки
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Достоверность выводов</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06B6D4'
            }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34D399' }}>
            100%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Привязка к первичным строкам и ячейкам
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Видеопересказы</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A5B4FC'
            }}>
              <Video size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF' }}>
            {cases.filter(c => c.report?.videoOverview).length}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#A5B4FC', marginTop: '4px' }}>
            NotebookLM / Встроенный видеоплеер
          </div>
        </div>
      </div>

      {/* Case List Section */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: '#FFFFFF' }}>
              Ваши кейсы анализа бизнеса
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Выберите кейс для просмотра детального текстового заключения и встроенного видеопересказа
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Загрузка списка кейсов...
          </div>
        ) : cases.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-primary)'
            }}>
              <FolderOpen size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Пока нет созданных кейсов</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 20px auto' }}>
              Создайте первый кейс, загрузите файлы вашего бизнеса (кассу, склад, чеки) и получите готовый аудит с видео.
            </p>
            <Link href="/cases/new" className="btn-primary">
              <PlusCircle size={18} />
              <span>Создать первый кейс</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cases.map((c) => (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ maxWidth: '640px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.3rem', color: '#FFFFFF' }}>
                      {c.title}
                    </h3>
                    <span className="badge badge-indigo">
                      {c.businessType}
                    </span>
                    {c.report?.summary.healthScore && (
                      <span className="badge badge-emerald">
                        Здоровье: {c.report.summary.healthScore}/100
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.92rem', color: '#94A3B8', marginBottom: '14px', lineHeight: '1.5' }}>
                    {c.report?.summary.oneSentenceVerdict || c.description || 'Анализ загруженных данных.'}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Layers size={14} color="var(--accent-primary)" />
                      <span>{c.sources.length} источников данных</span>
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Video size={14} color="#A5B4FC" />
                      <span>Видеопересказ готов</span>
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} />
                      <span>Обновлено {new Date(c.updatedAt).toLocaleDateString('ru-RU')}</span>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Link
                    href={`/cases/${c.id}`}
                    className="btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    <span>Открыть отчет &amp; видео</span>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Principles Callout (Strict Grounding & NotebookLM) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <ShieldCheck size={22} color="#10B981" />
            <h4 style={{ fontSize: '1.1rem', color: '#FFFFFF' }}>Принцип «0% домыслов»</h4>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Платформа не даёт общих абстрактных советов («в среднем по рынку»). Каждая цифра и рекомендация подкреплена ссылкой на конкретный файл, лист Excel или чек. Если данных недостаточно — мы прямо предупреждаем об этом.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Video size={22} color="#818CF8" />
            <h4 style={{ fontSize: '1.1rem', color: '#FFFFFF' }}>Встроенный видеопересказ NotebookLM</h4>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Вам не нужно вчитываться в длинные таблицы. Система визуализирует аудит в формате динамичного видеопересказа прямо на сайте с таймкодами, покадровыми инфографиками и возможностью экспорта в Google NotebookLM.
          </p>
        </div>
      </div>
    </div>
  );
}
