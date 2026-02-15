import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { loginSocial } from '../lib/api';
import { setAuthToken } from '../lib/auth';
import { signInWithGooglePopup } from '../lib/firebase';

const SignUp = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isGoogleSubmitting, setIsGoogleSubmitting] = React.useState(false);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/signup/role', { state: { provider: 'email', email, password } });
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleSubmitting(true);
    try {
      const { idToken } = await signInWithGooglePopup();
      setAuthToken(idToken);
      const profile = await loginSocial(idToken);
      navigate(profile.role === 'owner' ? '/dashboard' : '/user-dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign up with Google';
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
      {/* Left Column: Form */}
      <div className="w-full lg:w-[45%] flex-1 px-6 py-12 md:p-16 lg:p-24 flex flex-col justify-center max-w-2xl mx-auto lg:mx-0">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 mb-12">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="mb-10">
          <div className="flex items-center gap-2 font-bold text-xl mb-8">
            <div className="bg-[#003049] p-2 rounded-xl text-white"><Car size={24} /></div>
            AutoShare
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an Account</h1>
          <p className="text-gray-500">Join the community of trusted renters and owners.</p>
        </div>

        <form className="space-y-5" onSubmit={handleCreateAccount}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="John Doe" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
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
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                required
                minLength={6}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="mt-1 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
            <span>I agree to the <button className="text-[#003049] font-bold">Terms of Service</button> and <button className="text-[#003049] font-bold">Privacy Policy</button></span>
          </label>

          <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-100">
            Create Account
          </button>
          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}
        </form>

        <div className="mt-8 text-center text-sm font-medium">
          <span className="text-gray-500">Already have an account? </span>
          <Link to="/signin" className="text-[#003049] font-bold hover:underline">Sign In</Link>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-bold text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            {isGoogleSubmitting ? 'Connecting...' : 'Continue with Google'}
          </button>
        </div>
      </div>

      {/* Right Column: Stats (Reused from SignIn) */}
      <div className="hidden lg:flex w-[55%] flex-1 bg-[#001d2d] relative items-center justify-center p-12">
        <div className="relative z-10 w-full max-w-lg text-center text-white">
          <h2 className="text-3xl font-bold mb-6">Start Your Journey Today</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
              <p className="text-2xl font-bold">50K+</p><p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Active Users</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
              <p className="text-2xl font-bold">10K+</p><p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Vehicles</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SignUp;
