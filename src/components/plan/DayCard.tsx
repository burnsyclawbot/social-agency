import { useState } from 'react';
import type { Day, Platform, ShotStatus } from '../../types';
import PostEditor from './PostEditor';
import ShotListView from './ShotListView';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '../../lib/time';

const STATUS_LABELS: Record<ShotStatus, string> = {
  planned: 'Planned',
  taken: 'Shot Taken',
  uploaded: 'Uploaded',
};

const STATUS_COLORS: Record<ShotStatus, string> = {
  planned: 'bg-warm-beige/20 text-soft-gray',
  taken: 'bg-amber-50 text-amber-700',
  uploaded: 'bg-green-50 text-green-700',
};

interface DayCardProps {
  day: Day;
  onUpdatePost: (platform: Platform, text: string) => void;
  onShotStatusChange: (status: ShotStatus) => void;
  onMediaUpload: (files: File[]) => void;
  onMediaRename: (mediaId: string, newName: string) => void;
  onMediaRemove: (mediaId: string) => void;
  onGenerateAI: () => void;
}

export default function DayCard({ day, onUpdatePost, onShotStatusChange, onMediaUpload, onMediaRename, onMediaRemove, onGenerateAI }: DayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const shotStatus = day.shotList.status || 'planned';
  const mediaCount = day.shotList.media?.length || 0;

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
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[shotStatus]}`}>
            {STATUS_LABELS[shotStatus]}
          </span>
          {mediaCount > 0 && (
            <span className="text-xs text-soft-gray">{mediaCount} file{mediaCount !== 1 ? 's' : ''}</span>
          )}
          <span className="text-xs text-soft-gray">{day.posts.length} posts</span>
          {expanded ? <ChevronUp size={16} className="text-soft-gray" /> : <ChevronDown size={16} className="text-soft-gray" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 border-t border-warm-beige/20">
          <div className="pt-4">
            <ShotListView
              shotList={day.shotList}
              dayNumber={day.dayNumber}
              onStatusChange={onShotStatusChange}
              onMediaUpload={onMediaUpload}
              onMediaRename={onMediaRename}
              onMediaRemove={onMediaRemove}
              onGenerateAI={onGenerateAI}
            />
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
