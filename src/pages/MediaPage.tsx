import { useState, useCallback, useRef, useEffect } from 'react';
import Header from '../components/layout/Header';
import { Upload, X, Film, Check, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { parseMediaFilename, getMediaType } from '../lib/media-matcher';
import type { Platform } from '../types';

const TOKEN_KEY = 'spa_social_token';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface UploadedFile {
  name: string;
  url: string;
  key: string;
  size: number;
  contentType: string;
  type: 'image' | 'video';
  match: { dayNumber: number; platform: Platform | 'all'; variant?: string } | null;
}

interface MediaPageProps {
  clientId: string;
  planId: string | null;
}

export default function MediaPage({ clientId, planId }: MediaPageProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing files from S3
  useEffect(() => {
    if (!planId) return;
    fetch(`/api/media/list?clientId=${clientId}&planId=${planId}`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        const mapped: UploadedFile[] = (data.files || []).map((f: { name: string; url: string; key: string; size: number }) => ({
          name: f.name,
          url: f.url,
          key: f.key,
          size: f.size,
          contentType: '',
          type: getMediaType(f.name),
          match: parseMediaFilename(f.name),
        }));
        setFiles(mapped);
      })
      .catch(() => {});
  }, [clientId, planId]);

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (!planId) {
      setError('Generate a content plan first before uploading media.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('clientId', clientId);
    formData.append('planId', planId);
    for (const file of Array.from(fileList)) {
      formData.append('files', file);
    }

    try {
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData, headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      const newFiles: UploadedFile[] = data.uploaded.map((f: { name: string; url: string; key: string; size: number; contentType: string }) => ({
        ...f,
        type: getMediaType(f.name),
        match: parseMediaFilename(f.name),
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [clientId, planId]);

  const handleDelete = async (file: UploadedFile) => {
    try {
      await fetch(`/api/media?key=${encodeURIComponent(file.key)}`, { method: 'DELETE', headers: authHeaders() });
      setFiles((prev) => prev.filter((f) => f.key !== file.key));
    } catch {
      setError('Failed to delete file');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const matched = files.filter((f) => f.match);
  const unmatched = files.filter((f) => !f.match);

  return (
    <>
      <Header
        title="Media Upload"
        subtitle={files.length > 0 ? `${files.length} files uploaded — ${matched.length} matched, ${unmatched.length} unmatched` : 'Upload and match media files to your content plan'}
      />
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-dusty-rose bg-dusty-rose/5'
                : 'border-warm-beige bg-white/50 hover:border-dusty-rose/50'
            }`}
          >
            {uploading ? (
              <Loader2 size={40} className="mx-auto text-dusty-rose mb-4 animate-spin" />
            ) : (
              <Upload size={40} className="mx-auto text-soft-gray mb-4" />
            )}
            <p className="text-charcoal font-medium">
              {uploading ? 'Uploading...' : 'Drop media files here or click to upload'}
            </p>
            <p className="text-sm text-soft-gray mt-2">
              Naming convention: day1-ig.jpg, day1-tiktok.mp4, day1-fb.jpg, day1-linkedin.jpg, day1-all.jpg
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={14} className="text-red-400" />
              </button>
            </div>
          )}

          {!planId && (
            <div className="mt-8 text-center text-soft-gray text-sm">
              Generate a content plan first, then upload media files to match.
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-8 space-y-3">
              {files.map((file) => (
                <div
                  key={file.key}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 p-3 bg-white rounded-lg border border-warm-beige/30 shadow-sm"
                >
                  {/* Thumbnail / icon */}
                  <div className="w-12 h-12 rounded-lg bg-off-white flex items-center justify-center shrink-0 overflow-hidden">
                    {file.type === 'video' ? (
                      <Film size={20} className="text-soft-gray" />
                    ) : (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8a8a8a" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                        }}
                      />
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{file.name}</p>
                    <p className="text-xs text-soft-gray">{formatSize(file.size)}</p>
                  </div>

                  {/* Match status */}
                  {file.match ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-full">
                      <Check size={12} className="text-green-600" />
                      <span className="text-xs text-green-700">
                        Day {file.match.dayNumber} — {file.match.platform === 'all' ? 'All platforms' : file.match.platform}
                        {file.match.variant ? ` (${file.match.variant})` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-full">
                      <AlertCircle size={12} className="text-amber-600" />
                      <span className="text-xs text-amber-700">No match</span>
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                    className="p-1.5 text-soft-gray hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
