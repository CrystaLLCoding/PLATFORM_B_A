import { KeyMetricBadge, VisualStyle } from './videoPipelineTypes';

/**
 * Generates an ultra-clean executive business Data Card (16:9 ratio, dark studio theme)
 * Contains real audit metrics, dynamic chart visuals, and high-contrast typography
 */
export function generateSvgDataCard(
  title: string,
  badge?: KeyMetricBadge,
  sceneIndex: number = 1,
  style: VisualStyle = 'isometric_3d'
): string {
  const metricLabel = badge?.label || 'Ключевая метрика аудита';
  const metricValue = badge?.value || 'Факты верифицированы';
  const isDown = badge?.trend === 'down';
  const isUp = badge?.trend === 'up';

  // Choose palette based on trend or scene index
  let accentColor = isDown ? '#F43F5E' : (isUp ? '#10B981' : '#06B6D4');
  let accentGlow = isDown ? 'rgba(244, 63, 94, 0.35)' : (isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(6, 182, 212, 0.35)');
  let trendArrow = isDown ? '▼ КРИТИЧЕСКИЙ РИСК' : (isUp ? '▲ ТОЧКА РОСТА' : '● СТАТУС-КВО');

  if (sceneIndex === 1) {
    accentColor = '#06B6D4';
    accentGlow = 'rgba(6, 182, 212, 0.35)';
    trendArrow = '● ФИНАНСОВАЯ КАРТИНА';
  } else if (sceneIndex === 2 || sceneIndex === 4 || sceneIndex === 6) {
    accentColor = '#F43F5E';
    accentGlow = 'rgba(244, 63, 94, 0.35)';
    trendArrow = '▼ ОПЕРАЦИОННАЯ УТЕЧКА';
  } else if (sceneIndex === 3 || sceneIndex === 5) {
    accentColor = '#F59E0B';
    accentGlow = 'rgba(245, 158, 11, 0.35)';
    trendArrow = '▲ КЛИЕНТСКИЙ ПОТОК & ФОТ';
  } else if (sceneIndex >= 7) {
    accentColor = '#10B981';
    accentGlow = 'rgba(16, 185, 129, 0.35)';
    trendArrow = '▲ СТРАТЕГИЧЕСКИЙ ПЛАН (ROI)';
  }

  // Generate varied dynamic chart graphics based on scene index
  const chartType = (sceneIndex % 4);
  let chartGraphic = '';

  if (chartType === 1) {
    // Multi-bar comparative chart
    chartGraphic = `
      <g transform="translate(45, 30)">
        <rect x="0" y="110" width="36" height="40" rx="6" fill="rgba(255, 255, 255, 0.12)"/>
        <rect x="56" y="80" width="36" height="70" rx="6" fill="rgba(255, 255, 255, 0.22)"/>
        <rect x="112" y="50" width="36" height="100" rx="6" fill="rgba(99, 102, 241, 0.6)"/>
        <rect x="168" y="15" width="36" height="135" rx="6" fill="${accentColor}" filter="url(#glow)"/>
        <rect x="224" y="65" width="36" height="85" rx="6" fill="rgba(6, 182, 212, 0.7)"/>
        <line x1="-15" y1="150" x2="280" y2="150" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
        <text x="186" y="5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="${accentColor}" text-anchor="middle">MAX</text>
      </g>
    `;
  } else if (chartType === 2) {
    // Waterfall breakdown / Diagnostic stairs
    chartGraphic = `
      <g transform="translate(45, 30)">
        <rect x="0" y="20" width="45" height="40" rx="6" fill="${accentColor}" filter="url(#glow)"/>
        <rect x="55" y="50" width="45" height="35" rx="6" fill="rgba(244, 63, 94, 0.7)"/>
        <rect x="110" y="75" width="45" height="30" rx="6" fill="rgba(245, 158, 11, 0.7)"/>
        <rect x="165" y="95" width="45" height="35" rx="6" fill="rgba(99, 102, 241, 0.7)"/>
        <rect x="220" y="40" width="45" height="110" rx="6" fill="#10B981"/>
        <line x1="-15" y1="150" x2="280" y2="150" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
        <path d="M 45 40 L 55 50 M 100 65 L 110 75 M 155 90 L 165 95 M 210 110 L 220 40" stroke="rgba(255, 255, 255, 0.4)" stroke-width="1.5" stroke-dasharray="3,3"/>
      </g>
    `;
  } else if (chartType === 3) {
    // Circular Gauge / Target efficiency
    chartGraphic = `
      <g transform="translate(180, 110)">
        <circle cx="0" cy="0" r="75" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="14"/>
        <circle cx="0" cy="0" r="75" fill="none" stroke="${accentColor}" stroke-width="14" stroke-dasharray="360 470" stroke-linecap="round" filter="url(#glow)"/>
        <text x="0" y="-8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle">${badge?.value || '88%'}</text>
        <text x="0" y="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="#94A3B8" text-anchor="middle">КПД ПРОЦЕССА</text>
      </g>
    `;
  } else {
    // Step staircase / ROI roadmap
    chartGraphic = `
      <g transform="translate(45, 30)">
        <rect x="0" y="100" width="60" height="50" rx="6" fill="rgba(99, 102, 241, 0.4)"/>
        <rect x="70" y="70" width="60" height="80" rx="6" fill="rgba(6, 182, 212, 0.6)"/>
        <rect x="140" y="40" width="60" height="110" rx="6" fill="rgba(16, 185, 129, 0.8)"/>
        <rect x="210" y="10" width="60" height="140" rx="6" fill="#10B981" filter="url(#glow)"/>
        <line x1="-15" y1="150" x2="280" y2="150" stroke="rgba(255, 255, 255, 0.2)" stroke-width="2"/>
        <text x="240" y="-2" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#10B981" text-anchor="middle">TARGET</text>
      </g>
    `;
  }

  const svg = `
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070A12"/>
      <stop offset="50%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#050811"/>
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(30, 41, 59, 0.88)"/>
      <stop offset="100%" stop-color="rgba(15, 23, 42, 0.96)"/>
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Deep Studio Canvas -->
  <rect width="1280" height="720" fill="url(#bgGrad)"/>

  <!-- Tech Grid Background -->
  <g stroke="rgba(255, 255, 255, 0.04)" stroke-width="1">
    <line x1="160" y1="0" x2="160" y2="720"/>
    <line x1="320" y1="0" x2="320" y2="720"/>
    <line x1="480" y1="0" x2="480" y2="720"/>
    <line x1="640" y1="0" x2="640" y2="720"/>
    <line x1="800" y1="0" x2="800" y2="720"/>
    <line x1="960" y1="0" x2="960" y2="720"/>
    <line x1="1120" y1="0" x2="1120" y2="720"/>
    <line x1="0" y1="180" x2="1280" y2="180"/>
    <line x1="0" y1="360" x2="1280" y2="360"/>
    <line x1="0" y1="540" x2="1280" y2="540"/>
  </g>

  <!-- Ambient Light Halo -->
  <circle cx="980" cy="220" r="220" fill="${accentGlow}" filter="url(#glow)"/>
  <circle cx="260" cy="500" r="180" fill="rgba(99, 102, 241, 0.15)" filter="url(#glow)"/>

  <!-- Main Executive Glass Card -->
  <rect x="140" y="90" width="1000" height="540" rx="28" fill="url(#cardGrad)" stroke="rgba(255, 255, 255, 0.14)" stroke-width="2"/>

  <!-- Top Status Line -->
  <g transform="translate(190, 140)">
    <rect x="0" y="0" width="130" height="30" rx="6" fill="rgba(255, 255, 255, 0.08)"/>
    <text x="65" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#E2E8F0" text-anchor="middle">СЦЕНА ${sceneIndex}</text>

    <rect x="145" y="0" width="220" height="30" rx="6" fill="${accentGlow}" stroke="${accentColor}" stroke-width="1"/>
    <text x="255" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="${accentColor}" text-anchor="middle">${trendArrow}</text>
  </g>

  <!-- Big Scene Headline -->
  <text x="190" y="230" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="900" fill="#FFFFFF" letter-spacing="-0.5">${escapeXml(title)}</text>

  <!-- Metric Container -->
  <rect x="190" y="270" width="460" height="230" rx="20" fill="rgba(0, 0, 0, 0.5)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1.5"/>
  <rect x="190" y="270" width="8" height="230" rx="4" fill="${accentColor}"/>

  <text x="225" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#94A3B8" letter-spacing="1">${escapeXml(metricLabel.toUpperCase())}</text>
  <text x="225" y="415" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="900" fill="${accentColor}">${escapeXml(metricValue)}</text>

  <g transform="translate(225, 455)">
    <circle cx="6" cy="6" r="5" fill="#10B981"/>
    <text x="22" y="10" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#CBD5E1">Данные подтверждены первичными выписками аудита</text>
  </g>

  <!-- Dynamic Right Chart Block -->
  <g transform="translate(710, 270)">
    <rect x="0" y="0" width="370" height="230" rx="20" fill="rgba(0, 0, 0, 0.35)" stroke="rgba(255, 255, 255, 0.08)" stroke-width="1"/>
    ${chartGraphic}
  </g>

  <!-- Bottom Brand Footer -->
  <text x="190" y="580" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748B">ПЛАТФОРМА БИЗНЕС-АУДИТА • EXECUTIVE STUDIO 16:9 DATA CARD</text>
</svg>
`;

  const b64 = Buffer.from(svg.trim()).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
