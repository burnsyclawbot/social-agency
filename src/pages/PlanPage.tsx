import { useState } from 'react';
import Header from '../components/layout/Header';
import WeekOverview from '../components/plan/WeekOverview';
import { Sparkles, Loader2 } from 'lucide-react';
import type { ClientProfile } from '../types/client';
import type { ContentPlan, Platform, Post } from '../types';
import { buildSystemPrompt } from '../lib/system-prompt';
import { getTomorrowDate, addDays } from '../lib/time';
import { apiFetch } from '../lib/api';
import { validatePost } from '../lib/validation';

interface PlanPageProps {
  client: ClientProfile | null;
}

function generatePostId(dayNumber: number, platform: string) {
  return `day${dayNumber}-${platform}`;
}

export default function PlanPage({ client }: PlanPageProps) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ContentPlan | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
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

  const totalPosts = plan?.days.reduce((sum, d) => sum + d.posts.length, 0) ?? 0;
  const validPosts = plan?.days.reduce(
    (sum, d) => sum + d.posts.filter((p) => p.validation.valid).length, 0
  ) ?? 0;

  return (
    <>
      <Header
        title="Weekly Content Plan"
        subtitle={plan ? `${plan.topic} — ${totalPosts} posts (${validPosts} valid)` : 'Generate 7 days of content across 4 platforms'}
        action={
          plan ? (
            <button
              onClick={() => setPlan(null)}
              className="text-sm text-soft-gray hover:text-charcoal transition-colors"
            >
              New Plan
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 p-8 overflow-y-auto">
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
              <button
                onClick={handleGenerate}
                disabled={loading || !topic.trim() || !client}
                className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-dusty-rose text-white rounded-lg font-medium hover:bg-dusty-rose/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating 28 posts...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Weekly Plan
                  </>
                )}
              </button>

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
            </div>

            {!loading && (
              <div className="mt-8 text-center text-soft-gray text-sm">
                Enter a topic above to generate 28 posts with shot lists.
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <WeekOverview plan={plan} onUpdatePost={handleUpdatePost} />
          </div>
        )}
      </div>
    </>
  );
}
