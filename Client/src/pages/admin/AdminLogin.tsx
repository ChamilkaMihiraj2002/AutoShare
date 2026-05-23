import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, ShieldCheck, User2 } from 'lucide-react';
import { loginAdmin } from '../../lib/api';
import { setAdminAuthToken } from '../../lib/auth';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('admin');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await loginAdmin(username, password);
      setAdminAuthToken(response.token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in as admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#003049]">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="rounded-[32px] border border-gray-200 bg-white p-8 shadow-xl shadow-slate-200/70">
            <div className="mb-8 flex items-center gap-3">
              <div className="rounded-2xl bg-[#003049] p-3 text-white">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Admin Access</p>
                <h1 className="text-3xl font-bold text-[#003049]">Separate Login Portal</h1>
              </div>
            </div>
            <p className="mb-8 text-sm leading-6 text-gray-500">
              Sign in to manage platform activity, bookings, vehicles, and user growth from the admin side of AutoShare.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Username</span>
                <div className="relative">
                  <User2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    placeholder="Enter admin username"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-gray-700">Password</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                    placeholder="Enter admin password"
                    required
                  />
                </div>
              </label>

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#003049] px-4 py-3 font-bold text-white transition hover:bg-[#002538] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In as Admin'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
