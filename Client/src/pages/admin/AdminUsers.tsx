import React from 'react';
import { LoaderCircle, Mail, MapPin, Phone, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import type { AdminUserItem } from '../../types';

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = React.useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

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

  if (isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-gray-200 bg-white">
        <div className="flex items-center gap-3 text-gray-500">
          <LoaderCircle className="animate-spin" size={20} />
          Loading users...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="text-xl font-bold">Users unavailable</h2>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-orange-500">
          <Users size={20} />
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">User Management</p>
        </div>
        <h2 className="mt-3 text-3xl font-bold text-[#003049]">All registered platform users</h2>
        <p className="mt-2 text-sm text-gray-500">Review renters and vehicle owners from the admin side.</p>
      </section>

      <section className="grid gap-4">
        {users.length > 0 ? (
          users.map((user) => (
            <article key={user.uid} className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#003049]">{user.full_name || 'Unnamed User'}</h3>
                  <p className="mt-1 text-sm text-gray-400">UID: {user.uid}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.roles.length > 0 ? user.roles.map((role) => (
                    <span key={role} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                      {role.replace('_', ' ')}
                    </span>
                  )) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      no role
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <Mail size={16} className="text-orange-500" />
                  <span>{user.email || 'No email'}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <Phone size={16} className="text-orange-500" />
                  <span>{user.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <MapPin size={16} className="text-orange-500" />
                  <span>{user.address || 'No address'}</span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
            No users found.
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminUsers;
