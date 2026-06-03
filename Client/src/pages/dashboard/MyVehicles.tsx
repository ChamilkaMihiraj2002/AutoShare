import { Car, Star, Zap, Plus, Loader2, BadgeCheck, FileText, ShieldAlert, MapPin, Fuel, Users, Gauge, ArrowRight, CircleOff, CircleCheckBig } from 'lucide-react';
import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import Modal from '../../components/common/Modal';
import { createMyVehicle, getMyVehicles, updateMyVehicle, uploadVehicleImage, uploadVehicleVerificationDocuments } from '../../lib/api';
import { formatLkr } from '../../lib/currency';
import { getPrimaryVehicleImage } from '../../lib/profile';

type VehicleCard = {
  id: string;
  name: string;
  year: number;
  type: string;
  fuel: string;
  transmission: string;
  seats: number;
  location: string;
  image: string;
  rating: number;
  trips: string;
  earned: string;
  status: string;
  isAvailable: boolean;
  verificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
};

const defaultForm = {
  brand: '',
  model: '',
  type: 'Sedan',
  fuel: 'Petrol',
  transmission: 'Automatic',
  price: '',
  distance_included_km: '10',
  distance_surcharge_per_km: '15',
  year: String(new Date().getFullYear()),
  seats: '5',
  location: '',
  availability: true,
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
  const [vehicleBookFile, setVehicleBookFile] = React.useState<File | null>(null);
  const [vehicleLicenseFile, setVehicleLicenseFile] = React.useState<File | null>(null);
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
        fuel: vehicle.fuel,
        transmission: vehicle.transmission,
        seats: vehicle.seats,
        location: vehicle.location,
        image: getPrimaryVehicleImage(vehicle.image_urls, vehicle.image_url),
        rating: vehicle.review_count ? Number((vehicle.average_rating ?? 0).toFixed(1)) : 0,
        trips: '-',
        earned: `${formatLkr(vehicle.price)}/day`,
        status: vehicle.availability ? 'Active' : 'Unavailable',
        isAvailable: vehicle.availability,
        verificationStatus: vehicle.verification_status ?? 'not_submitted',
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
    setVehicleBookFile(null);
    setVehicleLicenseFile(null);
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

  const handleVehicleBookChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVehicleBookFile(event.target.files?.[0] ?? null);
  };

  const handleVehicleLicenseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVehicleLicenseFile(event.target.files?.[0] ?? null);
  };

  const handleCreateVehicle = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError('');

    const price = Number(form.price);
    const distanceIncludedKm = Number(form.distance_included_km);
    const distanceSurchargePerKm = Number(form.distance_surcharge_per_km);
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
    if (!Number.isFinite(distanceIncludedKm) || distanceIncludedKm < 0) {
      setCreateError('Please enter a valid included distance.');
      return;
    }
    if (!Number.isFinite(distanceSurchargePerKm) || distanceSurchargePerKm < 0) {
      setCreateError('Please enter a valid extra fee per km.');
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
    if (!vehicleBookFile || !vehicleLicenseFile) {
      setCreateError('Vehicle book and vehicle license documents are required for verification.');
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
          distance_included_km: distanceIncludedKm,
          distance_surcharge_per_km: distanceSurchargePerKm,
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
      await uploadVehicleVerificationDocuments(created.vehicleid, {
        vehicleBook: vehicleBookFile,
        vehicleLicense: vehicleLicenseFile,
      });
      setIsAddModalOpen(false);
      setForm(defaultForm);
      setImageFiles([]);
      setVehicleBookFile(null);
      setVehicleLicenseFile(null);
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

  const verificationBadge = (status: VehicleCard['verificationStatus']) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          <BadgeCheck size={12} /> Verified
        </span>
      );
    }

    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
          <ShieldAlert size={12} /> Pending review
        </span>
      );
    }

    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
          <ShieldAlert size={12} /> Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
        <FileText size={12} /> Documents needed
      </span>
    );
  };

  const availabilityBadge = (vehicle: VehicleCard) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
        vehicle.isAvailable
          ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20'
          : 'bg-slate-900/10 text-slate-700 ring-1 ring-slate-900/10'
      }`}
    >
      {vehicle.isAvailable ? <CircleCheckBig size={12} /> : <CircleOff size={12} />}
      {vehicle.status}
    </span>
  );

  return (
    <div className="space-y-6 relative">
      <LoadingOverlay show={creating} message="Creating vehicle..." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {vehicles.map((vehicle) => (
          <article
            key={vehicle.id}
            className="group overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="relative h-36 overflow-hidden bg-slate-200">
              <img
                src={vehicle.image}
                alt={vehicle.name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
              <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                {availabilityBadge(vehicle)}
                <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm">
                  <Star size={12} className="fill-orange-500 text-orange-500" />
                  {vehicle.rating}
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-white">{vehicle.name}</h3>
                  <p className="text-xs text-white/78">{vehicle.year} • {vehicle.type}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={13} className="text-slate-400" />
                    <span className="truncate">{vehicle.location}</span>
                  </p>
                </div>
                <div className="shrink-0">
                  {verificationBadge(vehicle.verificationStatus)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Daily rate</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{vehicle.earned}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Trips</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{vehicle.trips}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <Users size={14} className="text-slate-500" />
                  <span>{vehicle.seats} seats</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <Fuel size={14} className="text-slate-500" />
                  <span>{vehicle.fuel}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <Gauge size={14} className="text-slate-500" />
                  <span>{vehicle.transmission}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <Car size={14} className="text-slate-500" />
                  <span>{vehicle.type}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-200 pt-3">
                <Link
                  to={`/dashboard/vehicles/${vehicle.id}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#003049] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#01263a]"
                >
                  Manage Vehicle
                  <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => void handleToggleAvailability(vehicle)}
                  disabled={togglingAvailabilityId === vehicle.id}
                  className={`inline-flex min-w-[44px] items-center justify-center rounded-xl border px-3 py-2.5 text-xs font-semibold transition disabled:opacity-60 ${
                    vehicle.isAvailable
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={vehicle.isAvailable ? 'Set unavailable' : 'Set available'}
                >
                  {togglingAvailabilityId === vehicle.id ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      {vehicle.isAvailable ? <CircleOff size={18} /> : <Zap size={18} />}
                    </>
                  )}
                </button>
              </div>
            </div>
          </article>
        ))}

        <button
          onClick={openAddModal}
          className="group flex h-full min-h-[290px] flex-col justify-between rounded-[20px] border border-dashed border-slate-300 bg-white p-5 text-left transition duration-300 hover:border-[#003049]/40 hover:shadow-md"
        >
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 transition group-hover:bg-slate-200">
              <Plus size={24} className="text-[#003049]" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Fleet management</p>
            <h3 className="mt-3 text-lg font-bold text-slate-900">Add a new vehicle</h3>
            <p className="mt-2 max-w-[220px] text-sm leading-6 text-slate-500">
              Publish another listing, upload documents, and make it ready for bookings from the same dashboard.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
            <span>Start listing</span>
            <ArrowRight size={16} className="transition group-hover:translate-x-1" />
          </div>
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
                  Add the main vehicle details, set your daily rate, upload images, and submit verification documents in one place.
                </p>
              </div>
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
              <label className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="availability"
                  checked={form.availability}
                  onChange={handleFormChange}
                  className="rounded border-slate-300 text-[#003049]"
                />
                Available for booking
              </label>
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Included Distance (km)</label>
                  <input type="number" step="0.01" min="0" name="distance_included_km" value={form.distance_included_km} onChange={handleFormChange} className={inputClassName} required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Extra Fee Per km (Rs)</label>
                  <input type="number" step="0.01" min="0" name="distance_surcharge_per_km" value={form.distance_surcharge_per_km} onChange={handleFormChange} className={inputClassName} required />
                </div>
                <div className="sm:col-span-2 rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Quick Preview</p>
                  <p className="mt-2 text-lg font-bold text-[#003049]">
                    {form.brand || form.model ? `${form.brand} ${form.model}`.trim() : 'Your vehicle name'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {form.price ? `${formatLkr(Number(form.price))}/day` : 'Set a daily price'} • {form.location || 'Add a location'}
                  </p>
                  <p className="mt-3 text-xs text-gray-500">Admins manage the shared pricing multipliers, while you control the included distance and extra per-km charge for this vehicle.</p>
                </div>
              </div>
            </section>
          </div>

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

          <section className={sectionClassName}>
            <div className="mb-4">
              <h4 className="text-base font-bold text-gray-900">Verification Documents</h4>
              <p className="text-xs text-gray-500">Required. Upload the vehicle book PDF and vehicle license details for admin approval.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Book</label>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleVehicleBookChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-medium"
                />
                {vehicleBookFile && <p className="mt-2 text-xs text-gray-500">{vehicleBookFile.name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle License Details</label>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={handleVehicleLicenseChange}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-medium"
                />
                {vehicleLicenseFile && <p className="mt-2 text-xs text-gray-500">{vehicleLicenseFile.name}</p>}
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Accepted formats: PDF, JPG, and PNG. Each file can be up to 10MB.</p>
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
