import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, ImagePlus, X, BadgeCheck, ShieldAlert, FileText } from 'lucide-react';
import Modal from '../../components/common/Modal';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import { deleteMyVehicle, deleteVehicleImage, getMyVehicleById, updateMyVehicle, uploadVehicleImage, uploadVehicleVerificationDocuments } from '../../lib/api';
import { getPrimaryVehicleImage, resolveBackendAssetUrl } from '../../lib/profile';
import { VEHICLE_TYPES } from '../../lib/vehicleOptions';

type Toast = {
  type: 'success' | 'error';
  message: string;
};

const VehicleManage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [uploadingVerification, setUploadingVerification] = React.useState(false);
  const [deletingImageUrl, setDeletingImageUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [rawImageUrls, setRawImageUrls] = React.useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = React.useState<'not_submitted' | 'pending' | 'verified' | 'rejected'>('not_submitted');
  const [verificationNotes, setVerificationNotes] = React.useState<string>('');
  const [verificationDocs, setVerificationDocs] = React.useState<{ vehicleBookUrl?: string | null; vehicleLicenseUrl?: string | null }>({});
  const [vehicleBookFile, setVehicleBookFile] = React.useState<File | null>(null);
  const [vehicleLicenseFile, setVehicleLicenseFile] = React.useState<File | null>(null);

  const [confirmType, setConfirmType] = React.useState<'vehicle' | 'image' | null>(null);
  const [confirmImageUrl, setConfirmImageUrl] = React.useState<string | null>(null);

  const [toast, setToast] = React.useState<Toast | null>(null);

  const [form, setForm] = React.useState({
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
    imageUrl: '',
  });

  const showToast = React.useCallback((type: Toast['type'], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 2800);
  }, []);

  const closeConfirmModal = () => {
    if (deleting || deletingImageUrl) return;
    setConfirmType(null);
    setConfirmImageUrl(null);
  };

  const loadVehicle = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const vehicle = await getMyVehicleById(id);
      setForm({
        brand: vehicle.brand,
        model: vehicle.model,
        type: vehicle.type,
        fuel: vehicle.fuel,
        transmission: vehicle.transmission,
        price: String(vehicle.price),
        distance_included_km: String(vehicle.dynamic_pricing?.distance_included_km ?? 10),
        distance_surcharge_per_km: String(vehicle.dynamic_pricing?.distance_surcharge_per_km ?? 15),
        year: String(vehicle.year),
        seats: String(vehicle.seats ?? 5),
        location: vehicle.location,
        availability: vehicle.availability,
        imageUrl: getPrimaryVehicleImage(vehicle.image_urls, vehicle.image_url),
      });
      setRawImageUrls(
        vehicle.image_urls && vehicle.image_urls.length > 0
          ? vehicle.image_urls
          : vehicle.image_url
            ? [vehicle.image_url]
            : [],
      );
      setVerificationStatus(vehicle.verification_status ?? 'not_submitted');
      setVerificationNotes(vehicle.verification_notes ?? '');
      setVerificationDocs({
        vehicleBookUrl: vehicle.verification_documents?.vehicle_book_url,
        vehicleLicenseUrl: vehicle.verification_documents?.vehicle_license_url,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicle');
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void loadVehicle();
  }, [loadVehicle]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    if (type === 'checkbox') {
      const checked = (event.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitVerificationDocuments = async () => {
    if (!id) return;
    if (!vehicleBookFile || !vehicleLicenseFile) {
      showToast('error', 'Select both the vehicle book and vehicle license files before submitting.');
      return;
    }
    setUploadingVerification(true);
    try {
      const updated = await uploadVehicleVerificationDocuments(id, {
        vehicleBook: vehicleBookFile,
        vehicleLicense: vehicleLicenseFile,
      });
      setVerificationStatus(updated.verification_status ?? 'pending');
      setVerificationNotes(updated.verification_notes ?? '');
      setVerificationDocs({
        vehicleBookUrl: updated.verification_documents?.vehicle_book_url,
        vehicleLicenseUrl: updated.verification_documents?.vehicle_license_url,
      });
      setVehicleBookFile(null);
      setVehicleLicenseFile(null);
      showToast('success', 'Verification documents submitted for admin review.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload verification documents');
    } finally {
      setUploadingVerification(false);
    }
  };

  const verificationBadge = React.useMemo(() => {
    if (verificationStatus === 'verified') {
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"><BadgeCheck size={14} /> Verified</span>;
    }
    if (verificationStatus === 'pending') {
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"><ShieldAlert size={14} /> Pending Admin Review</span>;
    }
    if (verificationStatus === 'rejected') {
      return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700"><ShieldAlert size={14} /> Rejected</span>;
    }
    return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"><FileText size={14} /> Documents Needed</span>;
  }, [verificationStatus]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;

    const price = Number(form.price);
    const distanceIncludedKm = Number(form.distance_included_km);
    const distanceSurchargePerKm = Number(form.distance_surcharge_per_km);
    const year = Number(form.year);
    const seats = Number(form.seats);

    if (!form.brand.trim() || !form.model.trim() || !form.location.trim()) {
      showToast('error', 'Brand, model, and location are required.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      showToast('error', 'Please enter a valid daily price.');
      return;
    }
    if (!Number.isFinite(distanceIncludedKm) || distanceIncludedKm < 0) {
      showToast('error', 'Please enter a valid included distance.');
      return;
    }
    if (!Number.isFinite(distanceSurchargePerKm) || distanceSurchargePerKm < 0) {
      showToast('error', 'Please enter a valid extra fee per km.');
      return;
    }

    if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1) {
      showToast('error', 'Please enter a valid year.');
      return;
    }
    if (!Number.isInteger(seats) || seats <= 0) {
      showToast('error', 'Please enter a valid seating capacity.');
      return;
    }

    setSaving(true);
    try {
      await updateMyVehicle(id, {
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
      showToast('success', 'Vehicle updated successfully.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteVehicle = () => {
    setConfirmType('vehicle');
    setConfirmImageUrl(null);
  };

  const requestDeleteImage = (imageUrl: string) => {
    setConfirmType('image');
    setConfirmImageUrl(imageUrl);
  };

  const handleConfirmDelete = async () => {
    if (!id || !confirmType) return;

    if (confirmType === 'vehicle') {
      setDeleting(true);
      try {
        await deleteMyVehicle(id);
        navigate('/dashboard/vehicles');
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to delete vehicle');
        setDeleting(false);
        closeConfirmModal();
      }
      return;
    }

    if (confirmType === 'image' && confirmImageUrl) {
      setDeletingImageUrl(confirmImageUrl);
      try {
        const updated = await deleteVehicleImage(id, confirmImageUrl);
        const urls = updated.image_urls && updated.image_urls.length > 0 ? updated.image_urls : updated.image_url ? [updated.image_url] : [];
        setRawImageUrls(urls);
        setForm((prev) => ({
          ...prev,
          imageUrl: getPrimaryVehicleImage(updated.image_urls, updated.image_url),
        }));
        showToast('success', 'Vehicle image deleted.');
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to delete image');
      } finally {
        setDeletingImageUrl(null);
        closeConfirmModal();
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!id) return;
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      let latest = null;
      for (const file of files) {
        latest = await uploadVehicleImage(id, file);
      }
      if (latest) {
        const urls = latest.image_urls && latest.image_urls.length > 0 ? latest.image_urls : latest.image_url ? [latest.image_url] : [];
        setRawImageUrls(urls);
        setForm((prev) => ({
          ...prev,
          imageUrl: getPrimaryVehicleImage(latest.image_urls, latest.image_url),
        }));
      }
      showToast('success', 'Vehicle images updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to upload vehicle image');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading vehicle details..." />;
  }

  if (error && !form.brand) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl relative">
      <LoadingOverlay
        show={saving || deleting || uploadingImage || uploadingVerification || !!deletingImageUrl}
        message={
          deleting
            ? 'Deleting vehicle...'
            : deletingImageUrl
              ? 'Deleting image...'
              : uploadingVerification
                ? 'Uploading verification documents...'
              : uploadingImage
                ? 'Uploading images...'
                : 'Saving changes...'
        }
      />
      <div className="flex items-center justify-between">
        <Link to="/dashboard/vehicles" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Back to My Vehicles
        </Link>
        {verificationBadge}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-64 bg-gray-100 relative">
          <img src={form.imageUrl} alt={`${form.brand} ${form.model}`} className="w-full h-full object-cover" />
          <label className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white/95 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-white">
            <ImagePlus size={16} />
            {uploadingImage ? 'Uploading...' : 'Change Image'}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImage}
            />
          </label>
        </div>
        {rawImageUrls.length > 0 && (
          <div className="p-4 border-t border-gray-100 grid grid-cols-4 md:grid-cols-6 gap-3">
            {rawImageUrls.map((imageUrl) => {
              const resolved = resolveBackendAssetUrl(
                imageUrl,
                'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80',
              );
              return (
                <div key={imageUrl} className="relative">
                  <img src={resolved} alt="Vehicle gallery" className="w-full h-16 object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => requestDeleteImage(imageUrl)}
                    disabled={deletingImageUrl === imageUrl || uploadingImage || deleting}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-60"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Vehicle Verification</h3>
                <p className="mt-1 text-sm text-gray-500">Admins review your vehicle book and license details before this vehicle receives the verified badge.</p>
                {verificationNotes && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-gray-600 border border-gray-200">{verificationNotes}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3 border border-gray-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle Book</p>
                  {verificationDocs.vehicleBookUrl ? (
                    <a
                      href={resolveBackendAssetUrl(verificationDocs.vehicleBookUrl, verificationDocs.vehicleBookUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-[#003049] hover:text-orange-500"
                    >
                      View uploaded file
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Not uploaded yet</p>
                  )}
                </div>
                <div className="rounded-xl bg-white p-3 border border-gray-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vehicle License</p>
                  {verificationDocs.vehicleLicenseUrl ? (
                    <a
                      href={resolveBackendAssetUrl(verificationDocs.vehicleLicenseUrl, verificationDocs.vehicleLicenseUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-[#003049] hover:text-orange-500"
                    >
                      View uploaded file
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Not uploaded yet</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                Replace Vehicle Book
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(event) => setVehicleBookFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-sm"
                  disabled={uploadingVerification}
                />
                {vehicleBookFile && <span className="mt-2 block text-xs text-gray-500">{vehicleBookFile.name}</span>}
              </label>
              <label className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                Replace Vehicle License
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(event) => setVehicleLicenseFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-sm"
                  disabled={uploadingVerification}
                />
                {vehicleLicenseFile && <span className="mt-2 block text-xs text-gray-500">{vehicleLicenseFile.name}</span>}
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void submitVerificationDocuments()}
                disabled={uploadingVerification || !vehicleBookFile || !vehicleLicenseFile}
                className="rounded-xl bg-[#003049] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploadingVerification ? 'Submitting...' : 'Submit Verification Documents'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input name="model" value={form.model} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                {VEHICLE_TYPES.map((vehicleType) => (
                  <option key={vehicleType}>{vehicleType}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuel</label>
              <select name="fuel" value={form.fuel} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                <option>Petrol</option>
                <option>Diesel</option>
                <option>Electric</option>
                <option>Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
              <select name="transmission" value={form.transmission} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200">
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input type="number" name="year" value={form.year} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" min={1980} max={new Date().getFullYear() + 1} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Seats)</label>
              <input type="number" min="1" name="seats" value={form.seats} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Day (Rs)</label>
              <input type="number" step="0.01" min="1" name="price" value={form.price} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
              <p className="mt-2 text-xs text-gray-500">Admins manage the shared pricing rules, while you control this vehicle's included distance and extra per-km fee.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Included Distance (km)</label>
              <input type="number" step="0.01" min="0" name="distance_included_km" value={form.distance_included_km} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extra Fee Per km (Rs)</label>
              <input type="number" step="0.01" min="0" name="distance_surcharge_per_km" value={form.distance_surcharge_per_km} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" name="availability" checked={form.availability} onChange={handleChange} className="rounded border-gray-300" />
            Available for booking
          </label>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={requestDeleteVehicle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 font-bold hover:bg-red-50 disabled:opacity-60"
              disabled={deleting || saving || uploadingImage || !!deletingImageUrl}
            >
              <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete Vehicle'}
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#003049] text-white font-bold hover:bg-[#002538] disabled:opacity-60"
              disabled={saving || deleting || uploadingImage || !!deletingImageUrl}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className={`fixed top-24 right-6 z-[140] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <Modal
        isOpen={confirmType !== null}
        onClose={closeConfirmModal}
        title={confirmType === 'vehicle' ? 'Delete Vehicle' : 'Delete Image'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {confirmType === 'vehicle'
              ? 'Are you sure you want to permanently delete this vehicle? This cannot be undone.'
              : 'Are you sure you want to delete this image from the gallery?'}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeConfirmModal}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium"
              disabled={deleting || !!deletingImageUrl}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-60"
              disabled={deleting || !!deletingImageUrl}
            >
              {deleting || !!deletingImageUrl ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VehicleManage;
