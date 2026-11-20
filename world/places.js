/**
 * Pure helpers for the career neighborhood. No Three.js, so the
 * ordering and the reduced-motion decision can be tested in Node.
 */

export function dateKey(value, isEnd = false) {
  const s = String(value ?? '');
  if (s.startsWith('TODO')) return 9_000_000;
  if (s === 'present') return 9_000_001;
  if (!s) return isEnd ? 9_000_001 : 0;
  const match = s.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return 8_999_999;
  return Number(match[1]) * 12 + Number(match[2] || 1);
}

/** Oldest first, so walking forward walks through the career. */
export function sortExperienceChronologically(experience = []) {
  return experience
    .map((job, index) => ({ job, index }))
    .sort((a, b) => {
      const start = dateKey(a.job.dates?.start, false) - dateKey(b.job.dates?.start, false);
      if (start) return start;
      const end = dateKey(a.job.dates?.end, true) - dateKey(b.job.dates?.end, true);
      if (end) return end;
      return a.index - b.index;
    })
    .map((row) => row.job);
}

function yearToken(value) {
  const s = String(value ?? '');
  if (!s) return '';
  if (s === 'present' || s.startsWith('TODO')) return s;
  const match = s.match(/^(\d{4})/);
  return match ? match[1] : s;
}

/** Sign-sized range. Keeps TODO-confirm visible. */
export function formatSignYears(dates = {}) {
  const start = yearToken(dates.start);
  const end = yearToken(dates.end);
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

/** Panel range keeps the source strings, including month precision. */
export function formatPanelDates(dates = {}) {
  const start = dates.start || '';
  const end = dates.end || '';
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

export function prefersFallback() {
  const reduce = typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = typeof navigator !== 'undefined' && !!navigator.connection?.saveData;
  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 8) : 8;
  const lowPower = cores <= 2 || saveData;
  return { reduce, lowPower, fallback: reduce || lowPower };
}
