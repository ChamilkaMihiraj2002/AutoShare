import React from 'react';
import { CalendarRange, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminPricingSettings, updateAdminPricingSettings } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import type { AdminDynamicPricingSettings, CustomDateMultiplier } from '../../types';

type PricingFormState = {
  enabled: boolean;
  weekend_multiplier: string;
  weekly_discount_percentage: string;
  monthly_discount_percentage: string;
  holiday_multiplier: string;
  rainy_weather_multiplier: string;
  severe_weather_multiplier: string;
  distance_included_km: string;
  distance_surcharge_per_km: string;
  custom_date_multipliers: CustomDateMultiplier[];
};

const toFormState = (settings: AdminDynamicPricingSettings): PricingFormState => ({
  enabled: settings.enabled,
  weekend_multiplier: String(settings.weekend_multiplier),
  weekly_discount_percentage: String(settings.weekly_discount_percentage),
  monthly_discount_percentage: String(settings.monthly_discount_percentage),
  holiday_multiplier: String(settings.holiday_multiplier),
  rainy_weather_multiplier: String(settings.rainy_weather_multiplier),
  severe_weather_multiplier: String(settings.severe_weather_multiplier),
  distance_included_km: String(settings.distance_included_km),
  distance_surcharge_per_km: String(settings.distance_surcharge_per_km),
  custom_date_multipliers: settings.custom_date_multipliers ?? [],
});

const parseNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AdminPricing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [form, setForm] = React.useState<PricingFormState | null>(null);

  React.useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getAdminPricingSettings();
        setForm(toFormState(response.settings));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load dynamic pricing settings.';
        setError(message);
        if (message.toLowerCase().includes('authorization') || message.toLowerCase().includes('token')) {
          clearAdminAuthToken();
          navigate('/admin/signin', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [navigate]);

  const handleFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!form) return;
    const { name, value, type, checked } = event.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleDateRuleChange = (index: number, field: keyof CustomDateMultiplier, value: string) => {
    if (!form) return;
    setForm({
      ...form,
      custom_date_multipliers: form.custom_date_multipliers.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: field === 'multiplier' ? Number(value) || 1 : value } : item,
      ),
    });
  };

  const addDateRule = () => {
    if (!form) return;
    setForm({
      ...form,
      custom_date_multipliers: [
        ...form.custom_date_multipliers,
        {
          label: '',
          start_date: '',
          end_date: '',
          multiplier: 1,
        },
      ],
    });
  };

  const removeDateRule = (index: number) => {
    if (!form) return;
    setForm({
      ...form,
      custom_date_multipliers: form.custom_date_multipliers.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload: AdminDynamicPricingSettings = {
        enabled: form.enabled,
        weekend_multiplier: parseNumber(form.weekend_multiplier, 1),
        weekly_discount_percentage: parseNumber(form.weekly_discount_percentage, 0),
        monthly_discount_percentage: parseNumber(form.monthly_discount_percentage, 0),
        holiday_multiplier: parseNumber(form.holiday_multiplier, 1.15),
        rainy_weather_multiplier: parseNumber(form.rainy_weather_multiplier, 1.05),
        severe_weather_multiplier: parseNumber(form.severe_weather_multiplier, 1.12),
        distance_included_km: parseNumber(form.distance_included_km, 10),
        distance_surcharge_per_km: parseNumber(form.distance_surcharge_per_km, 15),
        custom_date_multipliers: form.custom_date_multipliers.filter(
          (item) => item.start_date && item.end_date,
        ),
      };

      const response = await updateAdminPricingSettings(payload);
      setForm(toFormState(response.settings));
      setSuccessMessage('Dynamic pricing settings updated for all vehicles.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save dynamic pricing settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin text-orange-500" size={32} />
          <p className="text-sm font-semibold uppercase tracking-wide">Loading pricing controls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-[#082E46]/20 bg-gradient-to-br from-[#1d3557] via-[#274c77] to-[#52796f] p-8 text-white shadow-xl">
        <div className="absolute -right-20 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
            <CalendarRange size={14} />
            Global Dynamic Pricing
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Apply one pricing policy across the full fleet</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-white/80">
            Vehicle owners only set their base day rate. These admin rules adjust live quotes for weekends, holidays, weather, distance, and special date windows.
          </p>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {successMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Core Pricing Rules</h3>
              <p className="mt-1 text-sm text-slate-500">Turn global dynamic pricing on or off and set the shared multipliers.</p>
            </div>
            <label className="inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                name="enabled"
                checked={form.enabled}
                onChange={handleFieldChange}
                className="rounded border-slate-300"
              />
              Enable for all vehicles
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Weekend Multiplier</span>
              <input name="weekend_multiplier" value={form.weekend_multiplier} onChange={handleFieldChange} type="number" step="0.01" min="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">7+ Day Discount (%)</span>
              <input name="weekly_discount_percentage" value={form.weekly_discount_percentage} onChange={handleFieldChange} type="number" step="0.01" min="0" max="100" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">30+ Day Discount (%)</span>
              <input name="monthly_discount_percentage" value={form.monthly_discount_percentage} onChange={handleFieldChange} type="number" step="0.01" min="0" max="100" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Holiday Multiplier</span>
              <input name="holiday_multiplier" value={form.holiday_multiplier} onChange={handleFieldChange} type="number" step="0.01" min="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Rain Multiplier</span>
              <input name="rainy_weather_multiplier" value={form.rainy_weather_multiplier} onChange={handleFieldChange} type="number" step="0.01" min="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Severe Weather Multiplier</span>
              <input name="severe_weather_multiplier" value={form.severe_weather_multiplier} onChange={handleFieldChange} type="number" step="0.01" min="0.01" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Included Distance (km)</span>
              <input name="distance_included_km" value={form.distance_included_km} onChange={handleFieldChange} type="number" step="0.01" min="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Extra Fee Per km</span>
              <input name="distance_surcharge_per_km" value={form.distance_surcharge_per_km} onChange={handleFieldChange} type="number" step="0.01" min="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Custom Date Rules</h3>
              <p className="mt-1 text-sm text-slate-500">Add peak-season or event windows that should affect every vehicle quote.</p>
            </div>
            <button
              type="button"
              onClick={addDateRule}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={16} />
              Add Date Rule
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {form.custom_date_multipliers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No custom date rules yet. Add one if you want a special multiplier for holidays, festivals, or peak demand windows.
              </div>
            )}

            {form.custom_date_multipliers.map((item, index) => (
              <div key={`${item.start_date}-${item.end_date}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]">
                <input
                  value={item.label ?? ''}
                  onChange={(event) => handleDateRuleChange(index, 'label', event.target.value)}
                  placeholder="Peak season label"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
                <input
                  type="date"
                  value={item.start_date}
                  onChange={(event) => handleDateRuleChange(index, 'start_date', event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
                <input
                  type="date"
                  value={item.end_date}
                  onChange={(event) => handleDateRuleChange(index, 'end_date', event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={item.multiplier}
                  onChange={(event) => handleDateRuleChange(index, 'multiplier', event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeDateRule(index)}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-3 py-2.5 text-rose-600 hover:bg-rose-50"
                  aria-label="Remove date rule"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#003049] px-5 py-3 text-sm font-bold text-white hover:bg-[#002538] disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Pricing Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminPricing;
