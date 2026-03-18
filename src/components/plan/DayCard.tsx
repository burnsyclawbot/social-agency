import { useState } from 'react';
import type { Day, Platform } from '../../types';
import PostEditor from './PostEditor';
import ShotListView from './ShotListView';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '../../lib/time';

interface DayCardProps {
  day: Day;
  onUpdatePost: (platform: Platform, text: string) => void;
}

export default function DayCard({ day, onUpdatePost }: DayCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-warm-beige/30 overflow-hidden">
      {/* Day header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-off-white/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-dusty-rose/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-dusty-rose">{day.dayNumber}</span>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-charcoal">{day.angle}</h3>
            <p className="text-xs text-soft-gray">
              {formatDate(day.date)} — {day.shotList.contentType}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-soft-gray">{day.posts.length} posts</span>
          {expanded ? <ChevronUp size={16} className="text-soft-gray" /> : <ChevronDown size={16} className="text-soft-gray" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 border-t border-warm-beige/20">
          <div className="pt-4">
            <ShotListView shotList={day.shotList} />
          </div>

          <div className="space-y-3">
            {day.posts.map((post) => (
              <PostEditor
                key={post.id}
                platform={post.platform}
                text={post.text}
                onChange={(text) => onUpdatePost(post.platform, text)}
                mediaUrls={post.mediaUrls}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
