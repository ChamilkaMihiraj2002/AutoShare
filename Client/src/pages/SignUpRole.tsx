import React from 'react';
import { User, Car, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { UserRole } from '../types';

interface SignUpState {
  provider: 'email' | 'google';
  email?: string;
  password?: string;
  roles?: UserRole[];
}

const OWNER_ROLE: UserRole = 'vehicle_owner';
const RENTER_ROLE: UserRole = 'renter';

const SignUpRole = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const signupState = location.state as SignUpState | undefined;
  const [selectedRoles, setSelectedRoles] = React.useState<UserRole[]>(signupState?.roles?.length ? signupState.roles : [RENTER_ROLE]);

  const toggleRole = (role: UserRole) => {
    setSelectedRoles((current) => {
      if (current.includes(role)) {
        return current.filter((item) => item !== role);
      }
      return [...current, role];
    });
  };

  const handleContinue = () => {
    if (!signupState?.provider) {
      navigate('/signup');
      return;
    }

    if (selectedRoles.length === 0) {
      return;
    }

    navigate('/signup/details', { state: { roles: selectedRoles, ...signupState } });
  };

  if (!signupState?.provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please create an account first.</p>
          <Link to="/signup" className="text-orange-500 font-bold hover:underline">Go to Sign Up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-[#fcfcfc] flex flex-col items-center">
      <div className="text-center mb-12 px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-500 mb-3">Step 1 of 2</p>
        <h1 className="text-xl font-bold text-[#003049] mb-4">Welcome to AutoShare</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Choose one or both roles. You can rent vehicles, list your own vehicle, or do both from the same account.
        </p>
      </div>

      <div className="max-w-6xl w-full px-8 grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        
        {/* Renter Option */}
        <div className={`bg-white p-10 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden group ${selectedRoles.includes(RENTER_ROLE) ? 'border-[#003049] ring-2 ring-[#003049]/10' : 'border-gray-100'}`}>
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-2xl font-bold text-[#003049] max-w-[200px]">I want to rent a vehicle</h2>
            <div className="bg-blue-50 p-4 rounded-full">
              <User className="w-8 h-8 text-[#003049]" />
            </div>
          </div>
          <p className="text-gray-500 mb-8 text-sm">Browse thousands of vehicles and book your perfect ride</p>
          
          <ul className="space-y-4 mb-10">
            {[
              { title: "Instant Booking", desc: "Reserve your vehicle in seconds" },
              { title: "Wide Selection", desc: "Choose from thousands of vehicles" },
              { title: "Flexible Rentals", desc: "Hourly, daily, or weekly options" },
              { title: "24/7 Support", desc: "We're here whenever you need us" }
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <button 
            onClick={() => toggleRole(RENTER_ROLE)}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${selectedRoles.includes(RENTER_ROLE) ? 'bg-[#003049] text-white group-hover:bg-[#002538]' : 'bg-gray-100 text-[#003049] hover:bg-gray-200'}`}
          >
            {selectedRoles.includes(RENTER_ROLE) ? 'Renter Selected' : 'Select Renter'} <ArrowRight size={18} />
          </button>
        </div>

        {/* Owner Option */}
        <div className={`bg-white p-10 rounded-[2.5rem] border shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden group ${selectedRoles.includes(OWNER_ROLE) ? 'border-orange-500 ring-2 ring-orange-500/10' : 'border-gray-100'}`}>
          <div className="flex justify-between items-start mb-8">
            <h2 className="text-2xl font-bold text-[#003049] max-w-[200px]">I want to list my vehicle</h2>
            <div className="bg-orange-50 p-4 rounded-full">
              <Car className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <p className="text-gray-500 mb-8 text-sm">Earn money by sharing your vehicle with our community</p>
          
          <ul className="space-y-4 mb-10">
            {[
              { title: "Earn Extra Income", desc: "Make money from your idle vehicle" },
              { title: "Full Control", desc: "Set your own prices and availability" },
              { title: "Insurance Coverage", desc: "Your vehicle is protected" },
              { title: "Easy Management", desc: "Powerful dashboard to track everything" }
            ].map((item, i) => (
              <li key={i} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <button 
            onClick={() => toggleRole(OWNER_ROLE)}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${selectedRoles.includes(OWNER_ROLE) ? 'bg-orange-500 text-white group-hover:bg-orange-600 shadow-lg shadow-orange-100' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
          >
            {selectedRoles.includes(OWNER_ROLE) ? 'Owner Selected' : 'Select Owner'} <ArrowRight size={18} />
          </button>
        </div>

      </div>

      <div className="flex flex-col items-center gap-4 mb-12 px-4">
        <p className="text-sm text-gray-500 text-center">
          Selected: {selectedRoles.length > 0 ? selectedRoles.map((role) => role === OWNER_ROLE ? 'Owner' : 'Renter').join(' + ') : 'Choose at least one role'}
        </p>
        <button
          type="button"
          onClick={handleContinue}
          disabled={selectedRoles.length === 0}
          className="bg-[#003049] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#002538] transition"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default SignUpRole;
