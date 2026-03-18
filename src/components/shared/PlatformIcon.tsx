import { Instagram, Facebook, Linkedin, Video } from 'lucide-react';
import type { Platform } from '../../types';

const ICONS: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  tiktok: Video,
  facebook: Facebook,
  linkedin: Linkedin,
};

const COLORS: Record<Platform, string> = {
  instagram: 'text-pink-500',
  tiktok: 'text-gray-800',
  facebook: 'text-blue-600',
  linkedin: 'text-blue-700',
};

interface PlatformIconProps {
  platform: Platform;
  size?: number;
  className?: string;
}

export default function PlatformIcon({ platform, size = 18, className = '' }: PlatformIconProps) {
  const Icon = ICONS[platform];
  return <Icon size={size} className={`${COLORS[platform]} ${className}`} />;
}
