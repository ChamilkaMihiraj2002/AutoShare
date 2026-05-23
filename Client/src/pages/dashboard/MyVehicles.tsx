import { Car, Star, Zap, Settings, Plus, Loader2 } from 'lucide-react';
import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import Modal from '../../components/common/Modal';
import { createMyVehicle, getMyVehicles, updateMyVehicle, uploadVehicleImage } from '../../lib/api';
import { formatLkr } from '../../lib/currency';
import { getPrimaryVehicleImage } from '../../lib/profile';

type VehicleCard = {
  id: string;
  name: string;
  year: number;
  type: string;
  image: string;
  rating: number;
  trips: string;
  earned: string;
  status: string;
  isAvailable: boolean;
};

const defaultForm = {
  brand: '',
  model: '',
  type: 'Sedan',
  fuel: 'Petrol',
  transmission: 'Automatic',
  price: '',
  year: String(new Date().getFullYear()),
  seats: '5',
  location: '',
  availability: true,
  dynamicPricingEnabled: false,
  weekendMultiplier: '1',
  weeklyDiscountPercentage: '0',
  monthlyDiscountPercentage: '0',
  holidayMultiplier: '1.15',
  rainyWeatherMultiplier: '1.05',
  severeWeatherMultiplier: '1.12',
  distanceIncludedKm: '10',
  distanceSurchargePerKm: '15',
};

const MyVehicles = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = React.useState<VehicleCard[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState('');
  const [form, setForm] = React.useState(defaultForm);
  const [imageFiles, setImageFiles] = React.useState<File[]>([]);
  const [togglingAvailabilityId, setTogglingAvailabilityId] = React.useState<string | null>(null);

  const inputClassName = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#003049] focus:ring-2 focus:ring-[#003049]/10';
  const sectionClassName = 'rounded-[24px] border border-gray-200 bg-white p-4 sm:p-5';

  const loadVehicles = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getMyVehicles();
      const mapped = result.map((vehicle) => ({
        id: vehicle.vehicleid,
        name: `${vehicle.brand} ${vehicle.model}`,
        year: vehicle.year,
        type: vehicle.type,
        image: getPrimaryVehicleImage(vehicle.image_urls, vehicle.image_url),
        rating: 4.8,
        trips: '-',
        earned: `${formatLkr(vehicle.price)}/day`,
        status: vehicle.availability ? 'Active' : 'Unavailable',
        isAvailable: vehicle.availability,
      }));
      setVehicles(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  React.useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsAddModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openAddModal = () => {
    setCreateError('');
    setForm(defaultForm);
    setImageFiles([]);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (creating) return;
    setIsAddModalOpen(false);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageFiles(Array.from(event.target.files || []));
  };

  const handleCreateVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError('');

    const price = Number(form.price);
    const year = Number(form.year);
    const seats = Number(form.seats);

    if (!form.brand.trim() || !form.model.trim() || !form.location.trim()) {
      setCreateError('Brand, model, and location are required.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setCreateError('Please enter a valid daily price.');
      return;
    }

    if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1) {
      setCreateError('Please enter a valid year.');
      return;
    }
    if (!Number.isInteger(seats) || seats <= 0) {
      setCreateError('Please enter a valid seating capacity.');
      return;
    }

    setCreating(true);
    try {
      const created = await createMyVehicle({
        brand: form.brand.trim(),
        model: form.model.trim(),
        type: form.type,
        fuel: form.fuel,
        transmission: form.transmission,
        price,
        year,
        seats,
        location: form.location.trim(),
        availability: form.availability,
        dynamic_pricing: {
          enabled: form.dynamicPricingEnabled,
          weekend_multiplier: Number(form.weekendMultiplier) || 1,
          weekly_discount_percentage: Number(form.weeklyDiscountPercentage) || 0,
          monthly_discount_percentage: Number(form.monthlyDiscountPercentage) || 0,
          holiday_multiplier: Number(form.holidayMultiplier) || 1.15,
          rainy_weather_multiplier: Number(form.rainyWeatherMultiplier) || 1.05,
          severe_weather_multiplier: Number(form.severeWeatherMultiplier) || 1.12,
          distance_included_km: Number(form.distanceIncludedKm) || 0,
          distance_surcharge_per_km: Number(form.distanceSurchargePerKm) || 0,
          custom_date_multipliers: [],
        },
      });
      if (imageFiles.length > 0) {
        if (!created.vehicleid) {
          throw new Error('Vehicle created but no vehicle ID was returned.');
        }
        for (const imageFile of imageFiles) {
          await uploadVehicleImage(created.vehicleid, imageFile);
        }
      }
      setIsAddModalOpen(false);
      setForm(defaultForm);
      setImageFiles([]);
      await loadVehicles();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to add vehicle');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAvailability = async (vehicle: VehicleCard) => {
    setTogglingAvailabilityId(vehicle.id);
    try {
      const updated = await updateMyVehicle(vehicle.id, {
        availability: !vehicle.isAvailable,
      });
      setVehicles((prev) =>
        prev.map((item) =>
          item.id === vehicle.id
            ? {
                ...item,
                isAvailable: updated.availability,
                status: updated.availability ? 'Active' : 'Unavailable',
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
    } finally {
      setTogglingAvailabilityId(null);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your vehicles..." />;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 relative">
      <LoadingOverlay show={creating} message="Creating vehicle..." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition group">
            <div className="h-40 bg-gray-200 relative">
              <img src={vehicle.image} alt={vehicle.name} className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-sm">
                <Star size={12} className="text-orange-500 fill-orange-500" /> {vehicle.rating}
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-base text-gray-900">{vehicle.name}</h3>
                  <p className="text-xs text-gray-500">{vehicle.year} • {vehicle.type}</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">{vehicle.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-3 py-3 border-y border-gray-50">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Car size={16} />
                  <span>{vehicle.trips} Trips</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Zap size={16} />
                  <span>{vehicle.earned} Earned</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/dashboard/vehicles/${vehicle.id}`}
                  className="flex-1 border border-gray-200 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition text-center"
                >
                  View Details
                </Link>
                <button
                  type="button"
                  onClick={() => void handleToggleAvailability(vehicle)}
                  disabled={togglingAvailabilityId === vehicle.id}
                  className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition disabled:opacity-60"
                  title={vehicle.isAvailable ? 'Set Unavailable' : 'Set Available'}
                >
                  {togglingAvailabilityId === vehicle.id ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Settings size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={openAddModal}
          className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-6 hover:bg-white hover:border-[#003049] hover:text-[#003049] transition group h-full min-h-[260px]"
        >
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition">
            <Plus size={32} className="text-gray-400 group-hover:text-[#003049]" />
          </div>
          <h3 className="font-bold text-lg text-gray-500 group-hover:text-[#003049]">Add New Vehicle</h3>
          <p className="text-sm text-gray-400 text-center mt-2 max-w-[200px]">List another vehicle to earn more</p>
        </button>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Add New Vehicle"
        maxWidthClassName="max-w-5xl"
        bodyClassName="bg-[#f8fafc]"
      >
        <form onSubmit={handleCreateVehicle} className="space-y-5">
          <div className="rounded-[24px] bg-[#003049] px-4 py-4 text-white shadow-lg shadow-[#003049]/20 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-white/65">Vehicle Listing</p>
                <h3 className="text-xl font-bold sm:text-2xl">Create a polished listing owners can manage easily</h3>
                <p className="max-w-2xl text-sm text-white/78">
                  Add the main vehicle details, choose pricing rules, and upload images in one place.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-2xl bg-white/12 px-4 py-3 text-sm font-medium backdrop-blur-sm">
                <input
                  type="checkbox"
                  name="availability"
                  checked={form.availability}
                  onChange={handleFormChange}
                  className="rounded border-white/40 text-[#003049]"
                />
                Available for booking
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className={sectionClassName}>
              <div className="mb-4">
                <h4 className="text-base font-bold text-gray-900">Vehicle Basics</h4>
                <p className="text-xs text-gray-500">Core details renters will see first.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Brand</label>
                  <input name="brand" value={form.brand} onChange={handleFormChange} className={inputClassName} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
                  <input name="model" value={form.model} onChange={handleFormChange} className={inputClassName} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Type</label>
                  <select name="type" value={form.type} onChange={handleFormChange} className={inputClassName}>
                    <option>Sedan</option>
                    <option>SUV</option>
                    <option>Coupe</option>
                    <option>Hatchback</option>
                    <option>Truck</option>
                    <option>Van</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fuel</label>
                  <select name="fuel" value={form.fuel} onChange={handleFormChange} className={inputClassName}>
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>Electric</option>
                    <option>Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Transmission</label>
                  <select name="transmission" value={form.transmission} onChange={handleFormChange} className={inputClassName}>
                    <option>Automatic</option>
                    <option>Manual</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
                  <input name="location" value={form.location} onChange={handleFormChange} className={inputClassName} required />
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className="mb-4">
                <h4 className="text-base font-bold text-gray-900">Capacity and Rate</h4>
                <p className="text-xs text-gray-500">Set the daily rental price and basic capacity.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                  <input type="number" name="year" value={form.year} onChange={handleFormChange} className={inputClassName} min={1980} max={new Date().getFullYear() + 1} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Capacity (Seats)</label>
                  <input type="number" min="1" name="seats" value={form.seats} onChange={handleFormChange} className={inputClassName} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price Per Day (Rs)</label>
                  <input type="number" step="0.01" min="1" name="price" value={form.price} onChange={handleFormChange} className={inputClassName} required />
                </div>
                <div className="sm:col-span-2 rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Quick Preview</p>
                  <p className="mt-2 text-lg font-bold text-[#003049]">
                    {form.brand || form.model ? `${form.brand} ${form.model}`.trim() : 'Your vehicle name'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {form.price ? `${formatLkr(Number(form.price))}/day` : 'Set a daily price'} • {form.location || 'Add a location'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <section className={sectionClassName}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-bold text-gray-900">Dynamic Pricing</h4>
                <p className="text-xs text-gray-500">Optional pricing rules for holidays, weather, and trip distance.</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="dynamicPricingEnabled"
                  checked={form.dynamicPricingEnabled}
                  onChange={handleFormChange}
                  className="rounded border-gray-300"
                />
                Enable dynamic pricing
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Weekend Multiplier</label>
                <input type="number" step="0.01" min="1" name="weekendMultiplier" value={form.weekendMultiplier} onChange={handleFormChange} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">7+ Day Discount (%)</label>
                <input type="number" step="0.01" min="0" max="100" name="weeklyDiscountPercentage" value={form.weeklyDiscountPercentage} onChange={handleFormChange} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">30+ Day Discount (%)</label>
                <input type="number" step="0.01" min="0" max="100" name="monthlyDiscountPercentage" value={form.monthlyDiscountPercentage} onChange={handleFormChange} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Holiday Multiplier</label>
                <input type="number" step="0.01" min="1" name="holidayMultiplier" value={form.holidayMultiplier} onChange={handleFormChange} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rain Multiplier</label>
                <input type="number" step="0.01" min="1" name="rainyWeatherMultiplier" value={form.rainyWeatherMultiplier} onChange={handleFormChange} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Severe Weather Multiplier</label>
                <input type="number" step="0.01" min="1" name="severeWeatherMultiplier" value={form.severeWeatherMultiplier} onChange={handleFormChange} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Included Distance (km)</label>
                <input type="number" step="0.01" min="0" name="distanceIncludedKm" value={form.distanceIncludedKm} onChange={handleFormChange} className={inputClassName} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Extra Fee Per km</label>
                <input type="number" step="0.01" min="0" name="distanceSurchargePerKm" value={form.distanceSurchargePerKm} onChange={handleFormChange} className={inputClassName} />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">Weather comes from Open-Meteo, holidays come from Nager.Date, and distance is calculated from the map coordinates used during booking.</p>
          </section>

          <section className={sectionClassName}>
            <div className="mb-4">
              <h4 className="text-base font-bold text-gray-900">Vehicle Images</h4>
              <p className="text-xs text-gray-500">Optional. Upload one or more photos to improve the listing.</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-medium"
            />
            <p className="mt-2 text-xs text-gray-500">You can select multiple JPG, PNG, or WEBP files, each up to 5MB.</p>
            {imageFiles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {imageFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </section>

          {createError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeAddModal} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700" disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60" disabled={creating}>
              {creating ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyVehicles;
