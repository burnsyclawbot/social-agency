import { useState } from 'react';
import type { ClientProfile, SamplePost } from '../../../types/client';
import { Plus, X } from 'lucide-react';
import type { Platform } from '../../../types';

interface StepProps {
  draft: Partial<ClientProfile>;
  updateDraft: (updates: Partial<ClientProfile>) => void;
}

const TONE_OPTIONS = [
  'Warm', 'Sophisticated', 'Confident', 'Playful', 'Professional',
  'Approachable', 'Authoritative', 'Luxurious', 'Educational', 'Empowering',
  'Casual', 'Elegant', 'Friendly', 'Bold',
];

const DO_SUGGESTIONS = [
  'Use "you" and "your" to make it personal',
  'Lead with patient experience and results',
  'Include location callouts for local SEO',
  'Use short paragraphs, scannable format',
  'Include clear calls to action',
  'Reference reviews and social proof',
  'Educate in accessible language',
];

const DONT_SUGGESTIONS = [
  'Make FDA-regulated medical claims',
  'Use discount language or urgency tactics',
  'Use ALL CAPS for emphasis',
  'Sound clinical or overly technical',
  'Be pushy or salesy',
  'Use stock/generic phrasing',
];

export default function BrandVoiceStep({ draft, updateDraft }: StepProps) {
  const voice = draft.voice!;
  const [doInput, setDoInput] = useState('');
  const [dontInput, setDontInput] = useState('');

  const updateVoice = (updates: Partial<typeof voice>) => {
    updateDraft({ voice: { ...voice, ...updates } });
  };

  const toggleTone = (tone: string) => {
    const lower = tone.toLowerCase();
    if (voice.tone.includes(lower)) {
      updateVoice({ tone: voice.tone.filter((t) => t !== lower) });
    } else {
      updateVoice({ tone: [...voice.tone, lower] });
    }
  };

  const addToList = (list: 'doList' | 'dontList', value: string) => {
    if (value && !voice[list].includes(value)) {
      updateVoice({ [list]: [...voice[list], value] });
    }
  };

  const removeFromList = (list: 'doList' | 'dontList', value: string) => {
    updateVoice({ [list]: voice[list].filter((v) => v !== value) });
  };

  const addSamplePost = () => {
    updateVoice({
      samplePosts: [...voice.samplePosts, { platform: 'instagram', text: '' }],
    });
  };

  const updateSamplePost = (index: number, updates: Partial<SamplePost>) => {
    const newSamples = [...voice.samplePosts];
    newSamples[index] = { ...newSamples[index], ...updates };
    updateVoice({ samplePosts: newSamples });
  };

  const removeSamplePost = (index: number) => {
    updateVoice({ samplePosts: voice.samplePosts.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">Brand Voice</h2>
      <p className="text-soft-gray text-sm mb-8">
        Define how your brand sounds. This shapes every piece of content the AI generates.
      </p>

      <div className="space-y-8">
        {/* Tone selection */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-3">
            Select your brand's tone (choose 3-5)
          </label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone}
                onClick={() => toggleTone(tone)}
                className={`px-3.5 py-1.5 text-sm rounded-full border transition-colors ${
                  voice.tone.includes(tone.toLowerCase())
                    ? 'bg-dusty-rose text-white border-dusty-rose'
                    : 'border-warm-beige/50 text-soft-gray hover:border-dusty-rose/30 hover:text-dusty-rose'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Writing style */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">Writing Style Description</label>
          <textarea
            value={voice.writingStyle}
            onChange={(e) => updateVoice({ writingStyle: e.target.value })}
            placeholder="Describe the overall writing style. e.g., 'Warm, sophisticated, and confident. Educational without being clinical. Aspirational without being pushy. Em dashes allowed. Emojis sparingly (1-3 per post).'"
            rows={3}
            className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 resize-none"
          />
        </div>

        {/* Do / Don't lists */}
        <div className="grid grid-cols-2 gap-6">
          <TagList
            label="Always Do"
            items={voice.doList}
            suggestions={DO_SUGGESTIONS.filter((s) => !voice.doList.includes(s))}
            inputValue={doInput}
            onInputChange={setDoInput}
            onAdd={(v) => { addToList('doList', v); setDoInput(''); }}
            onRemove={(v) => removeFromList('doList', v)}
            color="green"
          />
          <TagList
            label="Never Do"
            items={voice.dontList}
            suggestions={DONT_SUGGESTIONS.filter((s) => !voice.dontList.includes(s))}
            inputValue={dontInput}
            onInputChange={setDontInput}
            onAdd={(v) => { addToList('dontList', v); setDontInput(''); }}
            onRemove={(v) => removeFromList('dontList', v)}
            color="red"
          />
        </div>

        {/* Emoji preference */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-3">Emoji Usage</label>
          <div className="flex gap-3">
            {(['none', 'sparingly', 'frequently'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => updateVoice({ emojis: opt })}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  voice.emojis === opt
                    ? 'bg-dusty-rose text-white border-dusty-rose'
                    : 'border-warm-beige/50 text-soft-gray hover:border-dusty-rose/30'
                }`}
              >
                {opt === 'none' ? 'None' : opt === 'sparingly' ? 'Sparingly (1-3)' : 'Frequently'}
              </button>
            ))}
          </div>
        </div>

        {/* Hashtag + CTA style */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Hashtag Style</label>
            <input
              type="text"
              value={voice.hashtagStyle}
              onChange={(e) => updateVoice({ hashtagStyle: e.target.value })}
              placeholder="e.g., Up to 5, mix of branded + niche"
              className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">CTA Style</label>
            <input
              type="text"
              value={voice.ctaStyle}
              onChange={(e) => updateVoice({ ctaStyle: e.target.value })}
              placeholder="e.g., Soft CTAs — 'Link in bio' or 'Book a consultation'"
              className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
            />
          </div>
        </div>

        {/* Sample posts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-charcoal">
              Voice Samples <span className="text-soft-gray font-normal">(paste existing posts you love)</span>
            </label>
            <button onClick={addSamplePost} className="text-sm text-dusty-rose hover:text-dusty-rose/80 flex items-center gap-1">
              <Plus size={14} />
              Add sample
            </button>
          </div>

          {voice.samplePosts.length === 0 && (
            <p className="text-sm text-soft-gray italic">
              Adding 2-4 sample posts helps the AI match your exact voice. Paste your best-performing posts here.
            </p>
          )}

          <div className="space-y-3">
            {voice.samplePosts.map((sample, i) => (
              <div key={i} className="bg-white p-4 rounded-lg border border-warm-beige/30">
                <div className="flex items-center justify-between mb-2">
                  <select
                    value={sample.platform}
                    onChange={(e) => updateSamplePost(i, { platform: e.target.value as Platform })}
                    className="text-sm px-2 py-1 border border-warm-beige/50 rounded text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                  <button onClick={() => removeSamplePost(i)} className="text-soft-gray hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
                <textarea
                  value={sample.text}
                  onChange={(e) => updateSamplePost(i, { text: e.target.value })}
                  placeholder="Paste a sample post here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TagList({ label, items, suggestions, inputValue, onInputChange, onAdd, onRemove, color }: {
  label: string;
  items: string[];
  suggestions: string[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  color: 'green' | 'red';
}) {
  const tagColor = color === 'green'
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-red-50 text-red-700 border-red-200';

  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-2">{label}</label>
      <div className="space-y-2 mb-3">
        {items.map((item) => (
          <div key={item} className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-lg border ${tagColor}`}>
            <span>{item}</span>
            <button onClick={() => onRemove(item)} className="opacity-50 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(inputValue); } }}
        placeholder="Type and press Enter..."
        className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {suggestions.slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => onAdd(s)}
              className="text-xs px-2 py-1 border border-warm-beige/50 rounded-full text-soft-gray hover:text-dusty-rose hover:border-dusty-rose/30 transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
