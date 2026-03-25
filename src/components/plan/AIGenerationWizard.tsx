import { useState } from 'react';
import type { ShotList } from '../../types';
import type { ReferencePhoto } from '../../types/client';
import { Wand2, Loader2, RefreshCw, Check, X, ChevronLeft, ChevronRight, User, Package, Upload, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';

type ImageStyle = 'photorealistic' | 'editorial' | 'minimalist' | 'warm-lifestyle' | 'clinical-clean' | 'bold-modern';
type AspectRatio = 'square' | 'portrait' | 'landscape';
type Engine = 'flux' | 'dalle' | 'kontext';

const ENGINES: { key: Engine; label: string; description: string }[] = [
  { key: 'flux', label: 'Flux Pro', description: 'Best for people, portraits, lifestyle — most realistic' },
  { key: 'kontext', label: 'Character Match', description: 'Uses reference photos to match a real person\'s likeness' },
  { key: 'dalle', label: 'DALL-E 3', description: 'Best for products, flat lays, creative/artistic shots' },
];

const STYLE_PRESETS: { key: ImageStyle; label: string; description: string; promptPrefix: string }[] = [
  {
    key: 'photorealistic',
    label: 'Photorealistic',
    description: 'Looks like a real photograph taken with a professional camera',
    promptPrefix: 'Ultra-realistic photograph, shot on a Canon EOS R5 with a 50mm f/1.4 lens. Natural depth of field, authentic skin textures, realistic ambient lighting with no AI artifacts. The image should be indistinguishable from a real photograph.',
  },
  {
    key: 'editorial',
    label: 'Editorial',
    description: 'High-fashion magazine quality, polished but natural',
    promptPrefix: 'Editorial-style photograph as seen in Vogue or Harper\'s Bazaar. Shot on medium format Hasselblad, natural retouching, authentic skin detail, elegant composition. Professional fashion photography with realistic lighting and subtle color grading.',
  },
  {
    key: 'warm-lifestyle',
    label: 'Warm Lifestyle',
    description: 'Cozy, inviting, golden-hour feel',
    promptPrefix: 'Lifestyle photograph with warm golden-hour lighting, shot on Sony A7IV. Natural warm tones, soft bokeh background, candid feel with professional composition. Real skin textures, authentic expressions, no over-processing.',
  },
  {
    key: 'minimalist',
    label: 'Minimalist',
    description: 'Clean, simple, lots of white space',
    promptPrefix: 'Minimalist photograph with clean composition and abundant negative space. Bright, airy lighting against white or neutral backgrounds. Simple and elegant, shot in a modern studio with soft diffused light. Real textures and materials.',
  },
  {
    key: 'clinical-clean',
    label: 'Clinical Clean',
    description: 'Professional medical aesthetic, bright and trustworthy',
    promptPrefix: 'Professional medical aesthetic photograph, bright clinical lighting with warm undertones. Clean, modern treatment room setting. Trustworthy and approachable feel. Shot with professional studio lighting, real textures, authentic materials.',
  },
  {
    key: 'bold-modern',
    label: 'Bold & Modern',
    description: 'Strong colors, contemporary, attention-grabbing',
    promptPrefix: 'Bold contemporary photograph with strong color palette and dynamic composition. Modern aesthetic with confident styling. Shot on professional camera with intentional color grading, real textures and materials, no AI-looking artifacts.',
  },
];

const ASPECT_RATIOS: { key: AspectRatio; label: string; description: string }[] = [
  { key: 'square', label: '1:1', description: 'Instagram Feed' },
  { key: 'portrait', label: '9:16', description: 'Reels / TikTok / Stories' },
  { key: 'landscape', label: '16:9', description: 'Facebook / LinkedIn' },
];

interface AIGenerationWizardProps {
  shotList: ShotList;
  dayNumber: number;
  clientId: string;
  referencePhotos?: ReferencePhoto[];
  onAccept: (imageUrl: string, displayName: string) => void;
  onClose: () => void;
}

export default function AIGenerationWizard({ shotList, dayNumber, clientId, referencePhotos = [], onAccept, onClose }: AIGenerationWizardProps) {
  const [engine, setEngine] = useState<Engine>('flux');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('photorealistic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');
  const [prompt, setPrompt] = useState(() => buildPrompt(shotList, 'photorealistic'));
  const [selectedRefPhotos, setSelectedRefPhotos] = useState<string[]>([]);
  const [productImage, setProductImage] = useState<{ url: string; name: string } | null>(null);
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [accepting, setAccepting] = useState(false);

  const handleStyleChange = (style: ImageStyle) => {
    setSelectedStyle(style);
    setPrompt(buildPrompt(shotList, style));
  };

  const handleProductUpload = async (file: File) => {
    setUploadingProduct(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const token = localStorage.getItem('spa_social_token');
      const resp = await fetch('/api/media/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        throw new Error(errData?.error || 'Upload failed');
      }
      const data = await resp.json() as { uploaded: { url: string; name: string }[] };
      setProductImage({ url: data.uploaded[0].url, name: file.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload product image');
    } finally {
      setUploadingProduct(false);
    }
  };

  const maxRefPhotos = productImage ? 3 : 4;

  const kontextMissingPhotos = engine === 'kontext' && selectedRefPhotos.length === 0 && !productImage;

  // Determine the actual engine to use — if product image is set with Flux, auto-upgrade to Kontext
  const needsKontext = productImage || engine === 'kontext';
  const effectiveEngine = needsKontext ? 'kontext' : engine;

  const handleGenerate = async () => {
    if (engine === 'kontext' && selectedRefPhotos.length === 0 && !productImage) {
      setError('Please select at least one reference photo before generating. Character Match needs a photo to match the person\'s likeness.');
      return;
    }
    if (effectiveEngine === 'kontext' && selectedRefPhotos.length === 0 && !productImage) {
      setError('A product image or reference photo is required for this generation.');
      return;
    }
    setGenerating(true);
    setError(null);

    try {
      // Gather person reference URLs (if any selected)
      const personUrls = selectedRefPhotos
        .map((id) => referencePhotos.find((p) => p.id === id)?.url)
        .filter(Boolean) as string[];

      // Combine person + product image URLs for Kontext
      const refUrls = effectiveEngine === 'kontext'
        ? [...personUrls, ...(productImage ? [productImage.url] : [])]
        : undefined;

      const finalPrompt = productImage
        ? `${prompt}\n\nIMPORTANT: Include the product shown in the reference images naturally in the scene — the person should be holding, applying, or displaying the product.`
        : prompt;

      const data = await apiFetch<{ imageUrl: string }>('/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify({
          prompt: finalPrompt,
          clientId,
          dayNumber,
          engine: effectiveEngine,
          imageStyle: selectedStyle === 'bold-modern' ? 'vivid' : 'natural',
          aspectRatio,
          referenceImageUrls: refUrls,
        }),
      });

      setGeneratedUrl(data.imageUrl);
      setHistory((prev) => [...prev, data.imageUrl]);
      setHistoryIndex(history.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!generatedUrl) return;
    setAccepting(true);
    try {
      const data = await apiFetch<{ url: string }>('/ai/save-generated', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: generatedUrl, clientId, dayNumber }),
      });
      const displayName = `day${dayNumber}-ai-${selectedStyle}.png`;
      onAccept(data.url, displayName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save image');
    } finally {
      setAccepting(false);
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateHistory = (dir: -1 | 1) => {
    const newIdx = historyIndex + dir;
    if (newIdx >= 0 && newIdx < history.length) {
      setHistoryIndex(newIdx);
      setGeneratedUrl(history[newIdx]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-beige/30">
          <div className="flex items-center gap-2">
            <Wand2 size={18} className="text-purple-600" />
            <h3 className="text-lg font-semibold text-charcoal">AI Image Generator — Day {dayNumber}</h3>
          </div>
          <button onClick={onClose} className="text-soft-gray hover:text-charcoal">
            <X size={20} />
          </button>
        </div>

        {/* Shot context */}
        <div className="px-6 py-3 bg-purple-50/50 border-b border-purple-100/50">
          <p className="text-xs text-purple-700">
            <span className="font-medium">Shot:</span> {shotList.contentType} — {shotList.subject}
          </p>
          <p className="text-xs text-purple-600 mt-0.5">
            {shotList.setting} | {shotList.lighting} | {shotList.platformFormat}
          </p>
        </div>

        {/* Engine selector */}
        <div className="px-6 py-4 border-b border-warm-beige/20">
          <label className="block text-sm font-medium text-charcoal mb-2">AI Engine</label>
          <div className="flex gap-2">
            {ENGINES.map((eng) => (
              <button
                key={eng.key}
                onClick={() => setEngine(eng.key)}
                className={`flex-1 text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  engine === eng.key
                    ? 'border-purple-400 bg-purple-50 text-purple-800'
                    : 'border-warm-beige/30 bg-white text-charcoal hover:bg-off-white'
                }`}
              >
                <span className="font-medium block">{eng.label}</span>
                <span className="text-xs text-soft-gray leading-tight block mt-0.5">{eng.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reference photo picker (Kontext only) */}
        {engine === 'kontext' && (
          <div className="px-6 py-4 border-b border-warm-beige/20">
            <label className="block text-sm font-medium text-charcoal mb-2">
              Reference Photos <span className="text-xs text-soft-gray font-normal">(select 1–{maxRefPhotos} photos to match{productImage ? ' — 1 slot reserved for product' : ''})</span>
            </label>
            {referencePhotos.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <User size={20} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  No reference photos uploaded. Go to <span className="font-medium">Settings → Reference Photos</span> to upload photos first.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {referencePhotos.map((photo) => {
                  const isSelected = selectedRefPhotos.includes(photo.id);
                  return (
                    <button
                      key={photo.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedRefPhotos((prev) => prev.filter((id) => id !== photo.id));
                        } else if (selectedRefPhotos.length < maxRefPhotos) {
                          setSelectedRefPhotos((prev) => [...prev, photo.id]);
                        }
                      }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-200'
                          : 'border-warm-beige/30 hover:border-purple-300'
                      }`}
                    >
                      <img src={photo.url} alt={photo.name} className="w-full h-20 object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">
                        {photo.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Product image (Flux + Kontext — not DALL-E) */}
        {engine !== 'dalle' && (
          <div className="px-6 py-4 border-b border-warm-beige/20">
            <label className="block text-sm font-medium text-charcoal mb-2">
              <div className="flex items-center gap-1.5">
                <Package size={14} className="text-purple-500" />
                Product Image <span className="text-xs text-soft-gray font-normal">(optional — include a product in the generated image)</span>
              </div>
            </label>
            {engine === 'flux' && productImage && (
              <p className="text-xs text-amber-600 mb-2">Flux will use Character Match (Kontext) to include the product in the image.</p>
            )}
            {productImage ? (
              <div className="flex items-center gap-3 p-3 bg-purple-50/50 border border-purple-200/50 rounded-lg">
                <img src={productImage.url} alt={productImage.name} className="w-16 h-16 object-cover rounded-lg border border-purple-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{productImage.name}</p>
                  <p className="text-xs text-soft-gray">Will appear in the generated image</p>
                </div>
                <button
                  onClick={() => {
                    setProductImage(null);
                    // If we had more than 3 ref photos selected, no need to trim — they'll stay valid
                  }}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove product image"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-purple-200 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors">
                {uploadingProduct ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-purple-500" />
                    <span className="text-sm text-purple-600">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} className="text-purple-400" />
                    <span className="text-sm text-purple-600">Upload a product photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingProduct}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProductUpload(file);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        )}

        {/* Style selector */}
        <div className="px-6 py-4 border-b border-warm-beige/20">
          <label className="block text-sm font-medium text-charcoal mb-2">Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STYLE_PRESETS.map((style) => (
              <button
                key={style.key}
                onClick={() => handleStyleChange(style.key)}
                className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  selectedStyle === style.key
                    ? 'border-purple-400 bg-purple-50 text-purple-800'
                    : 'border-warm-beige/30 bg-white text-charcoal hover:bg-off-white'
                }`}
              >
                <span className="font-medium block">{style.label}</span>
                <span className="text-xs text-soft-gray leading-tight block mt-0.5">{style.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect ratio */}
        <div className="px-6 py-3 border-b border-warm-beige/20">
          <label className="block text-sm font-medium text-charcoal mb-2">Aspect Ratio</label>
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.key}
                onClick={() => setAspectRatio(ar.key)}
                className={`flex-1 text-center px-3 py-2 rounded-lg border text-sm transition-colors ${
                  aspectRatio === ar.key
                    ? 'border-purple-400 bg-purple-50 text-purple-800'
                    : 'border-warm-beige/30 bg-white text-charcoal hover:bg-off-white'
                }`}
              >
                <span className="font-medium block">{ar.label}</span>
                <span className="text-xs text-soft-gray">{ar.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt editor */}
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-charcoal mb-2">
            Prompt <span className="text-xs text-soft-gray font-normal">(edit to refine)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-purple-300/50 focus:border-purple-400 resize-none"
            placeholder="Describe the image you want to generate..."
          />
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setPrompt(buildPrompt(shotList, selectedStyle))}
              className="text-xs text-soft-gray hover:text-charcoal transition-colors"
            >
              Reset prompt
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || kontextMissingPhotos}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : generatedUrl ? (
                <>
                  <RefreshCw size={16} />
                  Regenerate
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Generate Image
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Generated image preview */}
        {generatedUrl && (
          <div className="px-6 pb-4">
            <div className="relative rounded-lg overflow-hidden border border-warm-beige/30">
              <img
                src={generatedUrl}
                alt="AI generated"
                className="w-full object-contain max-h-96"
              />

              {/* History navigation */}
              {history.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                  <button
                    onClick={() => navigateHistory(-1)}
                    disabled={!canGoBack}
                    className="text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs text-white">
                    {historyIndex + 1} / {history.length}
                  </span>
                  <button
                    onClick={() => navigateHistory(1)}
                    disabled={!canGoForward}
                    className="text-white disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Accept button */}
            <div className="flex justify-end mt-3">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {accepting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Use This Image
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildPrompt(shotList: ShotList, style: ImageStyle): string {
  const preset = STYLE_PRESETS.find((s) => s.key === style)!;

  const subjectParts = [
    shotList.subject && `Subject: ${shotList.subject}.`,
    shotList.setting && `Setting: ${shotList.setting}.`,
    shotList.framing && `Framing/composition: ${shotList.framing}.`,
    shotList.lighting && `Lighting: ${shotList.lighting}.`,
    shotList.keyElements && `Include these elements: ${shotList.keyElements}.`,
    shotList.notes && `Additional direction: ${shotList.notes}`,
  ].filter(Boolean).join('\n');

  return `${preset.promptPrefix}\n\nScene for a luxury medical spa (Sarasota Premier Aesthetics):\n${subjectParts}\n\nIMPORTANT: The image must look like an authentic photograph — real skin textures, natural imperfections, realistic lighting with proper shadows and highlights. No plastic-looking skin, no uncanny valley effects, no overly saturated colors. Avoid any visual cues that make the image look AI-generated.`;
}
