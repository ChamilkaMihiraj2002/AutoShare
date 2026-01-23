import { Calendar, Eye } from 'lucide-react';
import { pendingRequests } from '../../data/mockData';

const BookingRequests = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-[#003049]">All Booking Requests</h2>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search requests..."
                        className="w-full md:w-64 pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#003049] transition text-sm"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {pendingRequests.map((request) => (
                    <div key={request.id} className="bg-gray-50 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition cursor-pointer">
                        <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full ${request.renter.avatarColor} flex items-center justify-center text-sm font-bold ${request.renter.textColor}`}>
                                    {request.renter.initials}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-900">{request.renter.name}</h3>
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded uppercase tracking-wider">{request.status}</span>
                                </div>
                                <p className="text-sm font-medium text-gray-700">{request.vehicle}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {request.dates}</span>
                                    <span className="font-bold text-gray-900 text-base">{request.amount}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto">
                            <button className="flex-1 md:flex-none px-5 py-2 rounded-lg bg-[#003049] text-white text-sm font-bold hover:bg-[#002538] transition">Accept</button>
                            <button className="flex-1 md:flex-none px-5 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition">Decline</button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 transition"><Eye size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookingRequests;
