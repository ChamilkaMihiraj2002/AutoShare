
import { Search, Calendar, Key, Star } from 'lucide-react';
import type { Step } from '../../types';

const steps: Step[] = [
  {
    id: 1,
    title: 'Search',
    description: 'Browse thousands of vehicles in your area with AI-powered recommendations',
    icon: <Search className="w-6 h-6 text-blue-900" />,
  },
  {
    id: 2,
    title: 'Book',
    description: 'Select your dates and complete your booking in just a few clicks',
    icon: <Calendar className="w-6 h-6 text-blue-900" />,
  },
  {
    id: 3,
    title: 'Drive',
    description: 'Pick up your vehicle and hit the road with complete peace of mind',
    icon: <Key className="w-6 h-6 text-blue-900" />,
  },
  {
    id: 4,
    title: 'Review',
    description: 'Share your experience and help build our trusted community',
    icon: <Star className="w-6 h-6 text-blue-900" />,
  },
];


const HowItWorks = () => {
  return (
    <section className="py-20 px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-3">
          How It Works
        </h2>
        <p className="text-gray-500 max-w-xl mx-auto">
          Renting a vehicle has never been easier. Follow these simple steps to get on the road.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center text-center group">
            {/* Circular Icon Container */}
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-100 border border-blue-100">
              {step.icon}
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              {step.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed px-4">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;