import React from 'react';
import { Car, Zap, ShieldCheck, Clock, DollarSign, Headphones } from 'lucide-react';

const services = [
  {
    title: "Wide Selection",
    description: "Choose from thousands of vehicles including sedans, SUVs, sports cars, and electric vehicles.",
    icon: <Car className="w-6 h-6 text-[#003049]" />
  },
  {
    title: "AI-Powered Matching",
    description: "Our intelligent system recommends the perfect vehicle based on your needs and preferences.",
    icon: <Zap className="w-6 h-6 text-[#003049]" />
  },
  {
    title: "Insurance Coverage",
    description: "Every rental includes comprehensive insurance coverage for complete peace of mind.",
    icon: <ShieldCheck className="w-6 h-6 text-[#003049]" />
  },
  {
    title: "Flexible Booking",
    description: "Rent by the hour, day, or week with easy cancellation and modification options.",
    icon: <Clock className="w-6 h-6 text-[#003049]" />
  },
  {
    title: "Competitive Pricing",
    description: "Get the best rates with transparent pricing and no hidden fees.",
    icon: <DollarSign className="w-6 h-6 text-[#003049]" />
  },
  {
    title: "24/7 Support",
    description: "Our customer support team is always available to assist you whenever you need help.",
    icon: <Headphones className="w-6 h-6 text-[#003049]" />
  }
];

const Services: React.FC = () => {
  return (
    <div className="pt-20 bg-white">
      {/* Header Section */}
      <section className="py-16 px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          AutoShare provides a comprehensive vehicle rental platform with cutting-edge 
          features designed to make your experience seamless and enjoyable.
        </p>
      </section>

      {/* Services Grid */}
      <section className="pb-20 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">{service.title}</h3>
              <p className="text-gray-500 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action Banner */}
        <div className="mt-24 bg-[#001d2d] rounded-[2rem] p-16 text-center text-white shadow-2xl">
          <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto text-lg">
            Join thousands of satisfied customers who trust AutoShare for their vehicle rental needs.
          </p>
          <button className="bg-[#ff8c00] hover:bg-[#e67e00] text-white font-extrabold py-4 px-10 rounded-xl transition-colors text-lg shadow-lg">
            Browse Vehicles
          </button>
        </div>
      </section>
    </div>
  );
};

export default Services;