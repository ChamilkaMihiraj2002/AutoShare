import React from 'react';
import { CarFront, CheckCircle2, LoaderCircle, Shield, UserCheck, UserRound, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboardOverview } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import type { AdminDashboardOverview as AdminDashboardOverviewType } from '../../types';

const statCards = [
  { key: 'total_users', label: 'Total Users', icon: Users },
  { key: 'total_renters', label: 'Renters', icon: UserRound },
  { key: 'total_vehicle_owners', label: 'Vehicle Owners', icon: UserCheck },
  { key: 'active_vehicles', label: 'Active Vehicles', icon: CarFront },
  { key: 'inactive_vehicles', label: 'Inactive Vehicles', icon: CarFront },
  { key: 'current_rents', label: 'Current Rents', icon: Shield },
  { key: 'completed_rents', label: 'Completed Rents', icon: CheckCircle2 },
] as const;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = React.useState<AdminDashboardOverviewType | null>(null);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadOverview = async () => {
      try {
        const response = await getAdminDashboardOverview();
        setOverview(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load admin dashboard.';
        setError(message);
        if (message.toLowerCase().includes('authorization') || message.toLowerCase().includes('token')) {
          clearAdminAuthToken();
          navigate('/admin/signin', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadOverview();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-gray-200 bg-white">
        <div className="flex items-center gap-3 text-gray-500">
          <LoaderCircle className="animate-spin" size={20} />
          Loading admin overview...
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="text-xl font-bold">Dashboard unavailable</h2>
        <p className="mt-2 text-sm">{error || 'No admin dashboard data returned.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-[#003049] px-6 py-8 text-white shadow-xl shadow-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">Admin Overview</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold">Platform status at a glance</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Review user counts, vehicle availability, and rental activity before moving into users or bookings.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Signed in as</p>
            <p className="mt-1 text-lg font-bold">{overview.admin.display_name}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <div key={key} className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">{label}</p>
              <div className="rounded-2xl bg-orange-100 p-2 text-orange-500">
                <Icon size={18} />
              </div>
            </div>
            <p className="mt-5 text-4xl font-bold text-[#003049]">
              {overview.stats[key].toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Recent API Requests</p>
          <h2 className="mt-2 text-2xl font-bold text-[#003049]">Live application activity</h2>
          <div className="mt-6 space-y-4">
            {overview.recent_requests.length > 0 ? (
              overview.recent_requests.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#003049]">{item.title}</p>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-600">
                      {item.outcome || 'n/a'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{item.detail}</p>
                  <p className="mt-2 text-xs text-gray-400">{item.created_at || 'Timestamp unavailable'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">No recent request logs yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Admin Identity</p>
            <h2 className="mt-2 text-2xl font-bold text-[#003049]">{overview.admin.display_name}</h2>
            <p className="mt-2 text-sm text-gray-600">Username: {overview.admin.username}</p>
            <p className="mt-1 text-sm text-gray-400">
              Last login: {overview.admin.last_login_at || 'First recorded session'}
            </p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Recent Admin Logins</p>
            <div className="mt-5 space-y-4">
              {overview.recent_admin_logins.length > 0 ? (
                overview.recent_admin_logins.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[#003049]">{item.title}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-orange-600">{item.outcome || 'n/a'}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{item.detail}</p>
                    <p className="mt-2 text-xs text-gray-400">{item.created_at || 'Timestamp unavailable'}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No admin login events yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
