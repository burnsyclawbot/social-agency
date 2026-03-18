import { useState } from 'react';
import type { ClientProfile } from '../../types/client';
import AccountTypeStep from './steps/AccountTypeStep';
import BusinessInfoStep from './steps/BusinessInfoStep';
import BrandIdentityStep from './steps/BrandIdentityStep';
import BrandVoiceStep from './steps/BrandVoiceStep';
import ComplianceStep from './steps/ComplianceStep';
import PlatformSetupStep from './steps/PlatformSetupStep';
import ReviewStep from './steps/ReviewStep';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  { label: 'Account Type', component: AccountTypeStep },
  { label: 'Business Info', component: BusinessInfoStep },
  { label: 'Brand Identity', component: BrandIdentityStep },
  { label: 'Brand Voice', component: BrandVoiceStep },
  { label: 'Compliance', component: ComplianceStep },
  { label: 'Platforms', component: PlatformSetupStep },
  { label: 'Review', component: ReviewStep },
];

interface OnboardingWizardProps {
  onComplete: (client: ClientProfile) => void;
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

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<ClientProfile>>(EMPTY_DRAFT);

  const updateDraft = (updates: Partial<ClientProfile>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const StepComponent = STEPS[step].component;

  const handleComplete = () => {
    const now = new Date().toISOString();
    const client: ClientProfile = {
      ...(draft as ClientProfile),
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      onboardingComplete: true,
    };
    onComplete(client);
  };

  const canProceed = step < STEPS.length - 1;
  const canGoBack = step > 0;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b border-warm-beige/50 px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-display text-xl sm:text-2xl text-charcoal">Set Up Your Account</h1>
            <span className="text-sm text-soft-gray">
              {step + 1}/{STEPS.length}
            </span>
          </div>
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-dusty-rose' : 'bg-warm-beige/50'
                }`}
              />
            ))}
          </div>
          <div className="hidden sm:flex justify-between mt-2">
            {STEPS.map((s, i) => (
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
          <p className="sm:hidden text-xs text-dusty-rose font-medium mt-2">{STEPS[step].label}</p>
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
              className="flex items-center gap-2 px-6 py-2.5 text-sm bg-dusty-rose text-white rounded-lg font-medium hover:bg-dusty-rose/90 transition-colors"
            >
              <Check size={16} />
              Complete Setup
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
      </div>
    </div>
  );
}
