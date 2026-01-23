import { userBookings } from '../../data/mockData';
import { Calendar, Clock } from 'lucide-react';

const UserBookings = () => {
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'completed': return 'bg-green-50 text-green-700 border-green-100';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>

            <div className="space-y-4">
                {userBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 transition hover:shadow-md">
                        {/* Vehicle Image */}
                        <div className="w-full md:w-64 h-40 rounded-xl overflow-hidden flex-shrink-0">
                            <img
                                src={booking.vehicle.image}
                                alt={booking.vehicle.name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Booking Details */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold text-gray-900">{booking.vehicle.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm mt-1">Owned by {booking.vehicle.owner}</p>
                                    </div>
                                    <span className="font-bold text-lg text-[#003049]">{booking.total}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="flex items-center gap-2 text-gray-600 font-medium text-sm bg-gray-50 p-3 rounded-lg">
                                        <Calendar size={18} className="text-[#003049]" />
                                        {booking.dates}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 font-medium text-sm bg-gray-50 p-3 rounded-lg">
                                        <Clock size={18} className="text-[#003049]" />
                                        {booking.bookingId}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 justify-end">
                                {booking.status === 'Upcoming' && (
                                    <>
                                        <button className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition text-sm">
                                            Cancel Booking
                                        </button>
                                        <button className="px-4 py-2 bg-[#003049] text-white font-bold rounded-lg hover:bg-[#002538] transition text-sm shadow-lg shadow-[#003049]/20">
                                            Modify Dates
                                        </button>
                                    </>
                                )}
                                {booking.status === 'Completed' && (
                                    <button className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition text-sm shadow-lg shadow-orange-500/20">
                                        Leave a Review
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserBookings;
