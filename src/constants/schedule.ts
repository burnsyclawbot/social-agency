import type { Platform } from '../types';

// Default posting times in US Eastern
export const DEFAULT_TIMES: Record<Platform, string> = {
  linkedin: '07:30',
  instagram: '09:00',
  tiktok: '11:00',
  facebook: '12:00',
};

// Convert ET time to UTC ISO string for a given date
export function etToUtc(date: string, timeET: string): string {
  // Determine if date falls in EDT (Mar second Sun – Nov first Sun) or EST
  const d = new Date(`${date}T${timeET}:00`);
  const year = d.getFullYear();

  // Second Sunday of March
  const marFirst = new Date(year, 2, 1);
  const marSecondSun = new Date(year, 2, 8 + (7 - marFirst.getDay()) % 7);

  // First Sunday of November
  const novFirst = new Date(year, 10, 1);
  const novFirstSun = new Date(year, 10, 1 + (7 - novFirst.getDay()) % 7);

  const isEDT = d >= marSecondSun && d < novFirstSun;
  const offsetHours = isEDT ? 4 : 5;

  const [hours, minutes] = timeET.split(':').map(Number);
  const utc = new Date(Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    hours + offsetHours,
    minutes,
  ));

  return utc.toISOString();
}
