export interface ClientProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  onboardingComplete: boolean;
  accountType: 'individual' | 'agency';

  // Step 1: Business Info
  business: BusinessInfo;

  // Step 2: Brand Identity
  brand: BrandIdentity;

  // Step 3: Brand Voice
  voice: BrandVoice;

  // Step 4: Compliance
  compliance: ComplianceConfig;

  // Step 5: Platform Setup
  platforms: PlatformSetup;
}

export interface BusinessInfo {
  name: string;
  ownerName: string;
  ownerTitle: string; // e.g., "PAC", "MD", "NP", "RN", "Esthetician", "Owner"
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  rating: string; // e.g., "5.0 stars (118 reviews)"
  services: string[]; // e.g., ["Botox", "Dermal Fillers", "Chemical Peels"]
  targetAudience: string;
  positioning: string; // unique value proposition
}

export interface BrandIdentity {
  colors: BrandColor[];
  visualStyle: string; // free-text description of visual aesthetic
  photographyNotes: string; // what to capture, what to avoid
  logoUrl?: string;
}

export interface BrandColor {
  name: string;
  hex: string;
  usage: string; // e.g., "Primary accent", "Backgrounds"
}

export interface BrandVoice {
  tone: string[]; // e.g., ["warm", "sophisticated", "confident"]
  writingStyle: string; // free-text writing style description
  doList: string[]; // things to do in copy
  dontList: string[]; // things to avoid in copy
  samplePosts: SamplePost[];
  emojis: 'none' | 'sparingly' | 'frequently';
  hashtagStyle: string; // e.g., "Up to 5, mix of branded + niche"
  ctaStyle: string; // preferred call-to-action approach
}

export interface SamplePost {
  platform: 'instagram' | 'tiktok' | 'facebook' | 'linkedin';
  text: string;
}

export interface ComplianceConfig {
  industry: 'medical_spa' | 'dental' | 'wellness' | 'beauty' | 'fitness' | 'other';
  bannedPhrases: string[];
  bannedWords: string[];
  disclaimerText?: string; // optional legal disclaimer to append
  requiresMediaReview: boolean; // before/after photos need consent verification
}

export interface PlatformSetup {
  instagram: PlatformAccount;
  tiktok: PlatformAccount;
  facebook: PlatformAccount;
  linkedin: PlatformAccount;
  defaultSchedule: Record<string, string>; // platform -> time in ET
  timezone: string;
}

export interface PlatformAccount {
  enabled: boolean;
  accountId?: string;
  pageId?: string; // for Facebook/LinkedIn
  handle?: string;
  notes?: string;
}

// Agency-level types
export interface AgencyProfile {
  id: string;
  name: string;
  clients: ClientProfile[];
  activeClientId: string | null;
}

// Onboarding wizard state
export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  accountType: 'individual' | 'agency' | null;
  draft: Partial<ClientProfile>;
}

// Industry presets for compliance
export const INDUSTRY_PRESETS: Record<string, ComplianceConfig> = {
  medical_spa: {
    industry: 'medical_spa',
    bannedPhrases: [
      'guaranteed results',
      'permanent results',
      'risk free',
      'risk-free',
      'no side effects',
      '100% safe',
      'miracle cure',
      'instant results',
      'pain free guaranteed',
      'no downtime guaranteed',
    ],
    bannedWords: [
      'cure',
      'cures',
      'permanent',
      'miracle',
      'anti-aging',
      'antiaging',
    ],
    requiresMediaReview: true,
  },
  dental: {
    industry: 'dental',
    bannedPhrases: [
      'guaranteed results',
      'permanent whitening',
      'risk free',
      'no side effects',
      '100% safe',
      'instant results',
      'pain free guaranteed',
    ],
    bannedWords: [
      'cure',
      'cures',
      'permanent',
      'miracle',
    ],
    requiresMediaReview: true,
  },
  wellness: {
    industry: 'wellness',
    bannedPhrases: [
      'guaranteed results',
      'cure any disease',
      'miracle cure',
      'FDA approved',
      'clinically proven',
    ],
    bannedWords: [
      'cure',
      'cures',
      'diagnose',
      'miracle',
    ],
    requiresMediaReview: false,
  },
  beauty: {
    industry: 'beauty',
    bannedPhrases: [
      'guaranteed results',
      'permanent results',
    ],
    bannedWords: [],
    requiresMediaReview: false,
  },
  fitness: {
    industry: 'fitness',
    bannedPhrases: [
      'guaranteed results',
      'lose X pounds in X days',
      'miracle weight loss',
    ],
    bannedWords: [
      'cure',
      'miracle',
    ],
    requiresMediaReview: false,
  },
  other: {
    industry: 'other',
    bannedPhrases: [],
    bannedWords: [],
    requiresMediaReview: false,
  },
};
