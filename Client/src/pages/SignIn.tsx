import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Mail, Lock, ArrowLeft } from 'lucide-react';
import { loginSocial, getMyProfile, loginWithEmail } from '../lib/api';
import { setAuthToken } from '../lib/auth';
import { signInWithGooglePopup } from '../lib/firebase';

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const auth = await loginWithEmail(email, password);
      if (!auth.idToken) {
        throw new Error('Sign-in succeeded but no auth token was returned.');
      }
      setAuthToken(auth.idToken);
      const profile = await getMyProfile();
      navigate(profile.role === 'owner' ? '/dashboard' : '/user-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleSubmitting(true);
    try {
      const { idToken } = await signInWithGooglePopup();
      setAuthToken(idToken);
      const profile = await loginSocial(idToken);
      navigate(profile.role === 'owner' ? '/dashboard' : '/user-dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google';
      if (message.toLowerCase().includes('profile not found')) {
        navigate('/signup/role', { state: { provider: 'google' } });
        return;
      }
      setError(message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Column: Sign In Form */}
      <div className="w-full lg:w-[45%] flex-1 px-6 py-12 md:p-16 lg:p-24 flex flex-col justify-center max-w-2xl mx-auto lg:mx-0">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition mb-12">
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="mb-10">
          <div className="flex items-center gap-2 font-bold text-xl mb-8">
            <div className="bg-[#003049] p-2 rounded-xl text-white">
              <Car size={24} />
            </div>
            AutoShare
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to your AutoShare account</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-medium">
              <input type="checkbox" className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
              Remember me
            </label>
            <button type="button" className="text-[#003049] font-bold hover:underline">Forgot password?</button>
          </div>

          <button
            disabled={isSubmitting}
            className="w-full bg-[#003049] text-white py-4 rounded-xl font-bold hover:bg-[#002538] transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium">
          <span className="text-gray-500">Don't have an account? </span>
          <Link to="/signup" className="text-[#003049] font-bold hover:underline">Sign Up</Link>
        </div>

        {/* Social Logins */}
        <div className="mt-10">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <span className="relative bg-white px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Or continue with</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting}
              className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-bold text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              {isGoogleSubmitting ? 'Connecting...' : 'Google'}
            </button>
            <button className="flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-bold text-gray-700">
              <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-5 h-5" alt="Facebook" />
              Facebook
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Statistics Overlay */}
      <div className="hidden lg:flex w-[55%] flex-1 bg-[#001d2d] relative items-center justify-center p-12 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full -ml-20 -mb-20 blur-3xl"></div>

        <div className="relative z-10 w-full max-w-lg text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Start Your Journey Today</h2>
          <p className="text-gray-400 mb-12 text-sm leading-relaxed">
            Access thousands of vehicles with AI-powered recommendations. Join our community of trusted renters and owners.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Active Users', value: '50K+' },
              { label: 'Vehicles', value: '10K+' },
              { label: 'Trips', value: '100K+' },
              { label: 'Rating', value: '4.9/5' }
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
