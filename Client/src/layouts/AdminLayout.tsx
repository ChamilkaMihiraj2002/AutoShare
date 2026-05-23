import { BarChart3, CalendarCheck2, Car, LogOut, Users } from 'lucide-react';
import { Navigate, NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { clearAdminAuthToken, getAdminAuthToken } from '../lib/auth';

const AdminLayout = () => {
  const navigate = useNavigate();
  const token = getAdminAuthToken();

  if (!token) {
    return <Navigate to="/admin/signin" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/admin" className="flex items-center gap-3 font-bold text-xl text-gray-900">
            <div className="rounded-lg bg-[#003049] p-2 text-white">
              <Car size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-500">Admin Panel</p>
              <h1 className="text-lg font-bold text-[#003049]">AutoShare Dashboard</h1>
            </div>
          </Link>

          <button
            onClick={() => {
              clearAdminAuthToken();
              navigate('/admin/signin');
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-[#003049]"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-[#003049] text-white' : 'bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#003049]'
                }`
              }
            >
              <BarChart3 size={16} />
              Overview
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-[#003049] text-white' : 'bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#003049]'
                }`
              }
            >
              <Users size={16} />
              User Management
            </NavLink>
            <NavLink
              to="/admin/bookings"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-[#003049] text-white' : 'bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#003049]'
                }`
              }
            >
              <CalendarCheck2 size={16} />
              Bookings
            </NavLink>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
