import React, { useState } from 'react';
import { LoaderCircle, Mail, MapPin, Phone, Users, Search, Filter, Copy, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import { getProfileDisplayName } from '../../lib/profile';
import type { AdminUserItem } from '../../types';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await getAdminUsers();
        setUsers(response.users);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load users.';
        setError(message);
        if (message.toLowerCase().includes('authorization') || message.toLowerCase().includes('token')) {
          clearAdminAuthToken();
          navigate('/admin/signin', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, [navigate]);

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  // Filtered users logic
  const filteredUsers = users.filter((user) => {
    const displayName = getProfileDisplayName(user.full_name, user.email || '');
    const matchesSearch = 
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.uid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone || '').includes(searchQuery);

    const matchesRole = 
      selectedRole === 'all' || 
      user.roles.includes(selectedRole);

    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin text-orange-500" size={32} />
          <p className="text-sm font-semibold tracking-wide uppercase">Fetching accounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm animate-in fade-in duration-300">
        <h2 className="text-lg font-bold">Users unavailable</h2>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title Header Card */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full translate-x-12 -translate-y-12 blur-2xl"></div>
        <div className="flex items-center gap-2.5 text-orange-500">
          <Users size={20} className="transform scale-110" />
          <p className="text-xs font-bold uppercase tracking-wider">Supervision & Security</p>
        </div>
        <h2 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#003049] tracking-tight">Registered Platform Users</h2>
        <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Verify identities, review renter status, and coordinate platform access permissions for renters and owners.
        </p>
      </section>

      {/* Search and Filters Control Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, UID, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative flex items-center gap-2 min-w-[200px]">
          <Filter className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-8 text-sm text-slate-700 outline-none transition appearance-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
          >
            <option value="all">All Account Roles</option>
            <option value="renter">Renters</option>
            <option value="vehicle_owner">Vehicle Owners</option>
            <option value="user">Standard Users</option>
          </select>
        </div>
      </section>

      {/* Users List Grid */}
      <section className="grid gap-5 md:grid-cols-2">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => {
            const displayName = getProfileDisplayName(user.full_name, user.email || '');

            return (
              <article key={user.uid} className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                {/* Header detail */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 font-extrabold text-base uppercase shadow-inner">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base leading-snug">{displayName}</h3>
                      
                      {/* UID copy trigger */}
                      <button 
                        onClick={() => handleCopyUid(user.uid)}
                        className="flex items-center gap-1 mt-1 text-[11px] font-bold text-slate-400 hover:text-orange-500 transition cursor-pointer"
                        title="Copy UID"
                      >
                        <span>UID: {user.uid.slice(0, 8)}...</span>
                        {copiedUid === user.uid ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 self-start">
                    {user.roles.length > 0 ? user.roles.map((role) => (
                      <span 
                        key={role} 
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          role === 'vehicle_owner' 
                            ? 'bg-orange-50 text-orange-700 border-orange-200' 
                            : role === 'renter' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {role.replace('_', ' ')}
                      </span>
                    )) : (
                      <span className="rounded-full bg-slate-50 text-slate-400 border border-slate-200 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        no role
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact grid */}
                <div className="mt-6 space-y-2.5">
                  <a
                    href={user.email ? `mailto:${user.email}` : '#'}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-600 transition hover:bg-orange-50/30 hover:border-orange-200 group"
                  >
                    <Mail size={14} className="text-slate-400 group-hover:text-orange-500 transition" />
                    <span className="truncate flex-1">{user.email || 'No email registered'}</span>
                    {user.email && <ExternalLink size={11} className="text-slate-300 opacity-0 group-hover:opacity-100 transition" />}
                  </a>
                  
                  <a
                    href={user.phone ? `tel:${user.phone}` : '#'}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-600 transition hover:bg-orange-50/30 hover:border-orange-200 group"
                  >
                    <Phone size={14} className="text-slate-400 group-hover:text-orange-500 transition" />
                    <span>{user.phone || 'No phone registered'}</span>
                    {user.phone && <ExternalLink size={11} className="text-slate-300 opacity-0 group-hover:opacity-100 transition" />}
                  </a>
                  
                  <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-600">
                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-normal">{user.address || 'No address provided'}</span>
                  </div>
                </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="col-span-full rounded-[28px] border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
            <Users size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold">No accounts match the current query criteria.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedRole('all'); }}
              className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600 underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminUsers;
