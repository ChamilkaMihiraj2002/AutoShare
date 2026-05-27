import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Star } from 'lucide-react';
import { cancelMyRent, getMyRents, getPublicVehicles, getUserPublicProfile, updateMyRent } from '../../lib/api';
import LoadingScreen from '../../components/common/LoadingScreen';
import Modal from '../../components/common/Modal';
import { getPrimaryVehicleImage, getProfileDisplayName } from '../../lib/profile';
import type { RentApi } from '../../types';

type BookingDisplay = {
    ownerName: string;
    vehicleName: string;
    vehicleImage: string;
};

const REVIEW_STORAGE_KEY = 'autoshare-submitted-reviews';

const UserBookings = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = React.useState<RentApi[]>([]);
    const [displayByRentId, setDisplayByRentId] = React.useState<Map<string, BookingDisplay>>(new Map());
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [submittingRentId, setSubmittingRentId] = React.useState<string | null>(null);
    const [editingBooking, setEditingBooking] = React.useState<RentApi | null>(null);
    const [editStartDate, setEditStartDate] = React.useState('');
    const [editEndDate, setEditEndDate] = React.useState('');
    const [editError, setEditError] = React.useState('');
    const [reviewingBooking, setReviewingBooking] = React.useState<RentApi | null>(null);
    const [reviewRating, setReviewRating] = React.useState(0);
    const [reviewComment, setReviewComment] = React.useState('');
    const [reviewError, setReviewError] = React.useState('');
    const [reviewedRentIds, setReviewedRentIds] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const saved = window.localStorage.getItem(REVIEW_STORAGE_KEY);
            if (!saved) return;
            const parsed = JSON.parse(saved) as Record<string, unknown>;
            setReviewedRentIds(new Set(Object.keys(parsed)));
        } catch {
            setReviewedRentIds(new Set());
        }
    }, []);

    const loadBookings = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getMyRents();
            setBookings(result);

            const [vehicles, ownerEntries] = await Promise.all([
                getPublicVehicles(),
                Promise.all(
                    Array.from(new Set(result.map((booking) => booking.owner_uid))).map(async (uid) => {
                        try {
                            const profile = await getUserPublicProfile(uid);
                            return [uid, getProfileDisplayName(profile.full_name, profile.email)] as const;
                        } catch {
                            return [uid, 'Owner'] as const;
                        }
                    }),
                ),
            ]);

            const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.vehicleid, vehicle]));
            const ownerNameByUid = new Map(ownerEntries);

            const nextDisplayByRentId = new Map<string, BookingDisplay>();
            result.forEach((booking) => {
                const vehicle = vehicleById.get(booking.vehicle_id);
                nextDisplayByRentId.set(booking.rentid, {
                    ownerName: ownerNameByUid.get(booking.owner_uid) || 'Owner',
                    vehicleName: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicle',
                    vehicleImage: getPrimaryVehicleImage(vehicle?.image_urls, vehicle?.image_url),
                });
            });
            setDisplayByRentId(nextDisplayByRentId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadBookings();
    }, [loadBookings]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'completed': return 'bg-green-50 text-green-700 border-green-100';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const formatBookingStatus = (booking: RentApi) => {
        if (booking.booking_status === 'cancelled') return 'Cancelled';
        if (booking.booking_status === 'completed') return 'Completed';
        if (booking.booking_status === 'accepted' && new Date(booking.end_date) <= new Date()) {
            return 'Completed';
        }
        return 'Upcoming';
    };

    const handleCancelBooking = async (booking: RentApi) => {
        setSubmittingRentId(booking.rentid);
        setError('');
        try {
            const updated = await cancelMyRent(booking.rentid);
            setBookings((current) => current.map((entry) => (entry.rentid === booking.rentid ? updated : entry)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cancel booking');
        } finally {
            setSubmittingRentId(null);
        }
    };

    const openModifyModal = (booking: RentApi) => {
        setEditingBooking(booking);
        setEditStartDate(booking.start_date.slice(0, 10));
        setEditEndDate(booking.end_date.slice(0, 10));
        setEditError('');
    };

    const handleModifyDates = async () => {
        if (!editingBooking) return;
        if (!editStartDate || !editEndDate) {
            setEditError('Please select both dates.');
            return;
        }
        if (new Date(editEndDate) <= new Date(editStartDate)) {
            setEditError('End date must be after start date.');
            return;
        }

        setSubmittingRentId(editingBooking.rentid);
        setEditError('');
        try {
            const updated = await updateMyRent(editingBooking.rentid, {
                start_date: new Date(editStartDate).toISOString(),
                end_date: new Date(editEndDate).toISOString(),
            });
            setBookings((current) => current.map((entry) => (entry.rentid === editingBooking.rentid ? updated : entry)));
            setEditingBooking(null);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Failed to update booking dates');
        } finally {
            setSubmittingRentId(null);
        }
    };

    const openReviewModal = (booking: RentApi) => {
        setReviewingBooking(booking);
        setReviewRating(0);
        setReviewComment('');
        setReviewError('');
    };

    const handleSubmitReview = () => {
        if (!reviewingBooking) return;
        if (reviewRating < 1) {
            setReviewError('Please select a rating before submitting your review.');
            return;
        }

        try {
            const existing = typeof window === 'undefined'
                ? {}
                : JSON.parse(window.localStorage.getItem(REVIEW_STORAGE_KEY) || '{}') as Record<string, unknown>;

            const nextReviews = {
                ...existing,
                [reviewingBooking.rentid]: {
                    rentId: reviewingBooking.rentid,
                    vehicleId: reviewingBooking.vehicle_id,
                    ownerUid: reviewingBooking.owner_uid,
                    rating: reviewRating,
                    comment: reviewComment.trim(),
                    submittedAt: new Date().toISOString(),
                },
            };

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(nextReviews));
            }

            setReviewedRentIds((current) => new Set(current).add(reviewingBooking.rentid));
            setReviewingBooking(null);
            setReviewRating(0);
            setReviewComment('');
            setReviewError('');
        } catch {
            setReviewError('Failed to save your review. Please try again.');
        }
    };

    if (loading) {
        return <LoadingScreen message="Loading your bookings..." />;
    }

    if (error) {
        return <div className="text-red-600">{error}</div>;
    }

    return (
        <>
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>

                <div className="space-y-4">
                    {bookings.map((booking) => {
                        const status = formatBookingStatus(booking);
                        const display = displayByRentId.get(booking.rentid);
                        const vehicleName = display?.vehicleName || 'Vehicle';
                        const ownerName = display?.ownerName || 'Owner';
                        const vehicleImage = display?.vehicleImage || getPrimaryVehicleImage();
                        const hasSubmittedReview = reviewedRentIds.has(booking.rentid);
                        return (
                    <div key={booking.rentid} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 transition hover:shadow-md">
                        {/* Vehicle Image */}
                        <div className="w-full md:w-64 h-40 rounded-xl overflow-hidden flex-shrink-0">
                            <img
                                src={vehicleImage}
                                alt={vehicleName}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Booking Details */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold text-gray-900">{vehicleName}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
                                                {status}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm mt-1">Owned by {ownerName}</p>
                                    </div>
                                    <span className="font-bold text-lg text-[#003049]">-</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="flex items-center gap-2 text-gray-600 font-medium text-sm bg-gray-50 p-3 rounded-lg">
                                        <Calendar size={18} className="text-[#003049]" />
                                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 font-medium text-sm bg-gray-50 p-3 rounded-lg">
                                        <Clock size={18} className="text-[#003049]" />
                                        #{booking.rentid}
                                    </div>
                                </div>
                                <div className="mt-3 text-xs text-gray-500">
                                    <span className="mr-3">Pickup: {booking.pickup_option === 'delivery' ? 'Delivery' : 'Self Pickup'}</span>
                                    <span className="mr-3">Insurance: {(booking.insurance_plan || 'basic').toUpperCase()}</span>
                                    <span>Child Seats: {booking.child_seat_count ?? 0}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 justify-end">
                                {status === 'Upcoming' && (
                                    <>
                                        <button
                                            onClick={() => void handleCancelBooking(booking)}
                                            disabled={submittingRentId === booking.rentid}
                                            className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition text-sm disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {submittingRentId === booking.rentid ? 'Cancelling...' : 'Cancel Booking'}
                                        </button>
                                        <button
                                            onClick={() => openModifyModal(booking)}
                                            disabled={submittingRentId === booking.rentid}
                                            className="px-4 py-2 bg-[#003049] text-white font-bold rounded-lg hover:bg-[#002538] transition text-sm shadow-lg shadow-[#003049]/20 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Modify Dates
                                        </button>
                                        <button
                                            onClick={() => navigate(`/user-dashboard/messages?vehicleId=${booking.vehicle_id}&ownerUid=${booking.owner_uid}`)}
                                            className="px-4 py-2 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition text-sm"
                                        >
                                            Message Owner
                                        </button>
                                    </>
                                )}
                                {status === 'Completed' && (
                                    <button
                                        onClick={() => openReviewModal(booking)}
                                        disabled={hasSubmittedReview}
                                        className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition text-sm shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:bg-orange-200 disabled:shadow-none"
                                    >
                                        {hasSubmittedReview ? 'Review Submitted' : 'Leave a Review'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )})}
                </div>
            </div>
            <Modal
                isOpen={editingBooking !== null}
                onClose={() => setEditingBooking(null)}
                title="Modify Booking Dates"
                maxWidthClassName="max-w-xl"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                            <input
                                type="date"
                                value={editStartDate}
                                onChange={(event) => setEditStartDate(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                            <input
                                type="date"
                                value={editEndDate}
                                onChange={(event) => setEditEndDate(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2"
                            />
                        </div>
                    </div>
                    {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setEditingBooking(null)}
                            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => void handleModifyDates()}
                            disabled={editingBooking ? submittingRentId === editingBooking.rentid : false}
                            className="rounded-lg bg-[#003049] px-4 py-2 text-sm font-bold text-white hover:bg-[#002538] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {editingBooking && submittingRentId === editingBooking.rentid ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </Modal>
            <Modal
                isOpen={reviewingBooking !== null}
                onClose={() => setReviewingBooking(null)}
                title="Leave a Review"
                maxWidthClassName="max-w-xl"
            >
                <div className="space-y-5">
                    <div>
                        <p className="text-sm text-gray-500">Share your experience for this completed trip.</p>
                        <p className="mt-1 font-semibold text-gray-900">
                            {reviewingBooking ? displayByRentId.get(reviewingBooking.rentid)?.vehicleName || 'Vehicle' : 'Vehicle'}
                        </p>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Your Rating</label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((value) => {
                                const active = value <= reviewRating;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            setReviewRating(value);
                                            setReviewError('');
                                        }}
                                        className="rounded-full p-1 transition hover:scale-105"
                                        aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                                    >
                                        <Star className={`h-7 w-7 ${active ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Comments</label>
                        <textarea
                            value={reviewComment}
                            onChange={(event) => setReviewComment(event.target.value)}
                            rows={4}
                            placeholder="Tell others about the vehicle, owner communication, and overall trip."
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
                        />
                    </div>
                    {reviewError ? <p className="text-sm text-red-600">{reviewError}</p> : null}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setReviewingBooking(null)}
                            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitReview}
                            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
                        >
                            Submit Review
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default UserBookings;
