import React from 'react';
import { CarFront, CheckCircle2, LoaderCircle, Shield, UserCheck, UserRound, Users, Activity, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboardOverview } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import type { AdminDashboardOverview as AdminDashboardOverviewType } from '../../types';

const statCards = [
  { key: 'total_users', label: 'Total Registered Users', icon: Users, gradient: 'from-blue-500 to-indigo-500' },
  { key: 'total_renters', label: 'Renter Accounts', icon: UserRound, gradient: 'from-sky-500 to-blue-500' },
  { key: 'total_vehicle_owners', label: 'Vehicle Owner Accounts', icon: UserCheck, gradient: 'from-amber-500 to-orange-500' },
  { key: 'active_vehicles', label: 'Active Fleet Vehicles', icon: CarFront, gradient: 'from-emerald-500 to-teal-500' },
  { key: 'inactive_vehicles', label: 'Inactive Fleet Vehicles', icon: CarFront, gradient: 'from-slate-400 to-slate-500' },
  { key: 'pending_vehicle_verifications', label: 'Pending Verifications', icon: Shield, gradient: 'from-amber-500 to-yellow-500' },
  { key: 'verified_vehicles', label: 'Verified Vehicles', icon: CheckCircle2, gradient: 'from-emerald-500 to-lime-500' },
  { key: 'current_rents', label: 'Current Rents / Active', icon: Shield, gradient: 'from-violet-500 to-purple-500' },
  { key: 'completed_rents', label: 'Completed Rents', icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600' },
] as const;

// Inline component for Timeline Feed to render recent requests/logins cleanly
const TimelineFeed = ({ items, emptyMessage }: { items: any[]; emptyMessage: string }) => {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 ml-3">
      {items.map((item, index) => {
        const isSuccess = 
          item.outcome?.toLowerCase().includes('success') || 
          item.outcome?.toLowerCase().includes('authorized') || 
          item.outcome?.toLowerCase().includes('active') ||
          item.outcome?.toLowerCase().includes('completed');
        return (
          <div key={index} className="relative">
            {/* Timeline Dot */}
            <span className={`absolute -left-[31px] mt-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white transition-all ${
              isSuccess ? 'border-emerald-500' : 'border-orange-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                isSuccess ? 'bg-emerald-500' : 'bg-orange-500'
              }`}></span>
            </span>
            
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:bg-white hover:border-slate-200 hover:shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="font-bold text-slate-800 text-sm">{item.title}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isSuccess 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}>
                  {item.outcome || 'n/a'}
                </span>
              </div>
              <p className="mt-2 text-xs md:text-sm text-slate-500 leading-relaxed">{item.detail}</p>
              <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.created_at || 'Timestamp unavailable'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

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
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin text-orange-500" size={32} />
          <p className="text-sm font-semibold tracking-wide uppercase">Synchronizing status...</p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm animate-in fade-in duration-300">
        <h2 className="text-lg font-bold">Dashboard unavailable</h2>
        <p className="mt-2 text-sm">{error || 'No admin dashboard data returned.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#003049] via-[#002235] to-[#0b3c58] p-8 text-white shadow-xl shadow-slate-100 border border-[#082E46]/20">
        {/* Decorative ambient glows */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute right-1/4 -bottom-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
              Platform Operations
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">System Status Overview</h2>
            <p className="max-w-xl text-xs md:text-sm leading-relaxed text-slate-300">
              Overview of registrations, vehicle updates, and booking requests in real-time. Use the sidebar to inspect detailed records.
            </p>
          </div>
          
          <div className="shrink-0 flex items-center gap-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur px-6 py-4 shadow-lg">
            <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-extrabold shadow-inner">
              {overview.admin.display_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Admin account</p>
              <p className="text-base font-extrabold text-white mt-0.5">{overview.admin.display_name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid of Stat Cards */}
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <div key={key} className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <div className="rounded-xl bg-orange-50/80 p-2.5 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                <Icon size={18} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-extrabold text-[#003049] tracking-tight">
              {overview.stats[key].toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      {/* Activities and Identity Details */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Recent API Requests Feed */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-500">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Live Application Activity</h2>
              <p className="text-xs text-slate-400">Chronological list of recent REST API operations</p>
            </div>
          </div>
          <TimelineFeed
            items={overview.recent_requests}
            emptyMessage="No recent requests recorded on the gateway."
          />
        </div>

        <div className="space-y-6">
          {/* Admin Identity Profile Info */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full translate-x-8 -translate-y-8 blur-2xl"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin Profile</p>
            
            <div className="mt-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#003049] to-[#0c405c] flex items-center justify-center text-white text-lg font-extrabold shadow-md">
                {overview.admin.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#003049] leading-tight">{overview.admin.display_name}</h3>
                <p className="text-xs text-orange-500 font-semibold uppercase tracking-wider mt-1">Super Administrator</p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Username</span>
                <span className="text-slate-700 font-bold">{overview.admin.username}</span>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400 font-medium">Last Login Session</span>
                <span className="text-slate-500 text-xs font-semibold bg-slate-50 border border-slate-100 rounded-xl p-3 mt-1 leading-relaxed">
                  {overview.admin.last_login_at || 'First recorded session'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Admin Logins Feed */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-500">
                <LogIn size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Admin Audit Logs</h2>
                <p className="text-[11px] text-slate-400">Recent security login attempts</p>
              </div>
            </div>
            <TimelineFeed
              items={overview.recent_admin_logins}
              emptyMessage="No login audit records available."
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
