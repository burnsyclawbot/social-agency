import type { Platform } from '../types';

export interface PlatformConfig {
  label: string;
  charLimit: number;
  hashtagLimit: number;
  defaultTime: string; // ET time HH:MM
  notes: string;
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  instagram: {
    label: 'Instagram',
    charLimit: 2200,
    hashtagLimit: 5,
    defaultTime: '09:00',
    notes: 'Keywords in caption. Up to 5 hashtags at end. Reels preferred. 4:5 portrait optimal.',
  },
  tiktok: {
    label: 'TikTok',
    charLimit: 2200,
    hashtagLimit: 5,
    defaultTime: '11:00',
    notes: 'Hook in first line. Keyword-rich. 3-5 hashtags. 9:16 vertical.',
  },
  facebook: {
    label: 'Facebook',
    charLimit: 500,
    hashtagLimit: 0,
    defaultTime: '12:00',
    notes: 'Direct CTA. No hashtags. Short and shareable.',
  },
  linkedin: {
    label: 'LinkedIn',
    charLimit: 1300,
    hashtagLimit: 0,
    defaultTime: '07:30',
    notes: 'Educational/professional angle. No hashtags. Provider expertise positioning.',
  },
} as const;

export const PLATFORM_ORDER: Platform[] = ['linkedin', 'instagram', 'tiktok', 'facebook'];
