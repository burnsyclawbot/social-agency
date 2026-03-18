import type { ContentPlan, Platform } from '../../types';
import DayCard from './DayCard';

interface WeekOverviewProps {
  plan: ContentPlan;
  onUpdatePost: (dayNumber: number, platform: Platform, text: string) => void;
}

export default function WeekOverview({ plan, onUpdatePost }: WeekOverviewProps) {
  return (
    <div className="space-y-3">
      {plan.days.map((day) => (
        <DayCard
          key={day.dayNumber}
          day={day}
          onUpdatePost={(platform, text) => onUpdatePost(day.dayNumber, platform, text)}
        />
      ))}
    </div>
  );
}
