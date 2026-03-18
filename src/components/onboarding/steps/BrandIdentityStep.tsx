import { useState } from 'react';
import type { ClientProfile, BrandColor } from '../../../types/client';
import { Plus, X, Palette } from 'lucide-react';

interface StepProps {
  draft: Partial<ClientProfile>;
  updateDraft: (updates: Partial<ClientProfile>) => void;
}

const SUGGESTED_PALETTES = [
  {
    name: 'Luxury Med Spa',
    colors: [
      { name: 'Dusty Rose', hex: '#c79ea6', usage: 'Primary accent' },
      { name: 'Warm Beige', hex: '#dbcab6', usage: 'Secondary accent' },
      { name: 'Off-White', hex: '#f5f0eb', usage: 'Backgrounds' },
    ],
  },
  {
    name: 'Modern Clinical',
    colors: [
      { name: 'Teal', hex: '#2d8a8a', usage: 'Primary accent' },
      { name: 'Light Gray', hex: '#e8ecef', usage: 'Secondary accent' },
      { name: 'White', hex: '#ffffff', usage: 'Backgrounds' },
    ],
  },
  {
    name: 'Warm Earth',
    colors: [
      { name: 'Terracotta', hex: '#c4704b', usage: 'Primary accent' },
      { name: 'Sand', hex: '#d4c5a9', usage: 'Secondary accent' },
      { name: 'Cream', hex: '#faf5ef', usage: 'Backgrounds' },
    ],
  },
  {
    name: 'Bold & Clean',
    colors: [
      { name: 'Navy', hex: '#1a2744', usage: 'Primary accent' },
      { name: 'Gold', hex: '#c9a84c', usage: 'Secondary accent' },
      { name: 'Light', hex: '#f7f6f3', usage: 'Backgrounds' },
    ],
  },
];

export default function BrandIdentityStep({ draft, updateDraft }: StepProps) {
  const brand = draft.brand!;
  const [showColorPicker, setShowColorPicker] = useState(false);

  const updateBrand = (updates: Partial<typeof brand>) => {
    updateDraft({ brand: { ...brand, ...updates } });
  };

  const updateColor = (index: number, updates: Partial<BrandColor>) => {
    const newColors = [...brand.colors];
    newColors[index] = { ...newColors[index], ...updates };
    updateBrand({ colors: newColors });
  };

  const addColor = () => {
    updateBrand({
      colors: [...brand.colors, { name: '', hex: '#888888', usage: '' }],
    });
  };

  const removeColor = (index: number) => {
    updateBrand({ colors: brand.colors.filter((_, i) => i !== index) });
  };

  const applyPalette = (palette: typeof SUGGESTED_PALETTES[0]) => {
    updateBrand({ colors: [...palette.colors] });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">Brand Identity</h2>
      <p className="text-soft-gray text-sm mb-8">
        Define your visual brand so generated content matches your aesthetic.
      </p>

      <div className="space-y-8">
        {/* Color palette */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-charcoal">Brand Colors</label>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="text-xs text-dusty-rose hover:text-dusty-rose/80 flex items-center gap-1"
            >
              <Palette size={14} />
              Use a preset palette
            </button>
          </div>

          {showColorPicker && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SUGGESTED_PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() => { applyPalette(p); setShowColorPicker(false); }}
                  className="flex items-center gap-3 p-3 border border-warm-beige/50 rounded-lg hover:border-dusty-rose/30 transition-colors bg-white"
                >
                  <div className="flex -space-x-1">
                    {p.colors.map((c) => (
                      <div
                        key={c.hex}
                        className="w-6 h-6 rounded-full border-2 border-white"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-charcoal">{p.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {brand.colors.map((color, i) => (
              <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-warm-beige/30">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => updateColor(i, { hex: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={color.name}
                  onChange={(e) => updateColor(i, { name: e.target.value })}
                  placeholder="Color name"
                  className="flex-1 px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                />
                <input
                  type="text"
                  value={color.hex}
                  onChange={(e) => updateColor(i, { hex: e.target.value })}
                  placeholder="#hex"
                  className="w-24 px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal font-mono focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                />
                <input
                  type="text"
                  value={color.usage}
                  onChange={(e) => updateColor(i, { usage: e.target.value })}
                  placeholder="Usage (e.g., Primary accent)"
                  className="flex-1 px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                />
                {brand.colors.length > 1 && (
                  <button onClick={() => removeColor(i)} className="text-soft-gray hover:text-red-500">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addColor}
            className="mt-3 flex items-center gap-1.5 text-sm text-dusty-rose hover:text-dusty-rose/80"
          >
            <Plus size={14} />
            Add color
          </button>
        </div>

        {/* Visual style */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">Visual Style</label>
          <textarea
            value={brand.visualStyle}
            onChange={(e) => updateBrand({ visualStyle: e.target.value })}
            placeholder="Describe the overall visual feel. e.g., 'Bright, clean, airy aesthetic. Soft natural lighting. Warm tones (rose, beige, cream). Lifestyle-oriented imagery, not clinical.'"
            rows={3}
            className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 resize-none"
          />
        </div>

        {/* Photography notes */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">Photography & Content Notes</label>
          <textarea
            value={brand.photographyNotes}
            onChange={(e) => updateBrand({ photographyNotes: e.target.value })}
            placeholder="What to capture and what to avoid. e.g., 'Before/after results photography. Treatment room and clinic interior shots. Avoid: harsh clinical lighting, stock photos, overly filtered images.'"
            rows={3}
            className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 resize-none"
          />
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl p-6 border border-warm-beige/30">
          <p className="text-xs text-soft-gray uppercase tracking-wider mb-3">Preview</p>
          <div className="flex gap-3 mb-4">
            {brand.colors.map((c, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-14 h-14 rounded-lg shadow-sm"
                  style={{ backgroundColor: c.hex }}
                />
                <p className="text-xs text-soft-gray mt-1">{c.name || 'Unnamed'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
