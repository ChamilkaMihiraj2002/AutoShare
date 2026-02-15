import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import DashboardNavbar from '../components/dashboard/DashboardNavbar';
import { Plus } from 'lucide-react';

const DashboardLayout = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <DashboardNavbar />

            <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-[#003049]">Owner Dashboard</h1>
                        <p className="text-gray-500 mt-1">Manage your vehicles and track earnings</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard/vehicles?new=1')}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-lg shadow-orange-500/20"
                    >
                        <Plus size={20} />
                        Add New Vehicle
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-8 border-b border-gray-200 mb-8 overflow-x-auto">
                    <NavLink to="/dashboard" end className={({ isActive }) => `pb-4 whitespace-nowrap transition-colors ${isActive ? "text-[#003049] border-b-2 border-[#003049] font-bold" : "text-gray-500 hover:text-gray-900 font-medium border-b-2 border-transparent"}`}>
                        Overview
                    </NavLink>
                    <NavLink to="/dashboard/vehicles" className={({ isActive }) => `pb-4 whitespace-nowrap transition-colors ${isActive ? "text-[#003049] border-b-2 border-[#003049] font-bold" : "text-gray-500 hover:text-gray-900 font-medium border-b-2 border-transparent"}`}>
                        My Vehicles
                    </NavLink>
                    <NavLink to="/dashboard/requests" className={({ isActive }) => `pb-4 whitespace-nowrap transition-colors ${isActive ? "text-[#003049] border-b-2 border-[#003049] font-bold" : "text-gray-500 hover:text-gray-900 font-medium border-b-2 border-transparent"}`}>
                        Booking Requests
                    </NavLink>
                    <NavLink to="/dashboard/earnings" className={({ isActive }) => `pb-4 whitespace-nowrap transition-colors ${isActive ? "text-[#003049] border-b-2 border-[#003049] font-bold" : "text-gray-500 hover:text-gray-900 font-medium border-b-2 border-transparent"}`}>
                        Earnings
                    </NavLink>
                    <NavLink to="/dashboard/settings" className={({ isActive }) => `pb-4 whitespace-nowrap transition-colors ${isActive ? "text-[#003049] border-b-2 border-[#003049] font-bold" : "text-gray-500 hover:text-gray-900 font-medium border-b-2 border-transparent"}`}>
                        Settings
                    </NavLink>
                </div>

                {/* Page Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
