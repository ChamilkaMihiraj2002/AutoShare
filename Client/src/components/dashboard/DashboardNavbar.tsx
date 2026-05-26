import { Car, User, LogOut, Settings, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { clearAuthToken } from '../../lib/auth';
import { getMyProfile } from '../../lib/api';
import { DEFAULT_AVATAR, getProfileDisplayName, getRoleLabel, hasRole, PROFILE_UPDATED_EVENT, resolveAvatarUrl } from '../../lib/profile';
import type { UserProfile } from '../../types';
import NotificationBell from '../notifications/NotificationBell';
import OwnerMessagesPopup from '../messages/OwnerMessagesPopup';

const DashboardNavbar = () => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showMessagesPopup, setShowMessagesPopup] = useState(false);
    const [userName, setUserName] = useState('User');
    const [roleLabel, setRoleLabel] = useState('Owner');
    const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
    const [renterDestination, setRenterDestination] = useState('/');
    const [canSwitchToRenter, setCanSwitchToRenter] = useState(false);

    const closeProfileMenu = () => setShowProfileMenu(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await getMyProfile();
                setUserName(getProfileDisplayName(profile.full_name, profile.email));
                setRoleLabel(getRoleLabel(profile.roles));
                setAvatarSrc(resolveAvatarUrl(profile.avatar_url));
                const renterAccess = hasRole(profile.roles, 'renter') || hasRole(profile.roles, 'user');
                setCanSwitchToRenter(renterAccess);
                setRenterDestination(renterAccess ? '/user-dashboard' : '/');
            } catch {
                // Keep fallback labels if profile request fails.
            }
        };
        void loadProfile();
    }, []);

    useEffect(() => {
        const handleProfileUpdated = (event: Event) => {
            const profile = (event as CustomEvent<UserProfile>).detail;
            if (!profile) return;

            setUserName(getProfileDisplayName(profile.full_name, profile.email));
            setRoleLabel(getRoleLabel(profile.roles));
            setAvatarSrc(resolveAvatarUrl(profile.avatar_url));
            const renterAccess = hasRole(profile.roles, 'renter') || hasRole(profile.roles, 'user');
            setCanSwitchToRenter(renterAccess);
            setRenterDestination(renterAccess ? '/user-dashboard' : '/');
        };

        window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener);
        return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener);
    }, []);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white px-4 py-3 sm:px-6 md:px-8 lg:px-12">
            {/* Logo */}
            <div className="flex items-center justify-between gap-3">
                <Link to="/" className="min-w-0 flex items-center gap-2 font-bold text-gray-900">
                    <div className="rounded-lg bg-[#003049] p-1.5 text-white">
                    <Car size={24} />
                    </div>
                    <span className="truncate text-base sm:text-lg md:text-xl">AutoShare</span>
                </Link>

                {/* User Actions */}
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <NotificationBell mode="owner" pageRoute="/dashboard/notifications" />
                    <button
                        type="button"
                        aria-label="Open messages"
                        onClick={() => setShowMessagesPopup((current) => !current)}
                        className="relative rounded-full border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                    >
                        <MessageSquare size={18} />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 pl-1.5 transition hover:bg-gray-100 sm:pl-3"
                        >
                            <span className="hidden max-w-[140px] truncate text-sm font-bold text-gray-700 md:block">{userName}</span>
                            <img src={avatarSrc} alt="Profile" className="h-8 w-8 rounded-full object-cover" />
                        </button>

                        {/* Dropdown Menu */}
                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-100 bg-white py-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                                <div className="mb-2 border-b border-gray-50 px-4 py-2">
                                    <p className="font-bold text-sm text-gray-900">{userName}</p>
                                    <p className="text-xs text-gray-500">{roleLabel}</p>
                                </div>
                                {canSwitchToRenter && (
                                    <Link
                                        to={renterDestination}
                                        onClick={closeProfileMenu}
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <User size={16} /> Switch to Renter
                                    </Link>
                                )}
                                <Link
                                    to="/dashboard/profile"
                                    onClick={closeProfileMenu}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <User size={16} /> Profile
                                </Link>
                                <Link
                                    to="/dashboard/settings"
                                    onClick={closeProfileMenu}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <Settings size={16} /> Settings
                                </Link>
                                <div className="my-2 h-px bg-gray-50"></div>
                                <Link
                                    to="/signin"
                                    onClick={() => {
                                        closeProfileMenu();
                                        clearAuthToken();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                    <LogOut size={16} /> Sign Out
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <OwnerMessagesPopup isOpen={showMessagesPopup} onClose={() => setShowMessagesPopup(false)} />
        </nav>
    );
};

export default DashboardNavbar;
