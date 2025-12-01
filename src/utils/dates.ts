/**
 * Date Utility Functions
 * Helper functions for date normalization, manipulation, and range operations
 */

export function normalizeDate(d: Date | string): Date {
  const x = typeof d === 'string' ? new Date(d) : new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function sameDay(a: Date, b: Date): boolean {
  return normalizeDate(a).getTime() === normalizeDate(b).getTime();
}

export type Range = { start: Date; end: Date }; // end exclusive

export function mergeRanges(ranges: Range[]): Range[] {
  if (!ranges?.length) return [];

  // normalize and sort
  const sorted = ranges
    .map(r => ({ start: normalizeDate(r.start), end: normalizeDate(r.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const out: Range[] = [];
  let cur = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    // If r.start <= cur.end (adjacent/overlap), extend cur.end
    if (r.start.getTime() <= cur.end.getTime()) {
      cur.end = new Date(Math.max(cur.end.getTime(), r.end.getTime()));
    } else {
      out.push(cur);
      cur = { ...r };
    }
  }

  out.push(cur);
  return out;
}

