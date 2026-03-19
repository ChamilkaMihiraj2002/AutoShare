import { Outlet, NavLink } from 'react-router-dom';
import { User, Calendar, Heart, Settings } from 'lucide-react';

const UserDashboardLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-6">

                <div className="mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[#003049]">My Profile</h1>
                        <p className="text-gray-500 mt-2">Manage your account and view your rental activity</p>
                    </div>
                </div>

                {/* Dashboard Navigation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-8 inline-flex flex-wrap gap-1">
                    <NavLink
                        to="/user-dashboard"
                        end
                        className={({ isActive }) => `flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${isActive ? "bg-[#003049] text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                    >
                        <User size={18} />
                        Profile
                    </NavLink>
                    <NavLink
                        to="/user-dashboard/bookings"
                        className={({ isActive }) => `flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${isActive ? "bg-[#003049] text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                    >
                        <Calendar size={18} />
                        Bookings
                    </NavLink>
                    <NavLink
                        to="/user-dashboard/saved"
                        className={({ isActive }) => `flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${isActive ? "bg-[#003049] text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                    >
                        <Heart size={18} />
                        Saved
                    </NavLink>
                    <NavLink
                        to="/user-dashboard/settings"
                        className={({ isActive }) => `flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${isActive ? "bg-[#003049] text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}
                    >
                        <Settings size={18} />
                        Settings
                    </NavLink>
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>

            </div>
        </div>
    );
};

export default UserDashboardLayout;
