/**
 * Pure client/server utilities for speech and scene titles
 * Contains NO Node.js built-ins so it can be safely imported anywhere.
 */

/**
 * Strips any speaker name prefixes (e.g. "Елена:", "Алекс:", "Спикер 1:", "Host:")
 * so TTS voices never read out names aloud like "Елена двоеточие...",
 * and subtitles never show redundant speaker names.
 */
export function cleanSpeechScript(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(?:(?:[А-ЯЁA-Z][а-яёa-z]+(?:\s*\([^)]+\))?|Спикер\s*\d+|Host|Cohost|Speaker\s*\d+)\s*[:—–-])\s*/i, '')
    .trim();
}

/**
 * Cleans scene titles from duplicate "Сцена X:" or returns a meaningful title.
 */
export function cleanSceneTitle(title: string, sceneIndex: number = 1): string {
  const defaultTopics: Record<number, string> = {
    1: 'Вскрытие операционной картины',
    2: 'Главный источник утечки',
    3: 'Анатомия клиентского потока и ФОТ',
    4: 'Вторичные потери и отток клиентов',
    5: 'Себестоимость и юнит-экономика',
    6: 'Экстренные меры P0 (1–7 дней)',
    7: 'Системная трансформация P1 (30 дней)',
    8: 'Масштабирование P2 и финансовый ROI',
    9: 'Финальный вердикт аудитора'
  };

  let clean = (title || '').trim();
  if (!clean || /^сцена\s*\d*[:\s\-\.]*$/i.test(clean)) {
    return defaultTopics[sceneIndex] || `Аналитический срез ${sceneIndex}`;
  }
  clean = clean.replace(/^Сцена\s*\d+[:\s\-\.]*/i, '').trim();
  return clean || defaultTopics[sceneIndex] || `Аналитический срез ${sceneIndex}`;
}
