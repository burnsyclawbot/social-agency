import type { Platform } from '../types';

interface MatchResult {
  dayNumber: number;
  platform: Platform | 'all';
  variant?: string; // 'reel', 'carousel-1', etc.
}

const PLATFORM_MAP: Record<string, Platform | 'all'> = {
  ig: 'instagram',
  instagram: 'instagram',
  tiktok: 'tiktok',
  fb: 'facebook',
  facebook: 'facebook',
  linkedin: 'linkedin',
  all: 'all',
};

// Parse a filename like "day1-ig-reel.mp4" into structured match info
export function parseMediaFilename(filename: string): MatchResult | null {
  const match = filename.match(/^day(\d+)-(\w+)(?:-(.+))?\.(\w+)$/i);
  if (!match) return null;

  const dayNumber = parseInt(match[1], 10);
  const platformKey = match[2].toLowerCase();
  const variant = match[3]?.toLowerCase();

  const platform = PLATFORM_MAP[platformKey];
  if (!platform) return null;

  return { dayNumber, platform, variant };
}

// Determine if a file is image or video by extension
export function getMediaType(filename: string): 'image' | 'video' {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['mp4', 'mov', 'avi', 'webm'].includes(ext || '') ? 'video' : 'image';
}
