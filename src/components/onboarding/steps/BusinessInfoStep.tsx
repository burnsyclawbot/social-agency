import type { ClientProfile, BusinessInfo } from '../../../types/client';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

interface StepProps {
  draft: Partial<ClientProfile>;
  updateDraft: (updates: Partial<ClientProfile>) => void;
}

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

export default function BusinessInfoStep({ draft, updateDraft }: StepProps) {
  const biz = draft.business!;
  const [serviceInput, setServiceInput] = useState('');

  const update = (field: keyof BusinessInfo, value: string | string[]) => {
    updateDraft({ business: { ...biz, [field]: value } });
  };

  const addService = (service: string) => {
    if (service && !biz.services.includes(service)) {
      update('services', [...biz.services, service]);
    }
    setServiceInput('');
  };

  const removeService = (service: string) => {
    update('services', biz.services.filter((s) => s !== service));
  };

  const suggestedServices = COMMON_SERVICES.filter(
    (s) => !biz.services.includes(s) && s.toLowerCase().includes(serviceInput.toLowerCase())
  ).slice(0, 6);

  return (
    <div>
      <h2 className="text-xl font-semibold text-charcoal mb-2">
        Tell us about {draft.accountType === 'agency' ? 'your first client' : 'your practice'}
      </h2>
      <p className="text-soft-gray text-sm mb-8">
        This information shapes your content and helps with local SEO.
      </p>

      <div className="space-y-6">
        {/* Business name + owner */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business Name" value={biz.name} onChange={(v) => update('name', v)} placeholder="Sarasota Premier Aesthetics" />
          <Field label="Owner / Provider Name" value={biz.ownerName} onChange={(v) => update('ownerName', v)} placeholder="Susan Lynch" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Title / Credentials" value={biz.ownerTitle} onChange={(v) => update('ownerTitle', v)} placeholder="PAC, MD, NP, RN, etc." />
          <Field label="Phone" value={biz.phone} onChange={(v) => update('phone', v)} placeholder="941-993-5926" />
        </div>

        <Field label="Website" value={biz.website} onChange={(v) => update('website', v)} placeholder="sarasotapremieraesthetics.com" />

        {/* Address */}
        <Field label="Street Address" value={biz.address} onChange={(v) => update('address', v)} placeholder="8225 Natures Way Suite 107" />

        <div className="grid grid-cols-3 gap-4">
          <Field label="City" value={biz.city} onChange={(v) => update('city', v)} placeholder="Lakewood Ranch" />
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">State</label>
            <select
              value={biz.state}
              onChange={(e) => update('state', e.target.value)}
              className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose bg-white"
            >
              <option value="">Select...</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Field label="ZIP" value={biz.zip} onChange={(v) => update('zip', v)} placeholder="34202" />
        </div>

        <Field label="Rating / Social Proof" value={biz.rating} onChange={(v) => update('rating', v)} placeholder="5.0 stars (118 reviews)" />

        {/* Services */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">Services Offered</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {biz.services.map((service) => (
              <span
                key={service}
                className="inline-flex items-center gap-1 px-3 py-1 bg-dusty-rose/10 text-dusty-rose text-sm rounded-full"
              >
                {service}
                <button onClick={() => removeService(service)} className="hover:text-dusty-rose/70">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addService(serviceInput); } }}
              placeholder="Type a service or select below..."
              className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose"
            />
            {serviceInput && suggestedServices.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-warm-beige/50 rounded-lg shadow-lg">
                {suggestedServices.map((s) => (
                  <button
                    key={s}
                    onClick={() => addService(s)}
                    className="w-full text-left px-3 py-2 text-sm text-charcoal hover:bg-dusty-rose/5 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!serviceInput && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_SERVICES.filter((s) => !biz.services.includes(s)).slice(0, 8).map((s) => (
                <button
                  key={s}
                  onClick={() => addService(s)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-soft-gray border border-warm-beige/50 rounded-full hover:border-dusty-rose/30 hover:text-dusty-rose transition-colors"
                >
                  <Plus size={12} />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Target audience + positioning */}
        <TextArea
          label="Target Audience"
          value={biz.targetAudience}
          onChange={(v) => update('targetAudience', v)}
          placeholder="Affluent women (and men) 30-60 in the Sarasota/Lakewood Ranch area seeking premium non-surgical aesthetic treatments."
          rows={2}
        />

        <TextArea
          label="Unique Value Proposition"
          value={biz.positioning}
          onChange={(v) => update('positioning', v)}
          placeholder="What makes this practice special? e.g., 'Unparalleled patient experience and exquisite non-surgical treatment results'"
          rows={2}
        />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-charcoal mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 border border-warm-beige/50 rounded-lg text-charcoal placeholder-soft-gray/60 focus:outline-none focus:ring-2 focus:ring-dusty-rose/30 focus:border-dusty-rose resize-none"
      />
    </div>
  );
}
