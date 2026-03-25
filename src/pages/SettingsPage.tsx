import { useState, useEffect, useRef } from 'react';
import { Plus, X, Save, Trash2, ChevronDown, ChevronRight, RefreshCw, Check, AlertCircle, CheckCircle, Pencil, Camera, Loader2 } from 'lucide-react';
import Header from '../components/layout/Header';
import type { ClientProfile, BusinessInfo, BrandColor, PlatformAccount, ReferencePhoto } from '../types/client';
import PlatformIcon from '../components/shared/PlatformIcon';
import type { Platform } from '../types';

interface SettingsPageProps {
  client: ClientProfile | null;
  onSave: (id: string, updates: Partial<ClientProfile>) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onAddClient: () => void;
  onDirtyChange?: (dirty: boolean, saveFn?: () => Promise<void>) => void;
}

type Section = 'business' | 'brand' | 'voice' | 'compliance' | 'platforms' | 'references';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const COMMON_SERVICES = [
  'Botox', 'Dermal Fillers', 'Chemical Peels', 'Microneedling', 'HydraFacial',
  'Laser Hair Removal', 'IPL Photofacial', 'PRP Therapy', 'Body Contouring',
  'Lip Filler', 'Kybella', 'Sculptra', 'Thread Lift', 'Skin Tightening',
  'IV Therapy', 'Hormone Therapy', 'Facials', 'Dermaplaning',
];

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'facebook', 'linkedin'];

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

export default function SettingsPage({ client, onSave, onDelete, onAddClient, onDirtyChange }: SettingsPageProps) {
  const [draft, setDraft] = useState<ClientProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['business']));
  const [serviceInput, setServiceInput] = useState('');
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editPhotoName, setEditPhotoName] = useState('');
  const refPhotoInputRef = useRef<HTMLInputElement>(null);
  const savedSnapshotRef = useRef<string>('');

  // Reset draft when client changes
  useEffect(() => {
    if (client) {
      setDraft({ ...client });
      savedSnapshotRef.current = JSON.stringify(client);
      setConfirmDelete(false);
    }
  }, [client]);

  // Dirty tracking
  const isDirty = draft ? JSON.stringify(draft) !== savedSnapshotRef.current : false;

  // Stable save ref for passing to parent
  const saveRef = useRef<() => Promise<void>>(async () => {});

  // Notify parent of dirty state + pass save function
  useEffect(() => {
    const saveFn = async () => { await saveRef.current?.(); };
    onDirtyChange?.(isDirty, saveFn);
  }, [isDirty, onDirtyChange]);

  // Warn on browser close/refresh with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  if (!client || !draft) {
    return (
      <>
        <Header title="Settings" subtitle="No client selected" />
        <div className="flex-1 p-4 sm:p-8">
          <div className="max-w-4xl mx-auto text-center text-soft-gray text-sm">
            Select a client to manage settings.
          </div>
        </div>
      </>
    );
  }

  const toggleSection = (section: Section) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(client.id, {
      business: draft.business,
      brand: draft.brand,
      voice: draft.voice,
      compliance: draft.compliance,
      platforms: draft.platforms,
      blotatoApiKey: draft.blotatoApiKey,
      referencePhotos: draft.referencePhotos,
    });
    savedSnapshotRef.current = JSON.stringify(draft);
    setSaving(false);
    setShowSavedModal(true);
  };

  saveRef.current = handleSave;

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(client.id);
    setDeleting(false);
  };

  const handleRefPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('clientId', client.id);
      formData.append('planId', 'reference-photos');

      const token = localStorage.getItem('spa_social_token');
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      const newPhotos: ReferencePhoto[] = data.uploaded.map((u: { name: string; url: string }) => ({
        id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: u.name.replace(/\.[^.]+$/, ''),
        url: u.url,
        uploadedAt: new Date().toISOString(),
      }));

      setDraft({
        ...draft,
        referencePhotos: [...(draft.referencePhotos || []), ...newPhotos],
      });
    } catch {
      // silent
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveRefPhoto = (photoId: string) => {
    setDraft({
      ...draft,
      referencePhotos: (draft.referencePhotos || []).filter((p) => p.id !== photoId),
    });
  };

  const handleRenameRefPhoto = (photoId: string, newName: string) => {
    setDraft({
      ...draft,
      referencePhotos: (draft.referencePhotos || []).map((p) =>
        p.id === photoId ? { ...p, name: newName } : p
      ),
    });
    setEditingPhotoId(null);
  };

  const handleFetchAccounts = async () => {
    if (!draft.blotatoApiKey) {
      setFetchError('Enter your Blotato API key first');
      return;
    }
    setFetchingAccounts(true);
    setFetchError(null);
    setFetchSuccess(false);
    try {
      const res = await fetch('/api/blotato/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('spa_social_token')}`,
        },
        body: JSON.stringify({ blotatoApiKey: draft.blotatoApiKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch accounts');
      }
      const data = await res.json();
      const accounts: Array<{ id: string; platform: string; username?: string; fullname?: string; subaccounts?: Array<{ id: string; name: string }> }> = data.accounts;

      // Map Blotato accounts to our platform structure
      setDraft((d) => {
        if (!d) return d;
        const updated = { ...d, platforms: { ...d.platforms } };
        for (const account of accounts) {
          const platform = account.platform as Platform;
          if (platform in updated.platforms) {
            const existing = updated.platforms[platform];
            updated.platforms = {
              ...updated.platforms,
              [platform]: {
                ...existing,
                enabled: true,
                accountId: account.id,
                handle: account.username || account.fullname || existing.handle,
                pageId: account.subaccounts?.[0]?.id || existing.pageId,
              },
            };
          }
        }
        return updated;
      });
      setFetchSuccess(true);
      setTimeout(() => setFetchSuccess(false), 3000);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setFetchingAccounts(false);
    }
  };

  // --- Updaters ---
  const updateBiz = (field: keyof BusinessInfo, value: string | string[]) => {
    setDraft((d) => d ? { ...d, business: { ...d.business, [field]: value } } : d);
  };

  const updateBrand = (updates: Partial<ClientProfile['brand']>) => {
    setDraft((d) => d ? { ...d, brand: { ...d.brand, ...updates } } : d);
  };

  const updateColor = (index: number, updates: Partial<BrandColor>) => {
    setDraft((d) => {
      if (!d) return d;
      const colors = [...d.brand.colors];
      colors[index] = { ...colors[index], ...updates };
      return { ...d, brand: { ...d.brand, colors } };
    });
  };

  const updateVoice = (updates: Partial<ClientProfile['voice']>) => {
    setDraft((d) => d ? { ...d, voice: { ...d.voice, ...updates } } : d);
  };

  const updateCompliance = (updates: Partial<ClientProfile['compliance']>) => {
    setDraft((d) => d ? { ...d, compliance: { ...d.compliance, ...updates } } : d);
  };

  const updatePlatform = (platform: Platform, updates: Partial<PlatformAccount>) => {
    setDraft((d) => d ? { ...d, platforms: { ...d.platforms, [platform]: { ...d.platforms[platform], ...updates } } } : d);
  };

  const updateSchedule = (platform: string, time: string) => {
    setDraft((d) => d ? { ...d, platforms: { ...d.platforms, defaultSchedule: { ...d.platforms.defaultSchedule, [platform]: time } } } : d);
  };

  const addService = (service: string) => {
    if (service && !draft.business.services.includes(service)) {
      updateBiz('services', [...draft.business.services, service]);
    }
    setServiceInput('');
  };

  const removeService = (service: string) => {
    updateBiz('services', draft.business.services.filter((s) => s !== service));
  };

  const suggestedServices = COMMON_SERVICES.filter(
    (s) => !draft.business.services.includes(s) && s.toLowerCase().includes(serviceInput.toLowerCase())
  ).slice(0, 6);

  const isOpen = (s: Section) => openSections.has(s);

  return (
    <>
      <Header
        title="Client Settings"
        subtitle={draft.business.name || 'Edit client profile'}
        action={
          <div className="flex items-center gap-2">
            {isDirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
            <button
              onClick={onAddClient}
              className="flex items-center gap-2 px-4 py-2 border border-warm-beige/50 text-charcoal rounded-lg text-sm font-medium hover:bg-off-white transition-colors"
            >
              <Plus size={16} />
              Add Client
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-dusty-rose text-white rounded-lg text-sm font-medium hover:bg-dusty-rose/90 disabled:opacity-50 transition-colors"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      />
      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Business Info */}
          <SectionCard title="Business Info" section="business" isOpen={isOpen('business')} onToggle={toggleSection}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Business Name" value={draft.business.name} onChange={(v) => updateBiz('name', v)} />
                <Field label="Owner / Provider Name" value={draft.business.ownerName} onChange={(v) => updateBiz('ownerName', v)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Title / Credentials" value={draft.business.ownerTitle} onChange={(v) => updateBiz('ownerTitle', v)} />
                <Field label="Phone" value={draft.business.phone} onChange={(v) => updateBiz('phone', v)} />
              </div>
              <Field label="Website" value={draft.business.website} onChange={(v) => updateBiz('website', v)} />
              <Field label="Street Address" value={draft.business.address} onChange={(v) => updateBiz('address', v)} />
              <div className="grid grid-cols-3 gap-4">
                <Field label="City" value={draft.business.city} onChange={(v) => updateBiz('city', v)} />
                <div>
                  <label className="block text-xs font-medium text-soft-gray mb-1">State</label>
                  <select
                    value={draft.business.state}
                    onChange={(e) => updateBiz('state', e.target.value)}
                    className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 bg-white"
                  >
                    <option value="">Select...</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Field label="ZIP" value={draft.business.zip} onChange={(v) => updateBiz('zip', v)} />
              </div>
              <Field label="Rating / Social Proof" value={draft.business.rating} onChange={(v) => updateBiz('rating', v)} />

              {/* Services */}
              <div>
                <label className="block text-xs font-medium text-soft-gray mb-1">Services</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {draft.business.services.map((service) => (
                    <span key={service} className="inline-flex items-center gap-1 px-2.5 py-1 bg-dusty-rose/10 text-dusty-rose text-xs rounded-full">
                      {service}
                      <button onClick={() => removeService(service)} className="hover:text-dusty-rose/70"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addService(serviceInput); } }}
                    placeholder="Add a service..."
                    className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                  />
                  {serviceInput && suggestedServices.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-warm-beige/50 rounded-lg shadow-lg">
                      {suggestedServices.map((s) => (
                        <button key={s} onClick={() => addService(s)} className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-dusty-rose/5 first:rounded-t-lg last:rounded-b-lg">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <TextArea label="Target Audience" value={draft.business.targetAudience} onChange={(v) => updateBiz('targetAudience', v)} rows={2} />
              <TextArea label="Unique Value Proposition" value={draft.business.positioning} onChange={(v) => updateBiz('positioning', v)} rows={2} />
            </div>
          </SectionCard>

          {/* Brand Identity */}
          <SectionCard title="Brand Identity" section="brand" isOpen={isOpen('brand')} onToggle={toggleSection}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-soft-gray mb-2">Brand Colors</label>
                <div className="space-y-2">
                  {draft.brand.colors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2 bg-off-white/50 p-2 rounded-lg">
                      <input type="color" value={color.hex} onChange={(e) => updateColor(i, { hex: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <input type="text" value={color.name} onChange={(e) => updateColor(i, { name: e.target.value })} placeholder="Name" className="flex-1 px-2 py-1.5 border border-warm-beige/50 rounded text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30" />
                      <input type="text" value={color.hex} onChange={(e) => updateColor(i, { hex: e.target.value })} className="w-20 px-2 py-1.5 border border-warm-beige/50 rounded text-sm text-charcoal font-mono focus:outline-none focus:ring-2 focus:ring-dusty-rose/30" />
                      <input type="text" value={color.usage} onChange={(e) => updateColor(i, { usage: e.target.value })} placeholder="Usage" className="flex-1 px-2 py-1.5 border border-warm-beige/50 rounded text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30" />
                      {draft.brand.colors.length > 1 && (
                        <button onClick={() => updateBrand({ colors: draft.brand.colors.filter((_, j) => j !== i) })} className="text-soft-gray hover:text-red-500"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => updateBrand({ colors: [...draft.brand.colors, { name: '', hex: '#888888', usage: '' }] })} className="mt-2 flex items-center gap-1 text-xs text-dusty-rose hover:text-dusty-rose/80">
                  <Plus size={12} /> Add color
                </button>
              </div>
              <TextArea label="Visual Style" value={draft.brand.visualStyle} onChange={(v) => updateBrand({ visualStyle: v })} rows={3} />
              <TextArea label="Photography & Content Notes" value={draft.brand.photographyNotes} onChange={(v) => updateBrand({ photographyNotes: v })} rows={3} />
            </div>
          </SectionCard>

          {/* Brand Voice */}
          <SectionCard title="Brand Voice" section="voice" isOpen={isOpen('voice')} onToggle={toggleSection}>
            <div className="space-y-4">
              <Field label="Tone (comma-separated)" value={draft.voice.tone.join(', ')} onChange={(v) => updateVoice({ tone: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
              <TextArea label="Writing Style" value={draft.voice.writingStyle} onChange={(v) => updateVoice({ writingStyle: v })} rows={3} />
              <TextArea label="Do's (one per line)" value={draft.voice.doList.join('\n')} onChange={(v) => updateVoice({ doList: v.split('\n').filter(Boolean) })} rows={3} />
              <TextArea label="Don'ts (one per line)" value={draft.voice.dontList.join('\n')} onChange={(v) => updateVoice({ dontList: v.split('\n').filter(Boolean) })} rows={3} />
              <div>
                <label className="block text-xs font-medium text-soft-gray mb-1">Emoji Usage</label>
                <select
                  value={draft.voice.emojis}
                  onChange={(e) => updateVoice({ emojis: e.target.value as 'none' | 'sparingly' | 'frequently' })}
                  className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 bg-white"
                >
                  <option value="none">None</option>
                  <option value="sparingly">Sparingly (1-3 per post)</option>
                  <option value="frequently">Frequently</option>
                </select>
              </div>
              <Field label="Hashtag Style" value={draft.voice.hashtagStyle} onChange={(v) => updateVoice({ hashtagStyle: v })} />
              <Field label="CTA Style" value={draft.voice.ctaStyle} onChange={(v) => updateVoice({ ctaStyle: v })} />
            </div>
          </SectionCard>

          {/* Compliance */}
          <SectionCard title="Compliance" section="compliance" isOpen={isOpen('compliance')} onToggle={toggleSection}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-soft-gray mb-1">Industry</label>
                <select
                  value={draft.compliance.industry}
                  onChange={(e) => updateCompliance({ industry: e.target.value as ClientProfile['compliance']['industry'] })}
                  className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 bg-white"
                >
                  <option value="medical_spa">Medical Spa</option>
                  <option value="dental">Dental</option>
                  <option value="wellness">Wellness</option>
                  <option value="beauty">Beauty</option>
                  <option value="fitness">Fitness</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <TextArea label="Banned Words (one per line)" value={draft.compliance.bannedWords.join('\n')} onChange={(v) => updateCompliance({ bannedWords: v.split('\n').filter(Boolean) })} rows={3} />
              <TextArea label="Banned Phrases (one per line)" value={draft.compliance.bannedPhrases.join('\n')} onChange={(v) => updateCompliance({ bannedPhrases: v.split('\n').filter(Boolean) })} rows={3} />
              <TextArea label="Disclaimer Text" value={draft.compliance.disclaimerText || ''} onChange={(v) => updateCompliance({ disclaimerText: v || undefined })} rows={2} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.compliance.requiresMediaReview}
                  onChange={(e) => updateCompliance({ requiresMediaReview: e.target.checked })}
                  className="w-4 h-4 rounded border-warm-beige text-dusty-rose focus:ring-dusty-rose/30"
                />
                <span className="text-sm text-charcoal">Require media review before publishing</span>
              </label>
            </div>
          </SectionCard>

          {/* Platforms */}
          <SectionCard title="Platforms & API" section="platforms" isOpen={isOpen('platforms')} onToggle={toggleSection}>
            <div className="space-y-4">
              {/* Blotato API Key + Fetch */}
              <div className="p-4 bg-off-white/50 rounded-lg border border-warm-beige/30">
                <label className="block text-xs font-medium text-soft-gray mb-1">Blotato API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.blotatoApiKey || ''}
                    onChange={(e) => setDraft((d) => d ? { ...d, blotatoApiKey: e.target.value } : d)}
                    placeholder="blt_..."
                    className="flex-1 px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 font-mono"
                  />
                  <button
                    onClick={handleFetchAccounts}
                    disabled={fetchingAccounts || !draft.blotatoApiKey}
                    className="flex items-center gap-2 px-4 py-2 bg-charcoal text-white rounded-lg text-sm font-medium hover:bg-charcoal/90 disabled:opacity-50 transition-colors shrink-0"
                  >
                    <RefreshCw size={14} className={fetchingAccounts ? 'animate-spin' : ''} />
                    {fetchingAccounts ? 'Fetching...' : 'Fetch Accounts'}
                  </button>
                </div>
                {fetchError && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
                    <AlertCircle size={12} />
                    {fetchError}
                  </div>
                )}
                {fetchSuccess && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                    <Check size={12} />
                    Accounts synced from Blotato
                  </div>
                )}
                <p className="text-xs text-soft-gray mt-2">
                  Enter your API key and click Fetch Accounts to auto-connect your social platforms from Blotato.
                </p>
              </div>

              {/* Platform cards */}
              {PLATFORMS.map((platform) => {
                const account = draft.platforms[platform];
                const connected = !!account.accountId;
                return (
                  <div key={platform} className={`p-4 rounded-lg border transition-colors ${connected ? 'bg-white border-green-200' : account.enabled ? 'bg-white border-warm-beige/30' : 'bg-off-white/50 border-warm-beige/30 opacity-60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={platform} size={18} />
                        <span className="text-sm font-medium text-charcoal">{PLATFORM_LABELS[platform]}</span>
                        {connected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                            <Check size={10} />
                            Connected
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => updatePlatform(platform, { enabled: !account.enabled })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${account.enabled ? 'bg-dusty-rose' : 'bg-warm-beige'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${account.enabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    {account.enabled && (
                      <div className="mt-3 pt-3 border-t border-warm-beige/20 space-y-2">
                        {connected && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div><span className="text-soft-gray">Account ID:</span> <span className="font-mono text-charcoal">{account.accountId}</span></div>
                            {account.handle && <div><span className="text-soft-gray">Handle:</span> <span className="text-charcoal">{account.handle}</span></div>}
                            {account.pageId && <div><span className="text-soft-gray">Page ID:</span> <span className="font-mono text-charcoal">{account.pageId}</span></div>}
                          </div>
                        )}
                        {!connected && (
                          <p className="text-xs text-amber-600">Not connected. Fetch accounts from Blotato above.</p>
                        )}
                        <div>
                          <label className="block text-xs font-medium text-soft-gray mb-1">Default Post Time (ET)</label>
                          <input
                            type="time"
                            value={draft.platforms.defaultSchedule[platform] || ''}
                            onChange={(e) => updateSchedule(platform, e.target.value)}
                            className="w-full sm:w-48 px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Reference Photos for AI */}
          <SectionCard title="Reference Photos (AI)" section="references" isOpen={isOpen('references')} onToggle={toggleSection}>
            <p className="text-xs text-soft-gray mb-4">
              Upload reference photos of team members or brand imagery. These are used by the AI Character Match engine (Flux Kontext) to generate images that look like real people from your team.
            </p>

            <input
              ref={refPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleRefPhotoUpload}
            />

            {/* Photo grid */}
            {(draft.referencePhotos || []).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {(draft.referencePhotos || []).map((photo) => (
                  <div key={photo.id} className="relative group bg-off-white rounded-lg border border-warm-beige/30 p-2">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-28 object-cover rounded"
                    />
                    <div className="mt-1.5">
                      {editingPhotoId === photo.id ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editPhotoName}
                            onChange={(e) => setEditPhotoName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameRefPhoto(photo.id, editPhotoName);
                            }}
                            className="flex-1 text-xs px-1.5 py-1 border border-dusty-rose/50 rounded focus:outline-none focus:ring-1 focus:ring-dusty-rose/30"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameRefPhoto(photo.id, editPhotoName)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-charcoal truncate flex-1">{photo.name}</span>
                          <button
                            onClick={() => { setEditingPhotoId(photo.id); setEditPhotoName(photo.name); }}
                            className="opacity-0 group-hover:opacity-100 text-soft-gray hover:text-charcoal transition-opacity"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveRefPhoto(photo.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 shadow-sm transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => refPhotoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-warm-beige/40 rounded-lg text-sm text-soft-gray hover:border-dusty-rose/40 hover:text-dusty-rose transition-colors w-full justify-center"
            >
              {uploadingPhoto ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera size={16} />
                  Upload Reference Photos
                </>
              )}
            </button>
          </SectionCard>

          {/* Danger Zone */}
          <div className="border border-red-200 rounded-xl p-5 bg-red-50/30">
            <h3 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h3>
            <p className="text-xs text-red-600/70 mb-4">
              Permanently delete this client and all associated data. This cannot be undone.
            </p>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete Client
            </button>
          </div>
        </div>
      </div>

      {/* Save success modal */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSavedModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-1">Changes Saved</h3>
            <p className="text-sm text-soft-gray mb-5">Client settings have been updated successfully.</p>
            <button
              onClick={() => setShowSavedModal(false)}
              className="px-6 py-2.5 bg-dusty-rose text-white rounded-lg text-sm font-medium hover:bg-dusty-rose/90 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-1 text-center">Delete Client</h3>
            <p className="text-sm text-soft-gray mb-5 text-center">
              Are you sure you want to permanently delete <strong className="text-charcoal">{draft.business.name || 'this client'}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 border border-warm-beige/50 text-charcoal rounded-lg text-sm font-medium hover:bg-off-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

// --- Reusable sub-components ---

function SectionCard({ title, section, isOpen, onToggle, children }: {
  title: string;
  section: Section;
  isOpen: boolean;
  onToggle: (s: Section) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-warm-beige/30 overflow-hidden">
      <button
        onClick={() => onToggle(section)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-off-white/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
        {isOpen ? <ChevronDown size={16} className="text-soft-gray" /> : <ChevronRight size={16} className="text-soft-gray" />}
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-warm-beige/20 pt-4">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, mono }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-soft-gray mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-soft-gray mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-warm-beige/50 rounded-lg text-sm text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 resize-none"
      />
    </div>
  );
}
