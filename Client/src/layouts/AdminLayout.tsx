import { useState } from 'react';
import { BarChart3, CalendarCheck2, Car, LogOut, Users, Menu, X, Bell, CarFront, SlidersHorizontal } from 'lucide-react';
import { Navigate, NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { clearAdminAuthToken, getAdminAuthToken } from '../lib/auth';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = getAdminAuthToken();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!token) {
    return <Navigate to="/admin/signin" replace />;
  }

  const getPageTitle = () => {
    const path = location.pathname.replace(/\/+$/, '').toLowerCase();
    if (path === '/admin') return 'Overview';
    if (path === '/admin/users') return 'User Management';
    if (path === '/admin/bookings') return 'Bookings';
    if (path === '/admin/vehicles') return 'Vehicles Verification';
    if (path === '/admin/pricing') return 'Dynamic Pricing';
    return 'Admin Console';
  };

  const navItems = [
    { path: '/admin', label: 'Overview', icon: BarChart3, end: true },
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/bookings', label: 'Bookings', icon: CalendarCheck2 },
    { path: '/admin/vehicles', label: 'Vehicles Verification', icon: CarFront },
    { path: '/admin/pricing', label: 'Dynamic Pricing', icon: SlidersHorizontal },
  ];

  const handleLogout = () => {
    clearAdminAuthToken();
    navigate('/admin/signin');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#001d2d] border-r border-[#082E46] z-30 transition-all duration-300">
        {/* Sidebar Brand header */}
        <Link to="/admin" className="flex items-center gap-3 px-6 py-6 border-b border-[#082E46] hover:bg-slate-900/10 transition-colors">
          <div className="rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-2 text-white shadow-lg shadow-orange-500/25">
            <Car size={20} className="transform hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">Admin Console</p>
            <h1 className="text-base font-extrabold text-white tracking-wide">AutoShare</h1>
          </div>
        </Link>

        {/* Sidebar Nav links */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} className={`transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#082E46] bg-slate-950/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/40 py-2.5 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 hover:shadow-md cursor-pointer"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <header className="sticky top-0 z-40 flex md:hidden w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Menu size={22} />
          </button>
          <Link to="/admin" className="flex items-center gap-2 font-bold text-slate-900">
            <div className="rounded-lg bg-[#003049] p-1.5 text-white">
              <Car size={16} />
            </div>
            <span className="text-sm font-extrabold tracking-wide">AutoShare</span>
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer container */}
          <div className="fixed inset-y-0 left-0 w-72 bg-[#001d2d] border-r border-[#082E46] flex flex-col z-50 animate-slide-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#082E46]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 p-2 text-white">
                  <Car size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400">Admin Console</p>
                  <h1 className="text-sm font-extrabold text-white">AutoShare</h1>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-[#082E46] bg-slate-950/20">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/40 py-2.5 text-sm font-semibold text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 hidden md:flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-slate-200/80 px-8 py-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{getPageTitle()}</h1>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-medium">
              <Link to="/admin" className="hover:text-orange-500 transition-colors">Admin</Link>
              <span>/</span>
              <span className="text-slate-500">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition" title="Notifications">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white"></span>
            </button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm shadow-inner shadow-orange-500/5">
                AD
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 leading-none">Administrator</p>
                <p className="text-[11px] font-semibold text-orange-500 mt-1 uppercase tracking-wider">Super Control</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
