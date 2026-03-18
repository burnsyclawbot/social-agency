import { useState } from 'react';
import type { ClientProfile, ComplianceConfig } from '../../../types/client';
import { INDUSTRY_PRESETS } from '../../../types/client';
import { Plus, X, ShieldCheck } from 'lucide-react';

interface StepProps {
  draft: Partial<ClientProfile>;
  updateDraft: (updates: Partial<ClientProfile>) => void;
}

const INDUSTRY_LABELS: Record<string, string> = {
  medical_spa: 'Medical Spa / Aesthetics',
  dental: 'Dental Practice',
  wellness: 'Wellness / Holistic',
  beauty: 'Beauty / Salon',
  fitness: 'Fitness / Gym',
  other: 'Other',
};

export default function ComplianceStep({ draft, updateDraft }: StepProps) {
  const compliance = draft.compliance!;
  const [phraseInput, setPhraseInput] = useState('');
  const [wordInput, setWordInput] = useState('');

  const updateCompliance = (updates: Partial<ComplianceConfig>) => {
    updateDraft({ compliance: { ...compliance, ...updates } });
  };

  const selectIndustry = (industry: string) => {
    const preset = INDUSTRY_PRESETS[industry];
    if (preset) {
      updateDraft({ compliance: { ...preset } });
    }
  };

  const addPhrase = (phrase: string) => {
    if (phrase && !compliance.bannedPhrases.includes(phrase.toLowerCase())) {
      updateCompliance({ bannedPhrases: [...compliance.bannedPhrases, phrase.toLowerCase()] });
    }
    setPhraseInput('');
  };

  const addWord = (word: string) => {
    if (word && !compliance.bannedWords.includes(word.toLowerCase())) {
      updateCompliance({ bannedWords: [...compliance.bannedWords, word.toLowerCase()] });
    }
    setWordInput('');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">Compliance & Content Safety</h2>
      <p className="text-soft-gray text-sm mb-8">
        Set up guardrails to prevent regulated language from appearing in your posts. These are checked in real-time before anything is published.
      </p>

      <div className="space-y-8">
        {/* Industry selector */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-3">Industry</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(INDUSTRY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => selectIndustry(key)}
                className={`px-4 py-2.5 text-sm rounded-lg border transition-colors ${
                  compliance.industry === key
                    ? 'bg-dusty-rose text-white border-dusty-rose'
                    : 'border-warm-beige/50 text-soft-gray hover:border-dusty-rose/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-soft-gray mt-2">
            Selecting an industry loads recommended compliance rules. You can customize them below.
          </p>
        </div>

        {/* Preset notice */}
        {compliance.bannedPhrases.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <ShieldCheck size={20} className="text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {compliance.bannedPhrases.length + compliance.bannedWords.length} compliance rules active
              </p>
              <p className="text-xs text-green-700 mt-1">
                Posts are automatically checked against these rules before publishing. Any violations are flagged for correction.
              </p>
            </div>
          </div>
        )}

        {/* Banned phrases */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Banned Phrases</label>
          <p className="text-xs text-soft-gray mb-3">
            These exact phrases will be blocked from all posts. Case-insensitive.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {compliance.bannedPhrases.map((phrase) => (
              <span key={phrase} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-200">
                "{phrase}"
                <button onClick={() => updateCompliance({ bannedPhrases: compliance.bannedPhrases.filter((p) => p !== phrase) })} className="hover:text-red-900">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhrase(phraseInput); } }}
              placeholder="Add a banned phrase..."
              className="flex-1 px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
            />
            <button onClick={() => addPhrase(phraseInput)} className="px-4 py-2 text-sm bg-charcoal text-white rounded-lg hover:bg-charcoal/90">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Banned words */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Banned Words</label>
          <p className="text-xs text-soft-gray mb-3">
            Individual words blocked with word-boundary matching (won't match inside other words).
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {compliance.bannedWords.map((word) => (
              <span key={word} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-200">
                {word}
                <button onClick={() => updateCompliance({ bannedWords: compliance.bannedWords.filter((w) => w !== word) })} className="hover:text-red-900">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWord(wordInput); } }}
              placeholder="Add a banned word..."
              className="flex-1 px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
            />
            <button onClick={() => addWord(wordInput)} className="px-4 py-2 text-sm bg-charcoal text-white rounded-lg hover:bg-charcoal/90">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Media review toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-warm-beige/30">
          <div>
            <p className="text-sm font-medium text-charcoal">Require media review before publishing</p>
            <p className="text-xs text-soft-gray mt-1">
              Before/after photos and patient content require consent verification
            </p>
          </div>
          <button
            onClick={() => updateCompliance({ requiresMediaReview: !compliance.requiresMediaReview })}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              compliance.requiresMediaReview ? 'bg-dusty-rose' : 'bg-warm-beige'
            }`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              compliance.requiresMediaReview ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>

        {/* Optional disclaimer */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            Legal Disclaimer <span className="text-soft-gray font-normal">(optional)</span>
          </label>
          <textarea
            value={compliance.disclaimerText || ''}
            onChange={(e) => updateCompliance({ disclaimerText: e.target.value })}
            placeholder="Optional text appended to posts when required. e.g., 'Individual results may vary. Consult with a qualified provider.'"
            rows={2}
            className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
