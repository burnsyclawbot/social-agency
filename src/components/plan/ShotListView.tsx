import { useState, useRef } from 'react';
import type { ShotList, ShotStatus, ShotMedia } from '../../types';
import { Camera, Copy, Check, Upload, X, Pencil, Wand2, CheckCircle, Circle, ImageIcon } from 'lucide-react';

interface ShotListViewProps {
  shotList: ShotList;
  dayNumber: number;
  onStatusChange: (status: ShotStatus) => void;
  onMediaUpload: (files: File[]) => void;
  onMediaRename: (mediaId: string, newName: string) => void;
  onMediaRemove: (mediaId: string) => void;
  onGenerateAI: () => void;
}

export default function ShotListView({
  shotList,
  dayNumber,
  onStatusChange,
  onMediaUpload,
  onMediaRename,
  onMediaRemove,
  onGenerateAI,
}: ShotListViewProps) {
  const [copied, setCopied] = useState(false);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = shotList.status || 'planned';
  const media = shotList.media || [];

  const handleCopyToClipboard = async () => {
    const text = formatShotListText(shotList, dayNumber);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for mobile/older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onMediaUpload(files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onMediaUpload(files);
    }
  };

  const startRename = (m: ShotMedia) => {
    setEditingMediaId(m.id);
    setEditName(m.displayName);
  };

  const confirmRename = () => {
    if (editingMediaId && editName.trim()) {
      onMediaRename(editingMediaId, editName.trim());
    }
    setEditingMediaId(null);
  };

  const statusSteps: { key: ShotStatus; label: string }[] = [
    { key: 'planned', label: 'Planned' },
    { key: 'taken', label: 'Shot Taken' },
    { key: 'uploaded', label: 'Uploaded' },
  ];

  const statusIndex = statusSteps.findIndex((s) => s.key === status);

  return (
    <div className="bg-warm-beige/10 rounded-lg border border-warm-beige/30 overflow-hidden">
      {/* Header with copy + AI generate buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-beige/20">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-dusty-rose" />
          <h4 className="text-sm font-semibold text-charcoal">Shot List — Day {dayNumber}</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerateAI}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Wand2 size={13} />
            AI Generate
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal bg-white border border-warm-beige/50 hover:bg-off-white rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check size={13} className="text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Shot details */}
      <div className="px-4 py-3">
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

      {/* Status tracker */}
      <div className="px-4 py-3 border-t border-warm-beige/20">
        <div className="flex items-center gap-1">
          {statusSteps.map((step, i) => (
            <button
              key={step.key}
              onClick={() => onStatusChange(step.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                i <= statusIndex
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-white text-soft-gray border border-warm-beige/30 hover:bg-off-white'
              }`}
            >
              {i <= statusIndex ? (
                <CheckCircle size={13} />
              ) : (
                <Circle size={13} />
              )}
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media upload area */}
      <div className="px-4 py-3 border-t border-warm-beige/20">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Uploaded media grid */}
        {media.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {media.map((m) => (
              <div key={m.id} className="relative group bg-white rounded-lg border border-warm-beige/30 p-2">
                {m.type === 'image' ? (
                  <img
                    src={m.url}
                    alt={m.displayName}
                    className="w-full h-24 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-24 bg-charcoal/5 rounded flex items-center justify-center">
                    <ImageIcon size={24} className="text-soft-gray" />
                  </div>
                )}

                {/* Name / rename */}
                <div className="mt-1.5">
                  {editingMediaId === m.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                        className="flex-1 text-xs px-1.5 py-1 border border-dusty-rose/50 rounded focus:outline-none focus:ring-1 focus:ring-dusty-rose/30"
                        autoFocus
                      />
                      <button onClick={confirmRename} className="text-green-600 hover:text-green-700">
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-charcoal truncate flex-1">{m.displayName}</span>
                      <button
                        onClick={() => startRename(m)}
                        className="opacity-0 group-hover:opacity-100 text-soft-gray hover:text-charcoal transition-opacity"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onMediaRemove(m.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 shadow-sm transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-4 px-4 border-2 border-dashed border-warm-beige/40 rounded-lg text-soft-gray hover:border-dusty-rose/40 hover:text-dusty-rose cursor-pointer transition-colors"
        >
          <Upload size={16} />
          <span className="text-xs font-medium">
            {media.length > 0 ? 'Upload more media' : 'Upload photos or videos'}
          </span>
        </div>
      </div>
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

function formatShotListText(shotList: ShotList, dayNumber: number): string {
  const lines = [`Day ${dayNumber} — Shot List`, ''];
  if (shotList.contentType) lines.push(`Content type: ${shotList.contentType}`);
  if (shotList.subject) lines.push(`Subject: ${shotList.subject}`);
  if (shotList.framing) lines.push(`Framing: ${shotList.framing}`);
  if (shotList.setting) lines.push(`Setting: ${shotList.setting}`);
  if (shotList.keyElements) lines.push(`Key elements: ${shotList.keyElements}`);
  if (shotList.lighting) lines.push(`Lighting: ${shotList.lighting}`);
  if (shotList.platformFormat) lines.push(`Format: ${shotList.platformFormat}`);
  if (shotList.fileNames?.length) lines.push(`Files: ${shotList.fileNames.join(', ')}`);
  if (shotList.notes) lines.push('', `Notes: ${shotList.notes}`);
  return lines.join('\n');
}
