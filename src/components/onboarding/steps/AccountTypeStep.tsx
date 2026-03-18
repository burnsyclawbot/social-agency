import type { ClientProfile } from '../../../types/client';
import { Building2, User } from 'lucide-react';

interface StepProps {
  draft: Partial<ClientProfile>;
  updateDraft: (updates: Partial<ClientProfile>) => void;
}

export default function AccountTypeStep({ draft, updateDraft }: StepProps) {
  const selected = draft.accountType;

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">
        How will you use this platform?
      </h2>
      <p className="text-soft-gray text-sm mb-8">
        Choose the option that best describes your setup. You can always add more clients later.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => updateDraft({ accountType: 'individual' })}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            selected === 'individual'
              ? 'border-dusty-rose bg-dusty-rose/5'
              : 'border-warm-beige/50 bg-white hover:border-dusty-rose/30'
          }`}
        >
          <User size={28} className={selected === 'individual' ? 'text-dusty-rose' : 'text-soft-gray'} />
          <h3 className="text-lg font-semibold text-charcoal mt-3">Individual Practice</h3>
          <p className="text-sm text-soft-gray mt-2">
            I manage social media for a single med spa, clinic, or practice.
          </p>
        </button>

        <button
          onClick={() => updateDraft({ accountType: 'agency' })}
          className={`p-6 rounded-xl border-2 text-left transition-all ${
            selected === 'agency'
              ? 'border-dusty-rose bg-dusty-rose/5'
              : 'border-warm-beige/50 bg-white hover:border-dusty-rose/30'
          }`}
        >
          <Building2 size={28} className={selected === 'agency' ? 'text-dusty-rose' : 'text-soft-gray'} />
          <h3 className="text-lg font-semibold text-charcoal mt-3">Agency</h3>
          <p className="text-sm text-soft-gray mt-2">
            I manage social media for multiple clients across different practices.
          </p>
        </button>
      </div>
    </div>
  );
}
