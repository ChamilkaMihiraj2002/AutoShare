import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Mail, Lock, User, ArrowLeft } from 'lucide-react';

const SignUp = () => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Column: Form */}
      <div className="w-full lg:w-[45%] p-8 md:p-16 lg:p-24 flex flex-col">
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

        <form className="space-y-5">
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
              <input type="email" placeholder="your@email.com" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="mt-1 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
            <span>I agree to the <button className="text-[#003049] font-bold">Terms of Service</button> and <button className="text-[#003049] font-bold">Privacy Policy</button></span>
          </label>

          <button className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-100">
            Create Account
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium">
          <span className="text-gray-500">Already have an account? </span>
          <Link to="/signin" className="text-[#003049] font-bold hover:underline">Sign In</Link>
        </div>
      </div>

      {/* Right Column: Stats (Reused from SignIn) */}
      <div className="hidden lg:flex w-[55%] bg-[#001d2d] relative items-center justify-center p-12">
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