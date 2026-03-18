import type { ClientProfile } from '../../../types/client';
import { Check, Building2, Palette, MessageSquare, ShieldCheck, Share2 } from 'lucide-react';

interface StepProps {
  draft: Partial<ClientProfile>;
  updateDraft: (updates: Partial<ClientProfile>) => void;
}

export default function ReviewStep({ draft }: StepProps) {
  const biz = draft.business!;
  const brand = draft.brand!;
  const voice = draft.voice!;
  const compliance = draft.compliance!;
  const platforms = draft.platforms!;

  const enabledPlatforms = (['instagram', 'tiktok', 'facebook', 'linkedin'] as const)
    .filter((p) => platforms[p].enabled);

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">Review Your Setup</h2>
      <p className="text-soft-gray text-sm mb-8">
        Everything looks good? Click "Complete Setup" to start creating content.
      </p>

      <div className="space-y-4">
        {/* Business Info */}
        <ReviewSection icon={Building2} title="Business Info">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <ReviewField label="Name" value={biz.name} />
            <ReviewField label="Owner" value={`${biz.ownerName}${biz.ownerTitle ? `, ${biz.ownerTitle}` : ''}`} />
            <ReviewField label="Location" value={`${biz.city}${biz.state ? `, ${biz.state}` : ''}`} />
            <ReviewField label="Website" value={biz.website} />
            <ReviewField label="Services" value={biz.services.join(', ') || 'None specified'} />
          </div>
        </ReviewSection>

        {/* Brand Identity */}
        <ReviewSection icon={Palette} title="Brand Identity">
          <div className="flex gap-2 mb-2">
            {brand.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: c.hex }} />
                <span className="text-xs text-soft-gray">{c.name}</span>
              </div>
            ))}
          </div>
          {brand.visualStyle && (
            <p className="text-sm text-soft-gray">{brand.visualStyle}</p>
          )}
        </ReviewSection>

        {/* Brand Voice */}
        <ReviewSection icon={MessageSquare} title="Brand Voice">
          {voice.tone.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {voice.tone.map((t) => (
                <span key={t} className="px-2 py-0.5 text-xs bg-dusty-rose/10 text-dusty-rose rounded-full capitalize">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6">
            <ReviewField label="Emojis" value={voice.emojis} />
            <ReviewField label="Voice samples" value={`${voice.samplePosts.length} provided`} />
          </div>
        </ReviewSection>

        {/* Compliance */}
        <ReviewSection icon={ShieldCheck} title="Compliance">
          <div className="grid grid-cols-2 gap-x-6">
            <ReviewField
              label="Industry"
              value={compliance.industry.replace('_', ' ')}
            />
            <ReviewField
              label="Rules"
              value={`${compliance.bannedPhrases.length} phrases, ${compliance.bannedWords.length} words banned`}
            />
            <ReviewField
              label="Media review"
              value={compliance.requiresMediaReview ? 'Required' : 'Not required'}
            />
          </div>
        </ReviewSection>

        {/* Platforms */}
        <ReviewSection icon={Share2} title="Platforms">
          <div className="flex gap-4">
            {enabledPlatforms.map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <Check size={14} className="text-green-500" />
                <span className="text-sm text-charcoal capitalize">{p}</span>
                <span className="text-xs text-soft-gray">
                  {platforms.defaultSchedule[p]} ET
                </span>
              </div>
            ))}
          </div>
        </ReviewSection>
      </div>
    </div>
  );
}

function ReviewSection({ icon: Icon, title, children }: {
  icon: typeof Building2; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border border-warm-beige/30">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-dusty-rose" />
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <span className="text-xs text-soft-gray">{label}: </span>
      <span className="text-sm text-charcoal">{value || '—'}</span>
    </div>
  );
}
