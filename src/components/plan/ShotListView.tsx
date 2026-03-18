import type { ShotList } from '../../types';
import { Camera } from 'lucide-react';

interface ShotListViewProps {
  shotList: ShotList;
}

export default function ShotListView({ shotList }: ShotListViewProps) {
  return (
    <div className="bg-warm-beige/10 rounded-lg p-4 border border-warm-beige/30">
      <div className="flex items-center gap-2 mb-3">
        <Camera size={16} className="text-dusty-rose" />
        <h4 className="text-sm font-semibold text-charcoal">Shot List</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Field label="Content type" value={shotList.contentType} />
        <Field label="Subject" value={shotList.subject} />
        <Field label="Framing" value={shotList.framing} />
        <Field label="Setting" value={shotList.setting} />
        <Field label="Key elements" value={shotList.keyElements} />
        <Field label="Lighting" value={shotList.lighting} />
        <Field label="Format" value={shotList.platformFormat} />
        <Field label="Files" value={shotList.fileNames.join(', ')} />
      </div>

      {shotList.notes && (
        <div className="mt-3 pt-3 border-t border-warm-beige/30">
          <p className="text-xs text-soft-gray">
            <span className="font-medium">Notes:</span> {shotList.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-soft-gray">{label}: </span>
      <span className="text-sm text-charcoal">{value}</span>
    </div>
  );
}
