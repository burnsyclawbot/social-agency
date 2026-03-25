import { useState, useMemo } from 'react';
import type { ClientProfile } from '../../types/client';
import AccountTypeStep from './steps/AccountTypeStep';
import BusinessInfoStep from './steps/BusinessInfoStep';
import BrandIdentityStep from './steps/BrandIdentityStep';
import BrandVoiceStep from './steps/BrandVoiceStep';
import ComplianceStep from './steps/ComplianceStep';
import PlatformSetupStep from './steps/PlatformSetupStep';
import ReviewStep from './steps/ReviewStep';
import { ChevronLeft, ChevronRight, Check, LogOut, X } from 'lucide-react';
import { APP_VERSION } from '../../constants/version';

const ALL_STEPS = [
  { label: 'Account Type', component: AccountTypeStep, key: 'accountType' },
  { label: 'Business Info', component: BusinessInfoStep, key: 'business' },
  { label: 'Brand Identity', component: BrandIdentityStep, key: 'brand' },
  { label: 'Brand Voice', component: BrandVoiceStep, key: 'voice' },
  { label: 'Compliance', component: ComplianceStep, key: 'compliance' },
  { label: 'Platforms', component: PlatformSetupStep, key: 'platforms' },
  { label: 'Review', component: ReviewStep, key: 'review' },
];

interface OnboardingWizardProps {
  onComplete: (client: ClientProfile) => void | Promise<void>;
  onCancel?: () => void;
  userName?: string;
  onLogout?: () => void;
  /** When true, skip account type step (adding client to existing agency) */
  isAddingClient?: boolean;
}

function generateId() {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY_DRAFT: Partial<ClientProfile> = {
  accountType: null as unknown as 'individual' | 'agency',
  business: {
    name: '',
    ownerName: '',
    ownerTitle: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    website: '',
    rating: '',
    services: [],
    targetAudience: '',
    positioning: '',
  },
  brand: {
    colors: [
      { name: 'Primary', hex: '#c79ea6', usage: 'Primary accent' },
      { name: 'Secondary', hex: '#dbcab6', usage: 'Secondary accent' },
      { name: 'Background', hex: '#f5f0eb', usage: 'Backgrounds' },
    ],
    visualStyle: '',
    photographyNotes: '',
  },
  voice: {
    tone: [],
    writingStyle: '',
    doList: [],
    dontList: [],
    samplePosts: [],
    emojis: 'sparingly',
    hashtagStyle: '',
    ctaStyle: '',
  },
  compliance: {
    industry: 'medical_spa',
    bannedPhrases: [],
    bannedWords: [],
    requiresMediaReview: true,
  },
  platforms: {
    instagram: { enabled: true },
    tiktok: { enabled: true },
    facebook: { enabled: true },
    linkedin: { enabled: true },
    defaultSchedule: {
      linkedin: '07:30',
      instagram: '09:00',
      tiktok: '11:00',
      facebook: '12:00',
    },
    timezone: 'US/Eastern',
  },
};

export default function OnboardingWizard({ onComplete, onCancel, userName, onLogout, isAddingClient }: OnboardingWizardProps) {
  const steps = useMemo(() => {
    if (isAddingClient) {
      return ALL_STEPS.filter((s) => s.key !== 'accountType');
    }
    return ALL_STEPS;
  }, [isAddingClient]);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<ClientProfile>>(() => {
    if (isAddingClient) {
      return { ...EMPTY_DRAFT, accountType: 'agency' };
    }
    return EMPTY_DRAFT;
  });

  const updateDraft = (updates: Partial<ClientProfile>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const StepComponent = steps[step].component;

  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const client: ClientProfile = {
      ...(draft as ClientProfile),
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      onboardingComplete: true,
    };
    await onComplete(client);
    setSaving(false);
  };

  const canProceed = step < steps.length - 1;
  const canGoBack = step > 0;
  const isLastStep = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b border-warm-beige/50 px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl sm:text-2xl text-charcoal">
              {isAddingClient ? 'Add New Client' : 'Set Up Your Account'}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-soft-gray">
                {step + 1}/{steps.length}
              </span>
              {isAddingClient && onCancel && (
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-soft-gray hover:text-charcoal hover:bg-off-white rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              )}
              {userName && onLogout && !isAddingClient && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-soft-gray hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <div
                key={s.label}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-dusty-rose' : 'bg-warm-beige/50'
                }`}
              />
            ))}
          </div>
          <div className="hidden sm:flex justify-between mt-2">
            {steps.map((s, i) => (
              <span
                key={s.label}
                className={`text-xs ${
                  i === step ? 'text-dusty-rose font-medium' : 'text-soft-gray/60'
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
          <p className="sm:hidden text-xs text-dusty-rose font-medium mt-2">{steps[step].label}</p>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 sm:px-8 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto">
          <StepComponent draft={draft} updateDraft={updateDraft} />
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-warm-beige/50 px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto flex justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={!canGoBack}
            className="flex items-center gap-2 px-5 py-2.5 text-sm text-soft-gray hover:text-charcoal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {isLastStep ? (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm bg-dusty-rose text-white rounded-lg font-medium hover:bg-dusty-rose/90 disabled:opacity-50 transition-colors"
            >
              <Check size={16} />
              {saving ? 'Saving...' : isAddingClient ? 'Add Client' : 'Complete Setup'}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="flex items-center gap-2 px-6 py-2.5 text-sm bg-charcoal text-white rounded-lg font-medium hover:bg-charcoal/90 disabled:opacity-50 transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <p className="text-center text-xs text-soft-gray/60 mt-2">v{APP_VERSION}</p>
      </div>
    </div>
  );
}
