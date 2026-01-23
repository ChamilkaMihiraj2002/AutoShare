import { Car, User, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { currentUser } from '../../data/mockData';

const DashboardNavbar = () => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    return (
        <nav className="w-full bg-white border-b border-gray-100 px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 z-50">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
                <div className="bg-[#003049] p-1.5 rounded-lg text-white">
                    <Car size={24} />
                </div>
                AutoShare
            </Link>

            {/* User Actions */}
            <div className="flex items-center gap-4">
                <Link to="/" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition mr-4 hidden md:block">
                    Switch to Renter
                </Link>
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="p-1 rounded-full hover:bg-gray-100 transition border border-gray-200"
                    >
                        <img src={currentUser.avatar} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                    </button>

                    {/* Dropdown Menu */}
                    {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-2 border-b border-gray-50 mb-2">
                                <p className="font-bold text-sm text-gray-900">{currentUser.name}</p>
                                <p className="text-xs text-gray-500">{currentUser.role}</p>
                            </div>
                            <Link to="/dashboard/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <User size={16} /> Profile
                            </Link>
                            <Link to="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Settings size={16} /> Settings
                            </Link>
                            <div className="h-px bg-gray-50 my-2"></div>
                            <Link to="/signin" className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">
                                <LogOut size={16} /> Sign Out
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default DashboardNavbar;
