import { useState, useCallback, useRef, useEffect } from 'react';
import Header from '../components/layout/Header';
import WeekOverview from '../components/plan/WeekOverview';
import AIGenerationWizard from '../components/plan/AIGenerationWizard';
import { Sparkles, Loader2, Save, Check, Copy, List } from 'lucide-react';
import type { ClientProfile } from '../types/client';
import type { ContentPlan, Platform, Post, ShotStatus, ShotMedia } from '../types';
import { buildSystemPrompt } from '../lib/system-prompt';
import { getTomorrowDate, addDays } from '../lib/time';
import { apiFetch } from '../lib/api';
import { validatePost } from '../lib/validation';

interface PlanPageProps {
  client: ClientProfile | null;
  onPlanCreated?: (planId: string) => void;
  onDirtyChange?: (dirty: boolean, saveFn?: () => Promise<void>) => void;
}

function generatePostId(dayNumber: number, platform: string) {
  return `day${dayNumber}-${platform}`;
}

export default function PlanPage({ client, onPlanCreated, onDirtyChange }: PlanPageProps) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [aiWizardDay, setAiWizardDay] = useState<number | null>(null);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [savedPlans, setSavedPlans] = useState<ContentPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const savedSnapshotRef = useRef<string | null>(null);

  const clientId = client?.id || 'default';

  const planSaveRef = useRef<() => Promise<void>>(async () => {});

  // Track dirty state
  useEffect(() => {
    if (!plan) {
      setDirty(false);
      onDirtyChange?.(false);
      return;
    }
    const current = JSON.stringify(plan);
    const isDirty = savedSnapshotRef.current !== current;
    setDirty(isDirty);
    const saveFn = async () => { await planSaveRef.current(); };
    onDirtyChange?.(isDirty, saveFn);
  }, [plan, onDirtyChange]);

  const handleGenerate = async () => {
    if (!topic.trim() || !client) return;
    setLoading(true);
    setError(null);

    const startDate = getTomorrowDate();
    const systemPrompt = buildSystemPrompt(client);

    try {
      const data = await apiFetch<{ days: Array<{
        dayNumber: number;
        date: string;
        angle: string;
        shotList: {
          contentType: string;
          subject: string;
          framing: string;
          setting: string;
          keyElements: string;
          lighting: string;
          platformFormat: string;
          fileNames: string[];
          notes: string;
        };
        posts: Array<{ platform: Platform; text: string }>;
      }> }>('/generate-plan', {
        method: 'POST',
        body: JSON.stringify({ topic, startDate, systemPrompt }),
      });

      const planId = `plan_${Date.now()}`;
      const endDate = addDays(startDate, 6);

      const contentPlan: ContentPlan = {
        id: planId,
        topic,
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        status: 'draft',
        days: data.days.map((day) => ({
          ...day,
          shotList: {
            ...day.shotList,
            status: 'planned' as ShotStatus,
            media: [] as ShotMedia[],
          },
          posts: day.posts.map((post) => {
            const validation = validatePost(post.text, post.platform);
            return {
              id: generatePostId(day.dayNumber, post.platform),
              platform: post.platform,
              text: post.text,
              scheduledTime: '',
              mediaUrls: [],
              status: validation.valid ? 'validated' : 'draft',
              validation,
            } satisfies Post;
          }),
        })),
      };

      setPlan(contentPlan);
      savedSnapshotRef.current = null; // New plan, not yet saved
      onPlanCreated?.(planId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plan || !client) return;
    setSaving(true);
    try {
      await apiFetch(`/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          clientId: client.id,
          topic: plan.topic,
          generatedAt: plan.generatedAt,
          startDate: plan.startDate,
          endDate: plan.endDate,
          status: plan.status,
          days: plan.days,
        }),
      });
      savedSnapshotRef.current = JSON.stringify(plan);
      setDirty(false);
      onDirtyChange?.(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  planSaveRef.current = handleSave;

  const loadSavedPlans = async () => {
    if (!client) return;
    setLoadingPlans(true);
    try {
      const data = await apiFetch<{ plans: ContentPlan[] }>(`/plans?clientId=${client.id}`);
      setSavedPlans(data.plans);
      setShowSavedPlans(true);
    } catch {
      // silent
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadPlan = (p: ContentPlan) => {
    setPlan(p);
    savedSnapshotRef.current = JSON.stringify(p);
    setShowSavedPlans(false);
    onPlanCreated?.(p.id);
  };

  const handleUpdatePost = (dayNumber: number, platform: Platform, text: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      days: plan.days.map((day) =>
        day.dayNumber === dayNumber
          ? {
              ...day,
              posts: day.posts.map((post) =>
                post.platform === platform
                  ? {
                      ...post,
                      text,
                      validation: validatePost(text, platform, post.mediaUrls),
                      status: validatePost(text, platform, post.mediaUrls).valid ? 'validated' : 'draft',
                    }
                  : post
              ),
            }
          : day
      ),
    });
  };

  const updateDay = useCallback((dayNumber: number, updater: (day: ContentPlan['days'][0]) => ContentPlan['days'][0]) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) => d.dayNumber === dayNumber ? updater(d) : d),
      };
    });
  }, []);

  const handleShotStatusChange = useCallback((dayNumber: number, status: ShotStatus) => {
    updateDay(dayNumber, (day) => ({
      ...day,
      shotList: { ...day.shotList, status },
    }));
  }, [updateDay]);

  const handleMediaUpload = useCallback(async (dayNumber: number, files: File[]) => {
    if (!client) return;

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('clientId', client.id);
    formData.append('planId', plan?.id || 'unassigned');

    try {
      const token = localStorage.getItem('spa_social_token');
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      const newMedia: ShotMedia[] = data.uploaded.map((u: { name: string; url: string; size: number; contentType: string }) => ({
        id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        originalName: u.name,
        displayName: u.name,
        url: u.url,
        type: u.contentType.startsWith('video/') ? 'video' : 'image' as const,
        size: u.size,
      }));

      updateDay(dayNumber, (day) => ({
        ...day,
        shotList: {
          ...day.shotList,
          media: [...(day.shotList.media || []), ...newMedia],
          status: 'uploaded',
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [client, plan?.id, updateDay]);

  const handleMediaRename = useCallback((dayNumber: number, mediaId: string, newName: string) => {
    updateDay(dayNumber, (day) => ({
      ...day,
      shotList: {
        ...day.shotList,
        media: (day.shotList.media || []).map((m) =>
          m.id === mediaId ? { ...m, displayName: newName } : m
        ),
      },
    }));
  }, [updateDay]);

  const handleMediaRemove = useCallback((dayNumber: number, mediaId: string) => {
    updateDay(dayNumber, (day) => ({
      ...day,
      shotList: {
        ...day.shotList,
        media: (day.shotList.media || []).filter((m) => m.id !== mediaId),
      },
    }));
  }, [updateDay]);

  const handleAIAccept = useCallback((dayNumber: number, imageUrl: string, displayName: string) => {
    const newMedia: ShotMedia = {
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      originalName: displayName,
      displayName,
      url: imageUrl,
      type: 'image',
    };
    updateDay(dayNumber, (day) => ({
      ...day,
      shotList: {
        ...day.shotList,
        media: [...(day.shotList.media || []), newMedia],
        status: 'uploaded',
      },
    }));
    setAiWizardDay(null);
  }, [updateDay]);

  const handleCopyAllShotLists = async () => {
    if (!plan) return;
    const text = plan.days.map((day) => {
      const sl = day.shotList;
      const lines = [
        `Day ${day.dayNumber} — ${day.angle}`,
        `Date: ${day.date}`,
        '',
        sl.contentType && `Content type: ${sl.contentType}`,
        sl.subject && `Subject: ${sl.subject}`,
        sl.framing && `Framing: ${sl.framing}`,
        sl.setting && `Setting: ${sl.setting}`,
        sl.keyElements && `Key elements: ${sl.keyElements}`,
        sl.lighting && `Lighting: ${sl.lighting}`,
        sl.platformFormat && `Format: ${sl.platformFormat}`,
        sl.fileNames?.length && `Files: ${sl.fileNames.join(', ')}`,
        sl.notes && `\nNotes: ${sl.notes}`,
      ].filter(Boolean);
      return lines.join('\n');
    }).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const PLATFORM_LABELS: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', linkedin: 'LinkedIn' };
  const connectedPlatforms = client
    ? (['instagram', 'tiktok', 'facebook', 'linkedin'] as const).filter((p) => client.platforms[p].enabled && client.platforms[p].accountId).map((p) => PLATFORM_LABELS[p])
    : [];
  const totalPosts = plan?.days.reduce((sum, d) => sum + d.posts.length, 0) ?? 0;
  const validPosts = plan?.days.reduce(
    (sum, d) => sum + d.posts.filter((p) => p.validation.valid).length, 0
  ) ?? 0;
  const shotsComplete = plan?.days.filter((d) => (d.shotList.status || 'planned') !== 'planned').length ?? 0;
  const totalDays = plan?.days.length ?? 0;

  const aiWizardShotList = aiWizardDay ? plan?.days.find((d) => d.dayNumber === aiWizardDay)?.shotList : null;

  return (
    <>
      <Header
        title="Weekly Content Plan"
        subtitle={plan ? `${plan.topic} — ${totalPosts} posts (${validPosts} valid) | ${shotsComplete}/${totalDays} shots complete` : `Generate 7 days of content across your connected platforms`}
        action={
          plan ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAllShotLists}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-charcoal bg-white border border-warm-beige/50 hover:bg-off-white rounded-lg transition-colors"
              >
                {copiedAll ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copiedAll ? 'Copied!' : 'Copy All Shots'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  saved
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : dirty
                    ? 'bg-dusty-rose text-white hover:bg-dusty-rose/90'
                    : 'bg-white text-soft-gray border border-warm-beige/50 cursor-default'
                }`}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : saved ? (
                  <Check size={14} />
                ) : (
                  <Save size={14} />
                )}
                {saving ? 'Saving...' : saved ? 'Saved!' : dirty ? 'Save Plan' : 'Saved'}
              </button>
              <button
                onClick={() => { setPlan(null); savedSnapshotRef.current = null; }}
                className="text-sm text-soft-gray hover:text-charcoal transition-colors"
              >
                New Plan
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        {!plan ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-warm-beige/30">
              <label className="block text-sm font-medium text-charcoal mb-2">
                What's the topic or theme for this week?
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., spring skincare tips, Botox myths, behind the scenes"
                className="w-full px-4 py-3 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                disabled={loading}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !topic.trim() || !client || connectedPlatforms.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-dusty-rose text-white rounded-lg font-medium hover:bg-dusty-rose/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Generating plan...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate Weekly Plan
                    </>
                  )}
                </button>
                <button
                  onClick={loadSavedPlans}
                  disabled={loadingPlans || !client}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-warm-beige/50 text-charcoal rounded-lg font-medium hover:bg-off-white disabled:opacity-50 transition-colors"
                >
                  {loadingPlans ? <Loader2 size={18} className="animate-spin" /> : <List size={18} />}
                  Saved Plans
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {!client && (
                <p className="mt-4 text-sm text-amber-600">
                  Complete onboarding first to set up your brand voice.
                </p>
              )}

              {client && connectedPlatforms.length === 0 && (
                <p className="mt-4 text-sm text-amber-600">
                  No platforms have account IDs configured. Go to Settings &rarr; Platforms &amp; API to add account IDs.
                </p>
              )}
            </div>

            {!loading && connectedPlatforms.length > 0 && (
              <div className="mt-8 text-center text-soft-gray text-sm">
                Enter a topic to generate 7 days of posts for {connectedPlatforms.join(', ')}.
              </div>
            )}

            {/* Saved plans list */}
            {showSavedPlans && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSavedPlans(false)}>
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[70vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-warm-beige/30">
                    <h3 className="text-lg font-semibold text-charcoal">Saved Plans</h3>
                  </div>
                  {savedPlans.length === 0 ? (
                    <p className="px-6 py-8 text-center text-soft-gray text-sm">No saved plans yet.</p>
                  ) : (
                    <div className="divide-y divide-warm-beige/20">
                      {savedPlans.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => loadPlan(p)}
                          className="w-full text-left px-6 py-4 hover:bg-off-white/50 transition-colors"
                        >
                          <p className="text-sm font-medium text-charcoal">{p.topic}</p>
                          <p className="text-xs text-soft-gray mt-0.5">
                            {p.startDate} to {p.endDate} — {p.days.length} days, {p.days.reduce((s, d) => s + d.posts.length, 0)} posts
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            <WeekOverview
              plan={plan}
              onUpdatePost={handleUpdatePost}
              onShotStatusChange={handleShotStatusChange}
              onMediaUpload={handleMediaUpload}
              onMediaRename={handleMediaRename}
              onMediaRemove={handleMediaRemove}
              onGenerateAI={(dayNumber) => setAiWizardDay(dayNumber)}
            />
          </div>
        )}
      </div>

      {/* AI Generation Wizard */}
      {aiWizardDay && aiWizardShotList && (
        <AIGenerationWizard
          shotList={aiWizardShotList}
          dayNumber={aiWizardDay}
          clientId={clientId}
          referencePhotos={client?.referencePhotos}
          onAccept={(url, name) => handleAIAccept(aiWizardDay, url, name)}
          onClose={() => setAiWizardDay(null)}
        />
      )}
    </>
  );
}
