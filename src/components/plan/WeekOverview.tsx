import type { ContentPlan, Platform, ShotStatus } from '../../types';
import DayCard from './DayCard';

interface WeekOverviewProps {
  plan: ContentPlan;
  onUpdatePost: (dayNumber: number, platform: Platform, text: string) => void;
  onShotStatusChange: (dayNumber: number, status: ShotStatus) => void;
  onMediaUpload: (dayNumber: number, files: File[]) => void;
  onMediaRename: (dayNumber: number, mediaId: string, newName: string) => void;
  onMediaRemove: (dayNumber: number, mediaId: string) => void;
  onGenerateAI: (dayNumber: number) => void;
}

export default function WeekOverview({ plan, onUpdatePost, onShotStatusChange, onMediaUpload, onMediaRename, onMediaRemove, onGenerateAI }: WeekOverviewProps) {
  return (
    <div className="space-y-3">
      {plan.days.map((day) => (
        <DayCard
          key={day.dayNumber}
          day={day}
          onUpdatePost={(platform, text) => onUpdatePost(day.dayNumber, platform, text)}
          onShotStatusChange={(status) => onShotStatusChange(day.dayNumber, status)}
          onMediaUpload={(files) => onMediaUpload(day.dayNumber, files)}
          onMediaRename={(mediaId, newName) => onMediaRename(day.dayNumber, mediaId, newName)}
          onMediaRemove={(mediaId) => onMediaRemove(day.dayNumber, mediaId)}
          onGenerateAI={() => onGenerateAI(day.dayNumber)}
        />
      ))}
    </div>
  );
}
