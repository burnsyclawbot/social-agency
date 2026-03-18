import { useMemo } from 'react';
import type { Platform } from '../../types';
import { PLATFORMS } from '../../constants/platforms';
import { validatePost, findBannedWordPositions } from '../../lib/validation';
import CharCounter from '../shared/CharCounter';
import PlatformIcon from '../shared/PlatformIcon';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface PostEditorProps {
  platform: Platform;
  text: string;
  onChange: (text: string) => void;
  mediaUrls?: string[];
}

export default function PostEditor({ platform, text, onChange, mediaUrls = [] }: PostEditorProps) {
  const config = PLATFORMS[platform];
  const validation = useMemo(() => validatePost(text, platform, mediaUrls), [text, platform, mediaUrls]);
  const bannedPositions = useMemo(() => findBannedWordPositions(text), [text]);
  const hashtags = text.match(/#\w+/g) || [];

  return (
    <div className={`bg-white rounded-lg border transition-colors ${
      validation.valid ? 'border-warm-beige/30' : 'border-red-300'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-warm-beige/20">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} size={16} />
          <span className="text-sm font-medium text-charcoal">{config.label}</span>
          <span className="text-xs text-soft-gray">{config.defaultTime} ET</span>
        </div>
        <div className="flex items-center gap-3">
          {config.hashtagLimit > 0 && (
            <span className={`text-xs ${
              hashtags.length > config.hashtagLimit ? 'text-red-600' : 'text-soft-gray'
            }`}>
              #{hashtags.length}/{config.hashtagLimit}
            </span>
          )}
          <CharCounter current={text.length} limit={config.charLimit} />
          {validation.valid ? (
            <CheckCircle size={14} className="text-green-500" />
          ) : (
            <AlertTriangle size={14} className="text-red-500" />
          )}
        </div>
      </div>

      {/* Text area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 text-sm text-charcoal resize-none focus:outline-none"
          placeholder={`Write ${config.label} post...`}
        />

        {/* Banned word highlights overlay */}
        {bannedPositions.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-1">
              {bannedPositions.map((pos, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                  "{pos.word}"
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Validation errors */}
      {!validation.valid && (
        <div className="px-4 py-2 border-t border-red-100 bg-red-50/50">
          {validation.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}
