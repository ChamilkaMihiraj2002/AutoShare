import { Car, Menu, X, User, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { clearAuthToken, getAuthToken } from '../../lib/auth';
import { getMyProfile } from '../../lib/api';
import { DEFAULT_AVATAR, getDefaultDashboardPath, getProfileDisplayName, hasRole, PROFILE_UPDATED_EVENT, resolveAvatarUrl } from '../../lib/profile';
import type { UserProfile } from '../../types';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileName, setProfileName] = useState('User');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState(DEFAULT_AVATAR);
  const [dashboardPath, setDashboardPath] = useState('/user-dashboard');
  const [settingsPath, setSettingsPath] = useState('/user-dashboard/settings');
  const [canSwitchToOwner, setCanSwitchToOwner] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isUserDashboard = location.pathname.startsWith('/user-dashboard');

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [menuOpen]);

  useEffect(() => {
    const loadProfile = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoggedIn(false);
        setProfileName('User');
        setProfileEmail('');
        setProfileAvatar(DEFAULT_AVATAR);
        setDashboardPath('/user-dashboard');
        setSettingsPath('/user-dashboard/settings');
        setCanSwitchToOwner(false);
        return;
      }

      try {
        const profile = await getMyProfile();
        setIsLoggedIn(true);
        setProfileName(getProfileDisplayName(profile.full_name, profile.email));
        setProfileEmail(profile.email);
        setProfileAvatar(resolveAvatarUrl(profile.avatar_url));
        setDashboardPath(getDefaultDashboardPath(profile));
        setSettingsPath(getDefaultDashboardPath(profile) === '/dashboard' ? '/dashboard/settings' : '/user-dashboard/settings');
        setCanSwitchToOwner(hasRole(profile.roles, 'vehicle_owner'));
      } catch {
        setIsLoggedIn(false);
        setProfileName('User');
        setProfileEmail('');
        setProfileAvatar(DEFAULT_AVATAR);
        setDashboardPath('/user-dashboard');
        setSettingsPath('/user-dashboard/settings');
        setCanSwitchToOwner(false);
      }
    };

    void loadProfile();
  }, [location.pathname]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const profile = (event as CustomEvent<UserProfile>).detail;
      if (!profile) return;

      setIsLoggedIn(true);
      setProfileName(getProfileDisplayName(profile.full_name, profile.email));
      setProfileEmail(profile.email);
      setProfileAvatar(resolveAvatarUrl(profile.avatar_url));
      setDashboardPath(getDefaultDashboardPath(profile));
      setSettingsPath(getDefaultDashboardPath(profile) === '/dashboard' ? '/dashboard/settings' : '/user-dashboard/settings');
      setCanSwitchToOwner(hasRole(profile.roles, 'vehicle_owner'));
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated as EventListener);
  }, []);

  // Dynamic styling based on current page
  const navBaseClass = isHome
    ? "absolute bg-transparent text-white"
    : "sticky top-0 bg-white/80 backdrop-blur-md text-gray-800 border-b border-gray-100";

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={`w-full z-[100] flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300 ${navBaseClass}`}>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 font-bold text-xl group" onClick={closeMenu}>
        <div className="bg-[#003049] p-1.5 rounded-lg text-white group-hover:scale-110 transition-transform">
          <Car size={24} />
        </div>
        AutoShare
      </Link>

      {/* Desktop Menu */}
      <div className="hidden md:flex gap-8 text-sm font-semibold uppercase tracking-wide">
        <Link to="/" className="hover:text-orange-500 transition-colors">Home</Link>
        <Link to="/services" className="hover:text-orange-500 transition-colors">Services</Link>
        <Link to="/about" className="hover:text-orange-500 transition-colors">About</Link>
        <Link to="/contact" className="hover:text-orange-500 transition-colors">Contact Us</Link>
      </div>

      {/* Auth Buttons / Profile */}
      <div className="hidden md:flex items-center gap-6">
        {isLoggedIn ? (
          <>
            {isUserDashboard && canSwitchToOwner && (
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-gray-500 hover:text-orange-600 transition"
              >
                Switch to Vehicle Owner
              </Link>
            )}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 pl-3 bg-gray-50 rounded-full hover:bg-gray-100 transition border border-gray-200"
              >
                <span className="text-sm font-bold text-gray-700">{profileName}</span>
                <img src={profileAvatar} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-gray-50 mb-2">
                    <p className="font-bold text-sm text-gray-900">{profileName}</p>
                    <p className="text-xs text-gray-500">{profileEmail}</p>
                  </div>
                  <Link to={dashboardPath} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium">
                    <User size={16} /> My Profile
                  </Link>
                  <Link to={settingsPath} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium">
                    <Settings size={16} /> Settings
                  </Link>
                  <div className="h-px bg-gray-50 my-2"></div>
                  <Link
                    to="/signin"
                    onClick={clearAuthToken}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium"
                  >
                    <LogOut size={16} /> Sign Out
                  </Link>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/signin" className="text-sm font-bold hover:opacity-80 transition">Sign In</Link>
            <Link to="/signup" className="bg-orange-500 px-6 py-2.5 rounded-xl text-sm font-extrabold hover:bg-orange-600 transition text-white shadow-lg shadow-orange-500/20">
              Sign Up
            </Link>
          </>
        )}
      </div>

      {/* Mobile Toggle */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-gray-100/10 transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Sidebar Overlay */}
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] md:hidden transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className={`absolute right-0 top-0 h-full w-[280px] bg-white text-gray-900 shadow-2xl transition-transform duration-300 transform ${menuOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <span className="font-bold text-xl flex items-center gap-2">
                <div className="bg-[#003049] p-1 rounded-md text-white"><Car size={20} /></div>
                AutoShare
              </span>
              <button onClick={closeMenu} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={24} /></button>
            </div>

            <div className="flex flex-col gap-5 font-bold text-lg">
              <Link to="/" className="hover:text-orange-500" onClick={closeMenu}>Home</Link>
              <Link to="/services" className="hover:text-orange-500" onClick={closeMenu}>Services</Link>
              <Link to="/about" className="hover:text-orange-500" onClick={closeMenu}>About</Link>
              <Link to="/contact" className="hover:text-orange-500" onClick={closeMenu}>Contact Us</Link>
              {isLoggedIn && (
                <Link to={dashboardPath} className="hover:text-orange-500" onClick={closeMenu}>My Dashboard</Link>
              )}
              {isLoggedIn && isUserDashboard && canSwitchToOwner && (
                <Link to="/dashboard" className="hover:text-orange-500" onClick={closeMenu}>Switch to Vehicle Owner</Link>
              )}
            </div>

            <div className="mt-auto border-t border-gray-100 pt-8 flex flex-col gap-4">
              {isLoggedIn ? (
                <Link
                  to="/signin"
                  className="w-full text-center py-3 font-bold border border-red-200 text-red-600 rounded-xl"
                  onClick={() => {
                    clearAuthToken();
                    closeMenu();
                  }}
                >
                  Sign Out
                </Link>
              ) : (
                <>
                  <Link to="/signin" className="w-full text-center py-3 font-bold border border-gray-200 rounded-xl" onClick={closeMenu}>Sign In</Link>
                  <Link to="/signup" className="w-full text-center py-3 font-bold bg-orange-500 text-white rounded-xl" onClick={closeMenu}>Sign Up</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
