import { Calendar } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import { dashboardStats, pendingRequests, recentActivity } from '../../data/mockData';

const OwnerDashboard = () => {
    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((stat, index) => (
                    <StatCard
                        key={index}
                        label={stat.label}
                        value={stat.value}
                        subtext={stat.subtext}
                        subtextClass={stat.subtextClass}
                        icon={<stat.icon size={20} />}
                    />
                ))}
            </div>

            {/* Pending Requests Section */}
            <div>
                <h2 className="text-lg font-bold text-[#003049] mb-4">Pending Booking Requests</h2>
                <div className="space-y-4">
                    {pendingRequests.map((request) => (
                        <div key={request.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-full ${request.renter.avatarColor} flex items-center justify-center text-xl font-bold ${request.renter.textColor}`}>
                                    {request.renter.initials}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{request.renter.name}</h3>
                                    <p className="text-sm text-gray-500">{request.vehicle}</p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                        <span className="flex items-center gap-1"><Calendar size={14} /> {request.dates}</span>
                                        <span className="font-bold text-gray-900">{request.amount}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition">Decline</button>
                                <button className="px-6 py-2.5 rounded-xl bg-[#003049] text-white font-bold hover:bg-[#002538] transition">Accept</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <h2 className="text-lg font-bold text-[#003049] mb-4">Recent Activity</h2>
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                    {recentActivity.map((activity) => (
                        <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition">
                            <div className={`p-3 ${activity.bgColor} ${activity.iconColor} rounded-xl`}>
                                <activity.icon size={18} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900 text-sm">{activity.title}</p>
                                <p className="text-xs text-gray-500">{activity.description}</p>
                            </div>
                            <span className="text-xs font-medium text-gray-400">{activity.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
