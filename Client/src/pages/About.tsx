import React from 'react';
import { Target, Eye, Award } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="pt-24 bg-white">
      {/* Header */}
      <section className="py-16 px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About AutoShare</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
          We're revolutionizing the way people access vehicles through our AI-powered peer-to-peer rental platform.
        </p>
      </section>

      {/* Our Story */}
      <section className="max-w-7xl mx-auto px-8 mb-24">
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col lg:flex-row">
          <div className="lg:w-1/2 p-12 lg:p-16">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Our Story</h2>
            <div className="space-y-4 text-gray-500 text-sm leading-relaxed">
              <p>Founded in 2024, AutoShare was born from a simple idea: making vehicle rental accessible, affordable, and intelligent for everyone.</p>
              <p>We noticed that millions of vehicles sit idle while people struggle to find affordable, convenient transportation options. Our platform connects vehicle owners with renters, creating a win-win ecosystem.</p>
              <p>Today, we're proud to serve thousands of users across the country, powered by cutting-edge AI technology that matches renters with their perfect vehicle.</p>
            </div>
          </div>
          <div className="lg:w-1/2 min-h-[400px]">
            <img 
              src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80" 
              className="w-full h-full object-cover" 
              alt="Driving experience" 
            />
          </div>
        </div>
      </section>

      {/* Mission/Vision/Values */}
      <section className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
        {[
          { icon: <Target className="text-blue-900" />, title: "Our Mission", desc: "To make vehicle rental simple, affordable, and accessible for everyone through innovative technology." },
          { icon: <Eye className="text-blue-900" />, title: "Our Vision", desc: "A world where everyone has access to the perfect vehicle, exactly when they need it." },
          { icon: <Award className="text-blue-900" />, title: "Our Values", desc: "Trust, transparency, and innovation drive everything we do for our community." }
        ].map((item, i) => (
          <div key={i} className="bg-white p-10 rounded-2xl border border-gray-100 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-6">{item.icon}</div>
            <h3 className="font-bold text-gray-800 mb-4">{item.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* Stats */}
      <section className="bg-gray-50/50 py-16 mb-12">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-center text-2xl font-bold mb-12 text-gray-800">By the Numbers</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div><p className="text-3xl font-bold text-[#003049]">50K+</p><p className="text-sm text-gray-500">Active Users</p></div>
            <div><p className="text-3xl font-bold text-[#003049]">10K+</p><p className="text-sm text-gray-500">Vehicles Listed</p></div>
            <div><p className="text-3xl font-bold text-[#003049]">100K+</p><p className="text-sm text-gray-500">Completed Trips</p></div>
            <div><p className="text-3xl font-bold text-[#003049]">4.9/5</p><p className="text-sm text-gray-500">Average Rating</p></div>
          </div>
        </div>
      </section>
    </div>
  );
};
export default AboutPage;