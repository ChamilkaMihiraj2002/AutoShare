import React from 'react';
import { Calendar } from 'lucide-react';

import StatCard from '../../components/dashboard/StatCard';
import { recentActivity } from '../../data/mockData';
import { useOwnerEarnings } from '../../hooks/useOwnerEarnings';
import { getMyVehicles, getOwnerRents, getUserPublicProfile } from '../../lib/api';
import { buildOwnerDashboardStats } from '../../lib/ownerEarnings';
import { formatLkr } from '../../lib/currency';
import { getProfileDisplayName } from '../../lib/profile';

type PendingOwnerRequest = {
    id: string;
    renterUid: string;
    renterName: string;
    vehicleName: string;
    dates: string;
    amount: string;
};

const OwnerDashboard = () => {
    const { earnings } = useOwnerEarnings();
    const [pendingRequests, setPendingRequests] = React.useState<PendingOwnerRequest[]>([]);
    const [ownerRents, setOwnerRents] = React.useState<Awaited<ReturnType<typeof getOwnerRents>>>([]);
    const [ownerVehicles, setOwnerVehicles] = React.useState<Awaited<ReturnType<typeof getMyVehicles>>>([]);

    const stats = buildOwnerDashboardStats(earnings, ownerRents, ownerVehicles);

    React.useEffect(() => {
        const loadPending = async () => {
            try {
                const [rents, vehicles] = await Promise.all([getOwnerRents(), getMyVehicles()]);
                setOwnerRents(rents);
                setOwnerVehicles(vehicles);
                const renterIds = Array.from(new Set(rents.map((rent) => rent.renter_uid)));
                const renterEntries = await Promise.all(
                    renterIds.map(async (uid) => {
                        try {
                            const profile = await getUserPublicProfile(uid);
                            return [uid, getProfileDisplayName(profile.full_name, profile.email)] as const;
                        } catch {
                            return [uid, uid] as const;
                        }
                    }),
                );
                const renterNameByUid = new Map(renterEntries);

                const vehicleById = new Map(
                    vehicles.map((vehicle) => [
                        vehicle.vehicleid,
                        { name: `${vehicle.brand} ${vehicle.model}`, price: vehicle.price },
                    ]),
                );

                const upcoming = rents
                    .filter((rent) => new Date(rent.end_date) > new Date())
                    .map((rent) => {
                        const vehicle = vehicleById.get(rent.vehicle_id);
                        const start = new Date(rent.start_date);
                        const end = new Date(rent.end_date);
                        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                        const amount = vehicle ? formatLkr(vehicle.price * days) : '-';
                        return {
                            id: rent.rentid,
                            renterUid: rent.renter_uid,
                            renterName: renterNameByUid.get(rent.renter_uid) || rent.renter_uid,
                            vehicleName: vehicle?.name || `Vehicle #${rent.vehicle_id}`,
                            dates: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
                            amount,
                        };
                    })
                    .slice(0, 3);

                setPendingRequests(upcoming);
            } catch {
                setPendingRequests([]);
                setOwnerRents([]);
                setOwnerVehicles([]);
            }
        };

        void loadPending();
    }, []);

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
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
                {pendingRequests.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 text-sm text-gray-500">
                        No pending booking requests.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingRequests.map((request) => (
                            <div key={request.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                                        {request.renterName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{request.renterName}</h3>
                                        <p className="text-sm text-gray-500">{request.vehicleName}</p>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1"><Calendar size={14} /> {request.dates}</span>
                                            <span className="font-bold text-gray-900">{request.amount}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition">View</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
