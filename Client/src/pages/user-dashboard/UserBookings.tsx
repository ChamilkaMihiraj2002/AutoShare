import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { getMyRents, getPublicVehicles, getUserPublicProfile } from '../../lib/api';
import LoadingScreen from '../../components/common/LoadingScreen';
import { getPrimaryVehicleImage, getProfileDisplayName } from '../../lib/profile';
import type { RentApi } from '../../types';

type BookingDisplay = {
    ownerName: string;
    vehicleName: string;
    vehicleImage: string;
};

const UserBookings = () => {
    const [bookings, setBookings] = React.useState<RentApi[]>([]);
    const [displayByRentId, setDisplayByRentId] = React.useState<Map<string, BookingDisplay>>(new Map());
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        const loadBookings = async () => {
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
        };
        void loadBookings();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'completed': return 'bg-green-50 text-green-700 border-green-100';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const formatBookingStatus = (endDate: string) => {
        return new Date(endDate) > new Date() ? 'Upcoming' : 'Completed';
    };

    if (loading) {
        return <LoadingScreen message="Loading your bookings..." />;
    }

    if (error) {
        return <div className="text-red-600">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>

            <div className="space-y-4">
                {bookings.map((booking) => {
                    const status = formatBookingStatus(booking.end_date);
                    const display = displayByRentId.get(booking.rentid);
                    const vehicleName = display?.vehicleName || 'Vehicle';
                    const ownerName = display?.ownerName || 'Owner';
                    const vehicleImage = display?.vehicleImage || getPrimaryVehicleImage();
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
                                        <button className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition text-sm">
                                            Cancel Booking
                                        </button>
                                        <button className="px-4 py-2 bg-[#003049] text-white font-bold rounded-lg hover:bg-[#002538] transition text-sm shadow-lg shadow-[#003049]/20">
                                            Modify Dates
                                        </button>
                                    </>
                                )}
                                {status === 'Completed' && (
                                    <button className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition text-sm shadow-lg shadow-orange-500/20">
                                        Leave a Review
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
};

export default UserBookings;
