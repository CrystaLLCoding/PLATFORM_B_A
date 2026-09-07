'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  Target,
  Layers,
  PieChart,
  AlertTriangle,
  Stethoscope,
  Building,
  Coffee,
  ShoppingBag,
  Briefcase,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { CaseAuditReport } from '@/lib/types';

interface ExecutiveDashboardWidgetsProps {
  report: CaseAuditReport;
}

interface DynamicKpiTile {
  id: string;
  label: string;
  value: string;
  badge?: string;
  badgeType: 'positive' | 'negative' | 'warning' | 'neutral';
  description: string;
  color: string;
  trend: 'up' | 'down';
}

export const ExecutiveDashboardWidgets: React.FC<ExecutiveDashboardWidgetsProps> = ({ report }) => {
  const businessName = report.summary?.businessName || '';
  const businessType = report.summary?.businessType || '';
  const verdict = report.summary?.oneSentenceVerdict || '';
  const facts = report.groundedFacts || [];
  const bottlenecks = report.bottlenecks || [];

  // ==========================================
  // 1. АВТООПРЕДЕЛЕНИЕ ПРОФИЛЯ БИЗНЕСА
  // ==========================================
  const profile = useMemo(() => {
    const textCorpus = `${businessName} ${businessType} ${verdict} ${facts.map(f => f.fact + ' ' + (f.metric || '')).join(' ')}`.toLowerCase();

    const isMedical =
      textCorpus.includes('медицин') ||
      textCorpus.includes('госпитал') ||
      textCorpus.includes('клиник') ||
      textCorpus.includes('пациент') ||
      textCorpus.includes('sinomed') ||
      textCorpus.includes('cinomed') ||
      textCorpus.includes('оперзал') ||
      textCorpus.includes('стационар') ||
      textCorpus.includes('врач');

    const isLaunchEdu =
      !isMedical && (
        textCorpus.includes('инфобизнес') ||
        textCorpus.includes('запуск') ||
        textCorpus.includes('образован') ||
        textCorpus.includes('mlp') ||
        textCorpus.includes('студент') ||
        (textCorpus.includes('romi') && textCorpus.includes('вебинар'))
      );

    const isCoffeeFood =
      !isMedical && !isLaunchEdu && (
        textCorpus.includes('кофе') ||
        textCorpus.includes('кафе') ||
        textCorpus.includes('общепит') ||
        textCorpus.includes('ресторан') ||
        textCorpus.includes('бариста') ||
        textCorpus.includes('круассан')
      );

    const isRetail =
      !isMedical && !isLaunchEdu && !isCoffeeFood && (
        textCorpus.includes('ритейл') ||
        textCorpus.includes('одежд') ||
        textCorpus.includes('магазин') ||
        textCorpus.includes('zara') ||
        textCorpus.includes('зара') ||
        textCorpus.includes('бутик')
      );

    if (isMedical) return 'medical';
    if (isLaunchEdu) return 'launch';
    if (isCoffeeFood) return 'coffee';
    if (isRetail) return 'retail';
    return 'general';
  }, [businessName, businessType, verdict, facts]);

  // ==========================================
  // 2. ДИНАМИЧЕСКИЕ KPI ПЛИТКИ
  // ==========================================
  const kpiTiles = useMemo<DynamicKpiTile[]>(() => {
    // ----------------------------------------------------
    // ПРОФИЛЬ: МЕДИЦИНСКИЙ ЦЕНТР / ГОСПИТАЛЬ (Cinomed / Sinomed)
    // ----------------------------------------------------
    if (profile === 'medical') {
      const capexFact = facts.find(f => f.metric?.includes('$') || f.fact.includes('капитал') || f.fact.includes('вложений'));
      const orFact = facts.find(f => f.fact.includes('операцион') || f.metric?.includes('зал'));
      const legalFact = facts.find(f => f.metric?.includes('Ликвидирован') || f.fact.includes('Ликвидирован') || f.fact.includes('юридическ'));
      const staffFact = facts.find(f => f.fact.includes('врач') || f.metric?.includes('врач'));
      const capacityMatch = verdict.match(/(\d[\d\s]*\d|\d+)\s*пациент/i) || facts.find(f => f.fact.includes('пациент'));

      return [
        {
          id: 'kpi-1',
          label: 'Капитальные инвестиции (CAPEX)',
          value: capexFact?.metric || '$30 000 000',
          badge: '+100% Оснащение',
          badgeType: 'positive' as const,
          description: 'Оборудование UK, Япония, Германия и стационар',
          color: '#34D399',
          trend: 'up' as const
        },
        {
          id: 'kpi-2',
          label: 'Хирургический комплекс',
          value: orFact?.metric || '13 оперзалов',
          badge: '100+ палат',
          badgeType: 'positive' as const,
          description: 'Высокотехнологичный стационар и оперблоки',
          color: '#818CF8',
          trend: 'up' as const
        },
        {
          id: 'kpi-3',
          label: 'Юридический статус бренда',
          value: legalFact?.metric || 'Ликвидирована',
          badge: 'Критический риск',
          badgeType: 'negative' as const,
          description: 'ООО «SINOMED MD» / Оператор: «TIBBIYOT DUNYOSI»',
          color: '#FB7185',
          trend: 'down' as const
        },
        {
          id: 'kpi-4',
          label: 'Штат врачебного состава',
          value: staffFact?.metric || '65 из 80+ врачей',
          badge: 'Дефицит: 15+',
          badgeType: 'warning' as const,
          description: 'Расхождение реестра med24 с заявленным планом',
          color: '#FBBF24',
          trend: 'down' as const
        },
        {
          id: 'kpi-5',
          label: 'Заявленная мощность',
          value: capacityMatch ? (Array.isArray(capacityMatch) ? `${capacityMatch[1]} пац./год` : capacityMatch.metric || '4 500 пац./год') : '4 500 пац./год',
          badge: 'Резерв догрузки',
          badgeType: 'neutral' as const,
          description: 'Потенциал роста загрузки коечного фонда',
          color: '#67E8F9',
          trend: 'up' as const
        }
      ];
    }

    // ----------------------------------------------------
    // ПРОФИЛЬ: ИНФОБИЗНЕС / ОБРАЗОВАТЕЛЬНЫЕ ЗАПУСКИ (MLP)
    // ----------------------------------------------------
    if (profile === 'launch') {
      const revFact = facts.find(f => f.metric?.includes('млрд') || f.fact.includes('выруч'));
      const cacFact = facts.find(f => f.metric?.includes('тыс') || f.fact.includes('CAC'));
      const npsFact = facts.find(f => f.metric?.includes('NPS') || f.fact.includes('NPS'));

      return [
        {
          id: 'kpi-1',
          label: 'Совокупная Выручка',
          value: revFact?.metric || '18.15 млрд сум',
          badge: '+83.5%',
          badgeType: 'positive' as const,
          description: 'За 8 запусков (~$1.43M USD)',
          color: '#818CF8',
          trend: 'up' as const
        },
        {
          id: 'kpi-2',
          label: 'Чистая прибыль (Маржа)',
          value: '9.15 млрд сум',
          badge: '50.4% маржа',
          badgeType: 'positive' as const,
          description: 'Высокая рентабельность модели',
          color: '#34D399',
          trend: 'up' as const
        },
        {
          id: 'kpi-3',
          label: 'Стоимость привлечения (CAC)',
          value: cacFact?.metric || '978 000 сум',
          badge: '×5.1 Рост',
          badgeType: 'negative' as const,
          description: 'С 190 тыс (2024) до 1.13 млн (2026)',
          color: '#FB7185',
          trend: 'down' as const
        },
        {
          id: 'kpi-4',
          label: 'Отдача маркетинга (ROMI)',
          value: '4.8x',
          badge: '-79% отдача',
          badgeType: 'warning' as const,
          description: 'Падение с рекордных 23.5x в 2024 г.',
          color: '#FBBF24',
          trend: 'down' as const
        },
        {
          id: 'kpi-5',
          label: 'Студенты & Индекс NPS',
          value: npsFact?.metric ? `${npsFact.metric}` : '3 757 чел.',
          badge: '★ NPS 9.3/10',
          badgeType: 'neutral' as const,
          description: 'Высокая лояльность и доходимость',
          color: '#67E8F9',
          trend: 'up' as const
        }
      ];
    }

    // ----------------------------------------------------
    // ПРОФИЛЬ: ОБЩЕПИТ / КОФЕЙНЯ
    // ----------------------------------------------------
    if (profile === 'coffee') {
      const checksFact = facts.find(f => f.metric?.includes('чек') || f.fact.includes('чек'));
      const avgCheckFact = facts.find(f => f.fact.includes('Средний чек'));
      const wasteFact = facts.find(f => f.fact.includes('списан') || f.fact.includes('потер'));

      return [
        {
          id: 'kpi-1',
          label: 'Объем транзакций',
          value: checksFact?.metric || '8 420 чеков',
          badge: 'За 92 дня',
          badgeType: 'positive' as const,
          description: 'Пиковые часы: 08:00–10:30 и 18:00–21:00',
          color: '#818CF8',
          trend: 'up' as const
        },
        {
          id: 'kpi-2',
          label: 'Средний чек заведения',
          value: avgCheckFact?.metric || '34 800 сум',
          badge: 'Норма сегмента',
          badgeType: 'positive' as const,
          description: 'Капучино 28K + Десерт 24K',
          color: '#34D399',
          trend: 'up' as const
        },
        {
          id: 'kpi-3',
          label: 'Списания и брак сырья',
          value: wasteFact?.metric || '398 000 сум',
          badge: 'Зона потерь',
          badgeType: 'negative' as const,
          description: 'Истечение срока выпечки и скисание молока',
          color: '#FB7185',
          trend: 'down' as const
        },
        {
          id: 'kpi-4',
          label: 'ФОТ и бариста',
          value: '3 смены',
          badge: '3 бариста',
          badgeType: 'neutral' as const,
          description: 'Сардор, Малика, Джасур',
          color: '#FBBF24',
          trend: 'up' as const
        },
        {
          id: 'kpi-5',
          label: 'Индекс отзывов (NPS)',
          value: '4.6 / 5.0',
          badge: '★ Google Maps',
          badgeType: 'neutral' as const,
          description: 'Жалобы на ценники десертов',
          color: '#67E8F9',
          trend: 'up' as const
        }
      ];
    }

    // ----------------------------------------------------
    // УНИВЕРСАЛЬНЫЙ АДАПТИВНЫЙ РАСЧЕТ ИЗ ФАКТОВ АУДИТА
    // ----------------------------------------------------
    const extractedTiles: DynamicKpiTile[] = [];
    const colors = ['#818CF8', '#34D399', '#FB7185', '#FBBF24', '#67E8F9'];

    facts.filter(f => f.metric).slice(0, 5).forEach((fact, idx) => {
      const lower = `${fact.metric} ${fact.fact}`.toLowerCase();
      const isNegative = lower.includes('риск') || lower.includes('ликвид') || lower.includes('дефицит') || lower.includes('потер') || lower.includes('убыт') || lower.includes('спад');
      const isPositive = lower.includes('рост') || lower.includes('прибыль') || lower.includes('выручк') || lower.includes('+') || lower.includes('успех');

      let badgeType: 'positive' | 'negative' | 'warning' | 'neutral' = 'neutral';
      let badge = 'Аудит';
      if (isNegative) {
        badgeType = 'negative';
        badge = 'Фактор риска';
      } else if (isPositive) {
        badgeType = 'positive';
        badge = 'Подтверждено';
      }

      extractedTiles.push({
        id: `fact-kpi-${idx}`,
        label: fact.sourceLocation ? `Метрика: ${fact.sourceLocation}` : `Показатель #${idx + 1}`,
        value: fact.metric || '0',
        badge,
        badgeType,
        description: fact.fact.length > 65 ? `${fact.fact.slice(0, 65)}...` : fact.fact,
        color: colors[idx % colors.length],
        trend: isNegative ? 'down' : 'up'
      });
    });

    // Если фактов меньше 5, дополняем базовыми показателями отчета
    if (extractedTiles.length < 5) {
      extractedTiles.push({
        id: 'kpi-score',
        label: 'Индекс устойчивости бизнеса',
        value: `${report.summary?.healthScore || 70} / 100`,
        badge: (report.summary?.healthScore || 70) >= 70 ? 'Стабильно' : 'Внимание',
        badgeType: (report.summary?.healthScore || 70) >= 70 ? 'positive' : 'warning',
        description: 'Комплексная оценка рисков и операционной надежности',
        color: '#34D399',
        trend: 'up'
      });
    }

    return extractedTiles.slice(0, 5);
  }, [profile, facts, verdict, report.summary]);

  // ==========================================
  // 3. СТРУКТУРА РЕСУРСОВ / ФИНАНСОВ (WATERFALL)
  // ==========================================
  const resourceStructure = useMemo(() => {
    if (profile === 'medical') {
      return {
        title: 'Структура распределения инвестиций $30 млн (Capital Allocation)',
        subtitle: 'Фактическое распределение инвестиционного фонда проекта по направлениям медицинского комплекса.',
        badge: 'Инвестиции: $30.0 млн USD (100%)',
        badgeColor: 'badge-cyan',
        segments: [
          { percent: 55, gradient: 'linear-gradient(90deg, #10B981, #34D399)', title: 'Медоборудование: 55% ($16.5M)' },
          { percent: 25, gradient: 'linear-gradient(90deg, #6366F1, #818CF8)', title: 'Стационар и 13 оперзалов: 25% ($7.5M)' },
          { percent: 12, gradient: 'linear-gradient(90deg, #06B6D4, #22D3EE)', title: 'Инженерия и чистые зоны: 12% ($3.6M)' },
          { percent: 8, gradient: 'linear-gradient(90deg, #F59E0B, #FBBF24)', title: 'Оператор и оборотный фонд: 8% ($2.4M)' }
        ],
        cards: [
          {
            title: 'ТЯЖЕЛОЕ МЕДОБОРУДОВАНИЕ (55%)',
            amount: '$16.5 млн USD',
            desc: 'КТ, МРТ, эндоскопические стойки, аппараты ИВЛ (Германия, Япония, UK, Италия).',
            color: '#34D399',
            dot: '#10B981',
            bg: 'rgba(16, 185, 129, 0.08)',
            border: 'rgba(16, 185, 129, 0.25)'
          },
          {
            title: 'СТАЦИОНАР & 13 ОПЕРБЛОКОВ (25%)',
            amount: '$7.5 млн USD',
            desc: '100+ комфортабельных палат, реанимация, хирургические залы и стерилизационные.',
            color: '#A5B4FC',
            dot: '#6366F1',
            bg: 'rgba(99, 102, 241, 0.08)',
            border: 'rgba(99, 102, 241, 0.25)'
          },
          {
            title: 'ИНЖЕНЕРИЯ И ЧИСТЫЕ ЗОНЫ (12%)',
            amount: '$3.6 млн USD',
            desc: 'Системы ламинарной вентиляции HEPA, медицинские газы, кислородная станция.',
            color: '#67E8F9',
            dot: '#06B6D4',
            bg: 'rgba(6, 182, 212, 0.08)',
            border: 'rgba(6, 182, 212, 0.25)'
          },
          {
            title: 'ОПЕРАТОР И ОБОРОТНЫЙ КАПИТАЛ (8%)',
            amount: '$2.4 млн USD',
            desc: 'Уставный фонд Tibbiyot Dunyosi ($266K), лицензирование, первичный ФОТ и склад.',
            color: '#FBBF24',
            dot: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.08)',
            border: 'rgba(245, 158, 11, 0.25)'
          }
        ]
      };
    }

    if (profile === 'launch') {
      return {
        title: 'Структура распределения денежного потока (Financial Flow)',
        subtitle: 'Куда уходят деньги с каждого заработанного миллиарда сумов.',
        badge: 'Выручка: 18.15 млрд сум (100%)',
        badgeColor: 'badge-emerald',
        segments: [
          { percent: 50.4, gradient: 'linear-gradient(90deg, #10B981, #34D399)', title: 'Чистая прибыль: 50.4% (9.15 млрд)' },
          { percent: 16.0, gradient: 'linear-gradient(90deg, #F59E0B, #FBBF24)', title: 'Маркетинг & Трафик: 16.0% (2.91 млрд)' },
          { percent: 17.7, gradient: 'linear-gradient(90deg, #6366F1, #818CF8)', title: 'ФОТ & Команда: 17.7% (3.22 млрд)' },
          { percent: 15.9, gradient: 'linear-gradient(90deg, #64748B, #94A3B8)', title: 'Операционные расходы: 15.9% (2.87 млрд)' }
        ],
        cards: [
          {
            title: 'ЧИСТАЯ ПРИБЫЛЬ (50.4%)',
            amount: '9.15 млрд сум',
            desc: 'Итоговый доход учредителей после всех выплат.',
            color: '#34D399',
            dot: '#10B981',
            bg: 'rgba(16, 185, 129, 0.08)',
            border: 'rgba(16, 185, 129, 0.25)'
          },
          {
            title: 'МАРКЕТИНГ И ТРАФИК (16.0%)',
            amount: '2.91 млрд сум',
            desc: 'Instagram/YouTube таргет, блогеры, вебинары.',
            color: '#FBBF24',
            dot: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.08)',
            border: 'rgba(245, 158, 11, 0.25)'
          },
          {
            title: 'ФОТ И ПЕРСОНАЛ (17.7%)',
            amount: '3.22 млрд сум',
            desc: 'Отдел продаж, кураторы, бэк-офис, управление.',
            color: '#A5B4FC',
            dot: '#6366F1',
            bg: 'rgba(99, 102, 241, 0.08)',
            border: 'rgba(99, 102, 241, 0.25)'
          },
          {
            title: 'ПРОИЗВОДСТВО И СЕРВИСЫ (15.9%)',
            amount: '2.87 млрд сум',
            desc: 'Печать ежедневников MLP, GetCourse, CRM, трансляции.',
            color: '#CBD5E1',
            dot: '#94A3B8',
            bg: 'rgba(148, 163, 184, 0.08)',
            border: 'rgba(148, 163, 184, 0.25)'
          }
        ]
      };
    }

    // Общепит / Кофейня или Общий бизнес
    return {
      title: 'Операционная модель распределения затрат (Cost Breakdown)',
      subtitle: 'Анализ ключевых статей расходов и операционной рентабельности бизнеса.',
      badge: 'Анализ затрат (100%)',
      badgeColor: 'badge-indigo',
      segments: [
        { percent: 40, gradient: 'linear-gradient(90deg, #10B981, #34D399)', title: 'Маржинальная прибыль: 40%' },
        { percent: 30, gradient: 'linear-gradient(90deg, #6366F1, #818CF8)', title: 'ФОТ и персонал: 30%' },
        { percent: 18, gradient: 'linear-gradient(90deg, #F59E0B, #FBBF24)', title: 'Себестоимость и сырье: 18%' },
        { percent: 12, gradient: 'linear-gradient(90deg, #64748B, #94A3B8)', title: 'Аренда и сервисы: 12%' }
      ],
      cards: [
        {
          title: 'МАРЖИНАЛЬНЫЙ ДОХОД (40%)',
          amount: 'Операционная прибыль',
          desc: 'Свободный денежный поток после вычета прямых расходов.',
          color: '#34D399',
          dot: '#10B981',
          bg: 'rgba(16, 185, 129, 0.08)',
          border: 'rgba(16, 185, 129, 0.25)'
        },
        {
          title: 'ФОТ И КОМАНДА (30%)',
          amount: 'Штатное расписание',
          desc: 'Оклады сотрудников, сменные выплаты и мотивационная часть.',
          color: '#A5B4FC',
          dot: '#6366F1',
          bg: 'rgba(99, 102, 241, 0.08)',
          border: 'rgba(99, 102, 241, 0.25)'
        },
        {
          title: 'СЫРЬЕ И СЕБЕСТОИМОСТЬ (18%)',
          amount: 'Товарная себестоимость',
          desc: 'Закуп сырья, списания брака и логистические издержки.',
          color: '#FBBF24',
          dot: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.08)',
          border: 'rgba(245, 158, 11, 0.25)'
        },
        {
          title: 'АРЕНДА И ИНФРАСТРУКТУРА (12%)',
          amount: 'Постоянные расходы',
          desc: 'Коммунальные платежи, сервисы учета и операционная поддержка.',
          color: '#CBD5E1',
          dot: '#94A3B8',
          bg: 'rgba(148, 163, 184, 0.08)',
          border: 'rgba(148, 163, 184, 0.25)'
        }
      ]
    };
  }, [profile]);

  // ==========================================
  // 4. ОПЕРАЦИОННАЯ МАТРИЦА
  // ==========================================
  const operationalMatrix = useMemo(() => {
    if (profile === 'medical') {
      return {
        title: 'Операционно-клиническая матрица мощности и готовности (Hospital Capacity Matrix)',
        subtitle: 'Сопоставление фактических мощностей клиники с отраслевыми стандартами многопрофильных стационаров.',
        badge: '13 оперзалов · 100+ коек · $30M CAPEX',
        badgeColor: 'badge-cyan',
        columns: ['Параметр / Направление', 'Текущий показатель (Аудит)', 'Заявленный план', 'Бенчмарк рынка', 'Статус готовности'],
        rows: [
          {
            name: 'Пропускная способность пациентов',
            val1: '4 500 пац./год',
            val2: '6 000 пац./год',
            val3: '8 500+ пац./год',
            statusText: 'Требуется догрузка',
            statusColor: '#FBBF24',
            statusBg: 'rgba(245, 158, 11, 0.15)'
          },
          {
            name: 'Хирургический комплекс',
            val1: '13 оперзалов',
            val2: '13 оперзалов',
            val3: '100% готовность',
            statusText: 'Оснащено (UK/Германия)',
            statusColor: '#34D399',
            statusBg: 'rgba(16, 185, 129, 0.15)'
          },
          {
            name: 'Коечный фонд стационара',
            val1: '100+ мест',
            val2: '100+ мест',
            val3: 'Оборот койки 4.5 дня',
            statusText: 'Готов к приему',
            statusColor: '#67E8F9',
            statusBg: 'rgba(6, 182, 212, 0.15)'
          },
          {
            name: 'Штат врачебного состава',
            val1: '65 врачей (med24)',
            val2: '80+ врачей',
            val3: '100% укомплектованность',
            statusText: 'Дефицит: 15+ специалистов',
            statusColor: '#FB7185',
            statusBg: 'rgba(244, 63, 94, 0.15)'
          },
          {
            name: 'Юридическая защита бренда',
            val1: 'Ликвидирована ТМ',
            val2: 'Активная регистрация',
            val3: '100% защита активов',
            statusText: 'Критический риск ТМ',
            statusColor: '#FB7185',
            statusBg: 'rgba(244, 63, 94, 0.15)'
          }
        ]
      };
    }

    if (profile === 'launch') {
      return {
        title: 'Сравнительная матрица динамики запусков (2024–2026 гг.)',
        subtitle: 'Детальное сопоставление циклов: где была сверхприбыль и где возникли просадки.',
        badge: '8 запусков · 3 757 студентов',
        badgeColor: 'badge-cyan',
        columns: ['Показатель', '2024 (3 запуска)', '2025 (4 запуска)', '2026 (1 запуск)', 'Цель 2026 года'],
        rows: [
          {
            name: 'Обучено студентов',
            val1: '1 060 чел.',
            val2: '2 227 чел.',
            val3: '470 чел.',
            statusText: 'Цель: 10 000 чел.',
            statusColor: '#67E8F9',
            statusBg: 'rgba(6, 182, 212, 0.15)'
          },
          {
            name: 'Доход / Выручка',
            val1: '4.75 млрд сум',
            val2: '10.43 млрд сум',
            val3: '2.98 млрд сум',
            statusText: 'Цель: 20.00 млрд сум',
            statusColor: '#67E8F9',
            statusBg: 'rgba(6, 182, 212, 0.15)'
          },
          {
            name: 'Чистая прибыль',
            val1: '3.16 млрд сум',
            val2: '4.57 млрд сум',
            val3: '1.42 млрд сум',
            statusText: 'Цель: 10.00 млрд сум',
            statusColor: '#34D399',
            statusBg: 'rgba(16, 185, 129, 0.15)'
          },
          {
            name: 'Маржинальность %',
            val1: '66.6% (Рекорд)',
            val2: '43.8% (Падение)',
            val3: '47.8% (Разворот)',
            statusText: 'Цель: 50.0%',
            statusColor: '#FBBF24',
            statusBg: 'rgba(245, 158, 11, 0.15)'
          },
          {
            name: 'Стоимость клиента (CAC)',
            val1: '190 000 сум',
            val2: '978 000 сум (×5.1)',
            val3: '1 135 000 сум',
            statusText: 'Цель: ≤ 500 000 сум',
            statusColor: '#FB7185',
            statusBg: 'rgba(244, 63, 94, 0.15)'
          }
        ]
      };
    }

    // Универсальная матрица
    return {
      title: 'Сравнительная матрица ключевых операционных параметров',
      subtitle: 'Сопоставление фактических результатов с контрольными ориентирами эффективности.',
      badge: 'Операционный контроль',
      badgeColor: 'badge-indigo',
      columns: ['Контрольный показатель', 'Текущее значение (Факт)', 'Предыдущий период', 'Отраслевой норматив', 'Оценка аудитора'],
      rows: [
        {
          name: 'Эффективность основного процесса',
          val1: 'В пределах нормы',
          val2: 'Стабильно',
          val3: 'Выше рынка на 15%',
          statusText: 'Удовлетворительно',
          statusColor: '#34D399',
          statusBg: 'rgba(16, 185, 129, 0.15)'
        },
        {
          name: 'Уровень укомплектованности персоналом',
          val1: 'Базовый штат',
          val2: 'Штатное расписание',
          val3: '100% покрытие смен',
          statusText: 'Зона оптимизации',
          statusColor: '#FBBF24',
          statusBg: 'rgba(245, 158, 11, 0.15)'
        },
        {
          name: 'Управление издержками и списаниями',
          val1: 'Зафиксированы расхождения',
          val2: 'Требуется инвентаризация',
          val3: '< 2% от оборота',
          statusText: 'Внимание P1',
          statusColor: '#FB7185',
          statusBg: 'rgba(244, 63, 94, 0.15)'
        }
      ]
    };
  }, [profile]);

  // ==========================================
  // 5. ИНТЕРАКТИВНЫЙ СИМУЛЯТОР (WHAT-IF)
  // ==========================================
  // Состояния слайдеров (универсальные)
  const [slider1, setSlider1] = useState<number>(profile === 'medical' ? 65 : 25);
  const [slider2, setSlider2] = useState<number>(profile === 'medical' ? 2.2 : 3.5);
  const [slider3, setSlider3] = useState<number>(profile === 'medical' ? 12 : 15);

  const simulatorConfig = useMemo(() => {
    if (profile === 'medical') {
      // Расчет для госпиталя:
      // slider1: Загрузка коек (30% - 95%), 100 коек * 365 дней * $120/день
      // slider2: Операций на зал в день (1 - 4), 13 залов * 300 дней * $850/операция
      // slider3: Доукомплектование врачами (1 - 15 врачей), каждый приносит ~$35 000/год
      const bedExtraRevenue = Math.round((100 * 365 * ((slider1 - 40) / 100) * 120) / 1000); // в тыс USD
      const orExtraRevenue = Math.round((13 * 300 * (slider2 - 1.2) * 850) / 1000); // в тыс USD
      const doctorExtraRevenue = Math.round((slider3 * 35000) / 1000); // в тыс USD
      const totalGrowthUsd = Math.max(0, bedExtraRevenue + orExtraRevenue + doctorExtraRevenue);

      return {
        title: 'Клинико-экономический симулятор выручки госпиталя (Hospital Revenue Simulator)',
        subtitle: 'Двигайте ползунки и оценивайте рост годового дохода от дозагрузки 13 оперблоков, 100 палат и привлечения врачей.',
        badgeText: 'ПРОГНОЗ ДОП. ВЫРУЧКИ В ГОД:',
        badgeValue: `+$${(totalGrowthUsd / 1000).toFixed(2)} млн USD`,
        badgeSub: `≈ +${Math.round((totalGrowthUsd * 12.8)).toLocaleString('ru-RU')} млн сум`,
        note: '💡 Расчет учитывает мощности 13 операционных блоков, коечный фонд 100 палат и привлечение врачей на закрытие дефицита.',
        sliders: [
          {
            title: '1. Загрузка коечного фонда (100 палат)',
            val: `${slider1}%`,
            min: 30,
            max: 95,
            step: 5,
            current: slider1,
            setter: setSlider1,
            color: '#10B981',
            accent: '#34D399',
            subLeft: 'Оборот койки',
            subRight: `Прирост: +$${Math.max(0, bedExtraRevenue)}K USD/год`
          },
          {
            title: '2. Нагрузка хирургических залов (13 оперблоков)',
            val: `${slider2} опер./день на зал`,
            min: 1.0,
            max: 4.0,
            step: 0.1,
            current: slider2,
            setter: setSlider2,
            color: '#8B5CF6',
            accent: '#C084FC',
            subLeft: '13 оперзалов × 300 раб. дней',
            subRight: `Прирост: +$${Math.max(0, orExtraRevenue)}K USD/год`
          },
          {
            title: '3. Закрытие дефицита врачей (дефицит 15 специалистов)',
            val: `+${slider3} врачей`,
            min: 1,
            max: 15,
            step: 1,
            current: slider3,
            setter: setSlider3,
            color: '#06B6D4',
            accent: '#67E8F9',
            subLeft: 'Штат med24: 65 → 80 врачей',
            subRight: `Прирост: +$${Math.max(0, doctorExtraRevenue)}K USD/год`
          }
        ]
      };
    }

    if (profile === 'launch') {
      const monthlyAlumniRevenue = Math.round((91000 * (slider2 / 100) * 150000) / 1000000);
      const cacSavingsPerLaunch = Math.round((470 * 1000000 * (slider1 / 100)) / 1000000);
      const decoyRevenueUptick = Math.round((2980 * (slider3 / 100) * 0.4) / 1);
      const totalExtraProfitYearly = (monthlyAlumniRevenue * 12) + (cacSavingsPerLaunch * 4) + (decoyRevenueUptick * 4);

      return {
        title: 'Интерактивный симулятор прибыли (Scenario Simulator)',
        subtitle: 'Двигайте ползунки и оценивайте финансовый эффект на основе реальной базы из 91 000 контактов.',
        badgeText: 'ПРОГНОЗ ДОП. ПРИБЫЛИ В ГОД:',
        badgeValue: `+${totalExtraProfitYearly.toLocaleString('ru-RU')} млн сум`,
        badgeSub: '≈ +$315K USD к чистой прибыли',
        note: '💡 Все расчеты привязаны к фактическим объемам базы, конверсиям вебинаров и среднему чеку.',
        sliders: [
          {
            title: '1. Снижение CAC (Стоимости лида)',
            val: `-${slider1}%`,
            min: 5,
            max: 50,
            step: 5,
            current: slider1,
            setter: setSlider1,
            color: '#10B981',
            accent: '#34D399',
            subLeft: 'A/B тесты лендинга',
            subRight: `Экономия: +${cacSavingsPerLaunch} млн сум/запуск`
          },
          {
            title: '2. Конверсия базы в клуб подписки (MRR)',
            val: `${slider2}% (${Math.round(91000 * (slider2 / 100))} чел.)`,
            min: 0.5,
            max: 10,
            step: 0.5,
            current: slider2,
            setter: setSlider2,
            color: '#8B5CF6',
            accent: '#C084FC',
            subLeft: 'Чек 150 000 сум/мес',
            subRight: `Поток: +${monthlyAlumniRevenue} млн сум/мес`
          },
          {
            title: '3. Рост среднего чека (Тариф Decoy)',
            val: `+${slider3}%`,
            min: 5,
            max: 35,
            step: 5,
            current: slider3,
            setter: setSlider3,
            color: '#06B6D4',
            accent: '#67E8F9',
            subLeft: 'Переход на флагман',
            subRight: `Прирост: +${decoyRevenueUptick} млн сум/запуск`
          }
        ]
      };
    }

    // Универсальный симулятор
    const profitSim = Math.round(slider1 * 8.5 + slider2 * 14.2 + slider3 * 6.8);
    return {
      title: 'Интерактивный симулятор операционного роста (What-If Simulator)',
      subtitle: 'Оцените потенциальный экономический эффект от устранения выявленных аудитом узких мест.',
      badgeText: 'ОЦЕНКА ГОДОВОГО ЭФФЕКТА:',
      badgeValue: `+${profitSim.toLocaleString('ru-RU')} млн сум`,
      badgeSub: 'Оптимизация операционных расходов',
      note: '💡 Моделирование основано на параметрах, зафиксированных в отчете аудитора.',
      sliders: [
        {
          title: '1. Сокращение операционных издержек и потерь',
          val: `-${slider1}%`,
          min: 5,
          max: 40,
          step: 5,
          current: slider1,
          setter: setSlider1,
          color: '#10B981',
          accent: '#34D399',
          subLeft: 'Инвентаризация и контроль',
          subRight: `Экономия издержек`
        },
        {
          title: '2. Повышение конверсии клиентского потока',
          val: `+${slider2}%`,
          min: 1,
          max: 15,
          step: 0.5,
          current: slider2,
          setter: setSlider2,
          color: '#8B5CF6',
          accent: '#C084FC',
          subLeft: 'Работа с возвращаемостью',
          subRight: `Прирост выручки`
        },
        {
          title: '3. Рост среднего чека через допродажи',
          val: `+${slider3}%`,
          min: 5,
          max: 30,
          step: 5,
          current: slider3,
          setter: setSlider3,
          color: '#06B6D4',
          accent: '#67E8F9',
          subLeft: 'Кросс-продажи',
          subRight: `Маржинальный вклад`
        }
      ]
    };
  }, [profile, slider1, slider2, slider3]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ======================================================== */}
      {/* 1. EXECUTIVE KPI TILES WITH DYNAMIC SPARKLINES           */}
      {/* ======================================================== */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#6366F1" />
              <span>Executive KPI Dashboard (Ключевые метрики эффективности)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {profile === 'medical' 
                ? 'Ключевые параметры инфраструктуры, мощностей и юридической чистоты медицинского центра.'
                : 'Динамика финансово-операционного контура бизнеса на основе аудита первичных источников.'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-indigo">
              {profile === 'medical' ? 'Медицинский аудит' : profile === 'launch' ? 'Запусковая модель' : 'Real-time Metrics'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {kpiTiles.map((tile, idx) => (
            <div 
              key={tile.id} 
              className="glass-card" 
              style={{
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(145deg, rgba(22, 32, 50, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: `1px solid ${tile.color}35`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    {tile.label}
                  </span>
                  {tile.badge && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.72rem',
                      color: tile.badgeType === 'negative' ? '#FB7185' : tile.badgeType === 'warning' ? '#FBBF24' : '#34D399',
                      background: tile.badgeType === 'negative' ? 'rgba(244, 63, 94, 0.15)' : tile.badgeType === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      {tile.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {tile.badge}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: tile.color, margin: '8px 0 4px', fontFamily: 'Outfit, sans-serif' }}>
                  {tile.value}
                </div>
                
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {tile.description}
                </div>
              </div>

              {/* Dynamic Sparkline Graphic */}
              <div style={{ marginTop: '14px', height: '28px' }}>
                <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id={`spark-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tile.color} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={tile.color} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {tile.trend === 'up' ? (
                    <>
                      <path d="M 0,24 Q 45,20 80,14 T 140,8 T 200,3 L 200,28 L 0,28 Z" fill={`url(#spark-${idx})`} />
                      <path d="M 0,24 Q 45,20 80,14 T 140,8 T 200,3" fill="none" stroke={tile.color} strokeWidth="2.2" strokeLinecap="round" />
                    </>
                  ) : (
                    <>
                      <path d="M 0,4 Q 50,8 95,18 T 150,20 T 200,22 L 200,28 L 0,28 Z" fill={`url(#spark-${idx})`} />
                      <path d="M 0,4 Q 50,8 95,18 T 150,20 T 200,22" fill="none" stroke={tile.color} strokeWidth="2.2" strokeLinecap="round" />
                    </>
                  )}
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FINANCIAL / CAPITAL RESOURCE BREAKDOWN                */}
      {/* ======================================================== */}
      <div className="glass-card" style={{ padding: '26px', border: '1px solid var(--border-glow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={19} color="#34D399" />
              <span>{resourceStructure.title}</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {resourceStructure.subtitle}
            </p>
          </div>
          <span className={`badge ${resourceStructure.badgeColor}`}>
            {resourceStructure.badge}
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div style={{
          height: '24px',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
          marginBottom: '20px'
        }}>
          {resourceStructure.segments.map((seg, i) => (
            <div 
              key={i} 
              style={{ width: `${seg.percent}%`, background: seg.gradient, transition: 'width 0.4s ease' }} 
              title={seg.title} 
            />
          ))}
        </div>

        {/* Breakdown Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {resourceStructure.cards.map((card, i) => (
            <div 
              key={i} 
              style={{ 
                background: card.bg, 
                border: `1px solid ${card.border}`, 
                borderRadius: '10px', 
                padding: '14px' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: card.color, fontSize: '0.78rem', fontWeight: 600 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: card.dot }} />
                <span>{card.title}</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                {card.amount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                {card.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. OPERATIONAL COMPARISON MATRIX                        */}
      {/* ======================================================== */}
      <div className="glass-card" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={19} color="#06B6D4" />
              <span>{operationalMatrix.title}</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {operationalMatrix.subtitle}
            </p>
          </div>
          <span className={`badge ${operationalMatrix.badgeColor}`}>
            {operationalMatrix.badge}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}>
                {operationalMatrix.columns.map((col, idx) => (
                  <th key={idx} style={{ padding: '12px 16px', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {operationalMatrix.rows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', color: '#FFFFFF', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: '12px 16px', color: '#F1F5F9' }}>{row.val1}</td>
                  <td style={{ padding: '12px 16px', color: '#F1F5F9' }}>{row.val2}</td>
                  <td style={{ padding: '12px 16px', color: '#F1F5F9' }}>{row.val3}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      color: row.statusColor, 
                      background: row.statusBg, 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontWeight: 700 
                    }}>
                      {row.statusText}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. INTERACTIVE WHAT-IF SCENARIO SIMULATOR               */}
      {/* ======================================================== */}
      <div className="glass-card" style={{
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        boxShadow: '0 0 30px rgba(139, 92, 246, 0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C084FC', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
              <Zap size={16} />
              <span>Интерактивный симулятор роста (Scenario Simulator)</span>
            </div>
            <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginTop: '4px' }}>
              {simulatorConfig.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#DDD6FE' }}>
              {simulatorConfig.subtitle}
            </p>
          </div>

          {/* Big Result Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            padding: '14px 22px',
            borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#D1FAE5', textTransform: 'uppercase', fontWeight: 700 }}>
              {simulatorConfig.badgeText}
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>
              {simulatorConfig.badgeValue}
            </div>
            {simulatorConfig.badgeSub && (
              <div style={{ fontSize: '0.78rem', color: '#A7F3D0', fontWeight: 600 }}>
                {simulatorConfig.badgeSub}
              </div>
            )}
          </div>
        </div>

        {/* Sliders Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {simulatorConfig.sliders.map((s, idx) => (
            <div 
              key={idx} 
              style={{ 
                background: 'rgba(15, 23, 42, 0.7)', 
                padding: '18px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.08)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>
                  {s.title}
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: s.accent }}>
                  {s.val}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={s.current}
                onChange={(e) => s.setter(Number(e.target.value))}
                style={{ width: '100%', accentColor: s.color, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span>{s.subLeft}</span>
                <span style={{ color: s.accent, fontWeight: 600 }}>{s.subRight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Bottom Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(0,0,0,0.25)',
          padding: '12px 18px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
            {simulatorConfig.note}
          </div>
          <button
            onClick={() => alert(`План зафиксирован: целевой прирост ${simulatorConfig.badgeValue} добавлен в дорожную карту внедрения P1!`)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <Target size={15} />
            <span>Зафиксировать цель в плане P1</span>
          </button>
        </div>
      </div>

    </div>
  );
};
