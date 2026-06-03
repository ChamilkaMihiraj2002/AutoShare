import React, { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Users, Fuel, Gauge, Calendar, BadgeCheck, Heart } from 'lucide-react';
import LoadingScreen from '../components/common/LoadingScreen';
import { getMyProfile, getPublicVehicleById, getUserPublicProfile, getVehicleReviews, mapVehicleApiToCar, removeSavedVehicle, saveVehicle } from '../lib/api';
import MessagePopup from '../components/messages/MessagePopup';
import { getAuthToken } from '../lib/auth';
import { formatLkr } from '../lib/currency';
import { MOCK_VEHICLES } from '../data/mockVehicles';
import { getDisplayNameFromEmail, resolveAvatarUrl, resolveBackendAssetUrl } from '../lib/profile';
import type { Car, VehicleReviewWithAuthorApi } from '../types';

type VehicleBookingRouteState = {
    startDate?: string;
    endDate?: string;
};

const VehicleDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const routeVehicle = (location.state as { vehicle?: Car } | null)?.vehicle ?? null;

    const [vehicle, setVehicle] = React.useState<Car | null>(routeVehicle);
    const [isLoading, setIsLoading] = React.useState(!routeVehicle);
    const [error, setError] = React.useState('');
    const [ownerUid, setOwnerUid] = React.useState('');
    const [ownerName, setOwnerName] = React.useState('Vehicle Owner');
    const [ownerAvatar, setOwnerAvatar] = React.useState(resolveAvatarUrl());
    const [currentUserUid, setCurrentUserUid] = React.useState('');
    const [isMessagePopupOpen, setIsMessagePopupOpen] = React.useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateError, setDateError] = useState('');
    const [selectedImage, setSelectedImage] = useState(routeVehicle?.image ?? '');
    const [savedVehicleIds, setSavedVehicleIds] = React.useState<string[]>([]);
    const [savePending, setSavePending] = React.useState(false);
    const [saveError, setSaveError] = React.useState('');
    const [reviews, setReviews] = React.useState<VehicleReviewWithAuthorApi[]>([]);

    React.useEffect(() => {
        if (routeVehicle) {
            setVehicle(routeVehicle);
        }
    }, [routeVehicle]);

    const galleryImages = React.useMemo(() => {
        if (!vehicle) return [];

        const rawImages = Array.isArray(vehicle.images) ? vehicle.images : [];
        const orderedImages = [vehicle.image, ...rawImages]
            .map((imageUrl) => resolveBackendAssetUrl(imageUrl, vehicle.image))
            .filter(Boolean);

        return Array.from(new Set(orderedImages));
    }, [vehicle]);

    React.useEffect(() => {
        setSelectedImage(galleryImages[0] ?? '');
    }, [galleryImages]);

    React.useEffect(() => {
        const loadSavedVehicles = async () => {
            if (!getAuthToken()) {
                setSavedVehicleIds([]);
                return;
            }

            try {
                const profile = await getMyProfile();
                setSavedVehicleIds(profile.saved_vehicle_ids ?? []);
            } catch {
                setSavedVehicleIds([]);
            }
        };

        void loadSavedVehicles();
    }, []);

    React.useEffect(() => {
        const loadVehicle = async () => {
            if (!id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                const result = await getPublicVehicleById(id);
                if (result) {
                    setVehicle(mapVehicleApiToCar(result));
                    setOwnerUid(result.owner_uid);
                    return;
                }

                const mockVehicle = MOCK_VEHICLES.find((entry) => entry.id === id);
                setVehicle(mockVehicle || null);
            } catch (err) {
                if (!routeVehicle) {
                    setError(err instanceof Error ? err.message : 'Failed to load vehicle');
                }
            } finally {
                setIsLoading(false);
            }
        };

        void loadVehicle();
    }, [id, routeVehicle]);

    React.useEffect(() => {
        const nextOwnerUid = vehicle?.ownerUid;
        if (!nextOwnerUid) {
            setOwnerName('Vehicle Owner');
            setOwnerAvatar(resolveAvatarUrl());
            return;
        }

        const loadOwner = async () => {
            try {
                const profile = await getUserPublicProfile(nextOwnerUid);
                const displayName = profile.full_name?.trim() || getDisplayNameFromEmail(profile.email);
                setOwnerName(displayName);
                setOwnerAvatar(resolveAvatarUrl(profile.avatar_url));
            } catch {
                setOwnerName('Vehicle Owner');
                setOwnerAvatar(resolveAvatarUrl());
            }
        };

        void loadOwner();
    }, [vehicle?.ownerUid]);

    React.useEffect(() => {
        if (!id) {
            setReviews([]);
            return;
        }

        const loadReviews = async () => {
            try {
                const result = await getVehicleReviews(id);
                setReviews(result);
            } catch {
                setReviews([]);
            }
        };

        void loadReviews();
    }, [id]);

    if (isLoading) {
        return <LoadingScreen message="Loading vehicle..." />;
    }

    if (error) {
        return <div className="pt-24 text-center text-red-600">{error}</div>;
    }

    if (!vehicle) {
        return <div className="pt-24 text-center">Vehicle not found</div>;
    }

    const specifications = {
        year: vehicle.year,
        transmission: vehicle.transmission,
        fuel: vehicle.fuelType,
        capacity: vehicle.seats,
    };

    const handleBookNow = () => {
        if (!startDate || !endDate) {
            setDateError('Please select both start and end dates.');
            return;
        }

        if (new Date(endDate) <= new Date(startDate)) {
            setDateError('End date must be after start date.');
            return;
        }

        setDateError('');
        navigate(`/vehicles/${vehicle.id}/book`, {
            state: {
                startDate,
                endDate,
            } satisfies VehicleBookingRouteState,
        });
    };

    const handleMessageOwner = async () => {
        if (!ownerUid) return;
        if (!getAuthToken()) {
            navigate('/signin', { state: { from: `/vehicles/${vehicle.id}` } });
            return;
        }

        try {
            const profile = await getMyProfile();
            if (profile.uid === ownerUid) {
                setError('You cannot message yourself about your own vehicle.');
                return;
            }
            setCurrentUserUid(profile.uid);
            setIsMessagePopupOpen(true);
        } catch {
            navigate('/signin');
        }
    };

    const handleToggleSave = async () => {
        if (!vehicle) return;
        if (!getAuthToken()) {
            navigate('/signin', { state: { from: `/vehicles/${vehicle.id}` } });
            return;
        }

        const currentlySaved = savedVehicleIds.includes(vehicle.id);
        setSavePending(true);
        setSaveError('');
        try {
            const profile = currentlySaved
                ? await removeSavedVehicle(vehicle.id)
                : await saveVehicle(vehicle.id);
            setSavedVehicleIds(profile.saved_vehicle_ids ?? []);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to update saved vehicles');
        } finally {
            setSavePending(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <Link to="/search" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium">
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Search
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                            <img src={selectedImage || galleryImages[0] || vehicle.image} alt={vehicle.name} className="w-full h-96 object-cover" />
                        </div>

                        {galleryImages.length > 0 && (
                            <div className="flex flex-wrap gap-4">
                                {galleryImages.map((imageUrl, index) => {
                                    const isActive = imageUrl === (selectedImage || galleryImages[0]);
                                    return (
                                        <button
                                            key={`${imageUrl}-${index}`}
                                            type="button"
                                            onClick={() => setSelectedImage(imageUrl)}
                                            className={`h-24 w-32 overflow-hidden rounded-lg border-2 transition ${
                                                isActive
                                                    ? 'border-orange-500'
                                                    : 'border-transparent opacity-70 hover:border-orange-200 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={imageUrl} alt={`${vehicle.name} view ${index + 1}`} className="h-full w-full object-cover" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-bold text-gray-900">{vehicle.name}</h1>
                                <button
                                    type="button"
                                    onClick={() => void handleToggleSave()}
                                    disabled={savePending}
                                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                        savedVehicleIds.includes(vehicle.id)
                                            ? 'border-red-200 bg-red-50 text-red-600'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-500'
                                    } disabled:opacity-60`}
                                >
                                    <Heart size={16} fill={savedVehicleIds.includes(vehicle.id) ? 'currentColor' : 'none'} />
                                    {savedVehicleIds.includes(vehicle.id) ? 'Saved' : 'Save'}
                                </button>
                                {vehicle.verified && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                        <BadgeCheck size={14} />
                                        Verified Vehicle
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-gray-600 mb-6">
                                <div className="flex items-center gap-1">
                                    <Star className="text-orange-400 fill-orange-400" size={18} />
                                    <span className="font-bold text-gray-900">{vehicle.rating}</span>
                                    <span>({vehicle.reviews} reviews)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin size={18} />
                                    <span>{vehicle.location}</span>
                                </div>
                            </div>

                            {saveError && <p className="mb-4 text-sm text-red-600">{saveError}</p>}

                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                                            <img src={ownerAvatar} alt={ownerName} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Hosted by</p>
                                            <h3 className="font-bold text-gray-900">{ownerName}</h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => void handleMessageOwner()}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                                    >
                                        Message Owner
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-4">Vehicle Specifications</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Calendar className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Year</div>
                                    <div className="font-bold text-gray-900">{specifications.year ?? 'Not specified'}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Gauge className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Transmission</div>
                                    <div className="font-bold text-gray-900">{specifications.transmission ?? 'Not specified'}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Fuel className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Fuel</div>
                                    <div className="font-bold text-gray-900">{specifications.fuel ?? 'Not specified'}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Users className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Capacity</div>
                                    <div className="font-bold text-gray-900 text-center">
                                        {specifications.capacity ? `${specifications.capacity} seats` : 'Not specified'}
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-4">About this vehicle</h3>
                            <p className="text-gray-600 leading-relaxed mb-8">
                                {vehicle.name} is available in {vehicle.location}
                                {vehicle.type ? ` as a ${vehicle.type.toLowerCase()}` : ''}.
                                {vehicle.transmission ? ` It comes with ${vehicle.transmission.toLowerCase()} transmission,` : ''}
                                {vehicle.fuelType ? ` runs on ${vehicle.fuelType.toLowerCase()} fuel,` : ''}
                                {vehicle.seats ? ` and seats up to ${vehicle.seats} people.` : ''}
                            </p>

                            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Reviews</h3>
                            <div className="space-y-6">
                                {reviews.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                                        No reviews yet for this vehicle.
                                    </div>
                                ) : (
                                    reviews.map((review) => (
                                        <div key={review.reviewid} className="border-b border-gray-100 pb-6 last:border-b-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex text-orange-400">
                                                    {[...Array(5)].map((_, index) => (
                                                        <Star
                                                            key={index}
                                                            size={14}
                                                            fill={index < review.rating ? 'currentColor' : 'none'}
                                                            className={index < review.rating ? 'text-orange-400' : 'text-gray-300'}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-bold text-sm">{review.reviewer_name || 'Verified renter'}</span>
                                                <span className="text-gray-400 text-sm">• {new Date(review.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-gray-600">
                                                {review.comment || 'The renter left a star rating without additional comments.'}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Plan Your Trip</h2>
                                <p className="text-lg font-semibold text-gray-900 mt-3">
                                    From {formatLkr(vehicle.price)}/day
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Base daily rate before live dynamic pricing.</p>
                                <p className="text-sm text-gray-500 mt-1">Choose your dates and continue to see the live dynamic price.</p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        value={startDate}
                                        min={new Date().toISOString().slice(0, 10)}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setDateError('');
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        value={endDate}
                                        min={startDate || new Date().toISOString().slice(0, 10)}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setDateError('');
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleBookNow}
                                className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30"
                            >
                                Book Now
                            </button>

                            {dateError && <p className="mt-3 text-sm text-red-600">{dateError}</p>}
                            <p className="text-center text-sm text-gray-400 mt-4">You will review the live dynamic price on the next step.</p>
                        </div>
                    </div>
                </div>
            </div>

            <MessagePopup
                isOpen={isMessagePopupOpen}
                onClose={() => setIsMessagePopupOpen(false)}
                ownerUid={ownerUid}
                ownerName={ownerName}
                vehicleId={vehicle.id}
                vehicleName={vehicle.name}
                currentUserUid={currentUserUid}
            />
        </div>
    );
};

export default VehicleDetails;
