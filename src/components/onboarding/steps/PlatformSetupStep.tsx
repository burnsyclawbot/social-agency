import type { ClientProfile, PlatformSetup, PlatformAccount } from '../../../types/client';
import type { Platform } from '../../../types';
import PlatformIcon from '../../shared/PlatformIcon';

interface StepProps {
  draft: Partial<ClientProfile>;
  updateDraft: (updates: Partial<ClientProfile>) => void;
}

const PLATFORM_INFO: Record<Platform, { label: string; description: string }> = {
  instagram: { label: 'Instagram', description: 'Photos, Reels, carousels. Requires media on every post.' },
  tiktok: { label: 'TikTok', description: 'Short-form video. 9:16 vertical format.' },
  facebook: { label: 'Facebook', description: 'Business page posts. Requires pageId.' },
  linkedin: { label: 'LinkedIn', description: 'Professional content. Company page or personal.' },
};

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'facebook', 'linkedin'];

export default function PlatformSetupStep({ draft, updateDraft }: StepProps) {
  const platforms = draft.platforms!;

  const updatePlatforms = (updates: Partial<PlatformSetup>) => {
    updateDraft({ platforms: { ...platforms, ...updates } });
  };

  const updateAccount = (platform: Platform, updates: Partial<PlatformAccount>) => {
    updatePlatforms({
      [platform]: { ...platforms[platform], ...updates },
    });
  };

  const updateSchedule = (platform: string, time: string) => {
    updatePlatforms({
      defaultSchedule: { ...platforms.defaultSchedule, [platform]: time },
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">Platform Setup</h2>
      <p className="text-soft-gray text-sm mb-8">
        Choose which platforms to publish to and set your default posting schedule. You'll connect your Blotato accounts after setup.
      </p>

      <div className="space-y-4">
        {PLATFORMS.map((platform) => {
          const account = platforms[platform];
          const info = PLATFORM_INFO[platform];

          return (
            <div
              key={platform}
              className={`p-5 rounded-xl border transition-colors ${
                account.enabled
                  ? 'bg-white border-dusty-rose/30'
                  : 'bg-off-white/50 border-warm-beige/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={platform} size={22} />
                  <div>
                    <h3 className="text-sm font-semibold text-charcoal">{info.label}</h3>
                    <p className="text-xs text-soft-gray">{info.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateAccount(platform, { enabled: !account.enabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    account.enabled ? 'bg-dusty-rose' : 'bg-warm-beige'
                  }`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    account.enabled ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>

              {account.enabled && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-warm-beige/30">
                  <div>
                    <label className="block text-xs font-medium text-soft-gray mb-1">Handle / Page Name</label>
                    <input
                      type="text"
                      value={account.handle || ''}
                      onChange={(e) => updateAccount(platform, { handle: e.target.value })}
                      placeholder={`@${draft.business?.name?.toLowerCase().replace(/\s+/g, '_') || 'handle'}`}
                      className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-soft-gray mb-1">Default Post Time (ET)</label>
                    <input
                      type="time"
                      value={platforms.defaultSchedule[platform] || ''}
                      onChange={(e) => updateSchedule(platform, e.target.value)}
                      className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-warm-beige/20 rounded-lg">
        <p className="text-xs text-soft-gray">
          <strong className="text-charcoal">Note:</strong> After completing setup, you'll need to connect your social media accounts through Blotato to enable publishing. The platform will guide you through this process.
        </p>
      </div>
    </div>
  );
}
