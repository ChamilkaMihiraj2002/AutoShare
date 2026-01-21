import React from 'react';
import { User, Car, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const SignUpRole = () => {
  return (
    <div className="pt-24 min-h-screen bg-[#fcfcfc] flex flex-col items-center">
      <div className="text-center mb-12 px-4">
        <h1 className="text-xl font-bold text-[#003049] mb-4">Welcome to AutoShare</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Choose how you want to use our platform. You can always switch roles later in your account settings.
        </p>
      </div>

      <div className="max-w-6xl w-full px-8 grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        
        {/* Renter Option */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden group">
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

          <Link 
            to="/signup/details" 
            className="w-full bg-[#003049] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:bg-[#002538] transition"
          >
            Continue as Renter <ArrowRight size={18} />
          </Link>
        </div>

        {/* Owner Option */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden group">
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

          <Link 
            to="/signup/details" 
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:bg-orange-600 transition shadow-lg shadow-orange-100"
          >
            Continue as Owner <ArrowRight size={18} />
          </Link>
        </div>

      </div>

      <p className="text-sm text-gray-400 mb-12">
        Not sure which option is right for you? <button className="text-[#003049] font-bold underline">Learn more about each role</button>
      </p>
    </div>
  );
};

export default SignUpRole;