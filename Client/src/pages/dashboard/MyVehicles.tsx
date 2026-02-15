import { Car, Star, Zap, Settings, Plus, X, Loader2 } from 'lucide-react';
import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingOverlay from '../../components/common/LoadingOverlay';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition group">
            <div className="h-48 bg-gray-200 relative">
              <img src={vehicle.image} alt={vehicle.name} className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-sm">
                <Star size={12} className="text-orange-500 fill-orange-500" /> {vehicle.rating}
              </div>
            </div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{vehicle.name}</h3>
                  <p className="text-xs text-gray-500">{vehicle.year} • {vehicle.type}</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">{vehicle.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-4 py-4 border-y border-gray-50">
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
          className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 hover:bg-white hover:border-[#003049] hover:text-[#003049] transition group h-full min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition">
            <Plus size={32} className="text-gray-400 group-hover:text-[#003049]" />
          </div>
          <h3 className="font-bold text-lg text-gray-500 group-hover:text-[#003049]">Add New Vehicle</h3>
          <p className="text-sm text-gray-400 text-center mt-2 max-w-[200px]">List another vehicle to earn more</p>
        </button>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Add New Vehicle</h3>
              <button type="button" onClick={closeAddModal} className="p-2 rounded-lg hover:bg-gray-100" disabled={creating}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input name="brand" value={form.brand} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input name="model" value={form.model} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select name="type" value={form.type} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                    <option>Sedan</option>
                    <option>SUV</option>
                    <option>Coupe</option>
                    <option>Hatchback</option>
                    <option>Truck</option>
                    <option>Van</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel</label>
                  <select name="fuel" value={form.fuel} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                    <option>Petrol</option>
                    <option>Diesel</option>
                    <option>Electric</option>
                    <option>Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
                  <select name="transmission" value={form.transmission} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                    <option>Automatic</option>
                    <option>Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" name="year" value={form.year} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" min={1980} max={new Date().getFullYear() + 1} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Seats)</label>
                  <input type="number" min="1" name="seats" value={form.seats} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Day (Rs)</label>
                  <input type="number" step="0.01" min="1" name="price" value={form.price} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input name="location" value={form.location} onChange={handleFormChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Images</label>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:rounded-md file:font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional. You can select multiple JPG/PNG/WEBP files, each up to 5MB.</p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="availability"
                  checked={form.availability}
                  onChange={handleFormChange}
                  className="rounded border-gray-300"
                />
                Available for booking
              </label>

              {createError && <p className="text-sm text-red-600">{createError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeAddModal} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium" disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-60" disabled={creating}>
                  {creating ? 'Adding...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyVehicles;
