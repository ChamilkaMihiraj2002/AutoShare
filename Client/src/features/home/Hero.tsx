
import { MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative h-[85vh] flex flex-col items-center justify-center text-center px-4">
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="Hero" />
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <div className="relative z-10 max-w-3xl text-white mb-10">
        <p className="text-sm uppercase tracking-widest mb-4 opacity-80">Rent the perfect vehicle, powered by AI</p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">Find your ideal ride with intelligent recommendations.</h1>
      </div>

      <div className="relative z-10 bg-white p-2 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex items-center px-4 py-3 border-r border-gray-100">
          <MapPin className="text-gray-400 mr-3" />
          <div className="text-left">
            <p className="text-xs font-bold text-gray-500 uppercase">Location</p>
            <input type="text" placeholder="Where do you need a vehicle?" className="text-sm outline-none w-full" />
          </div>
        </div>
        <div className="flex-1 flex items-center px-4 py-3 border-r border-gray-100">
          <Calendar className="text-gray-400 mr-3" />
          <div className="text-left">
            <p className="text-xs font-bold text-gray-500 uppercase">Start Date</p>
            <input type="date" className="text-sm outline-none w-full" />
          </div>
        </div>
        <div className="flex-1 flex items-center px-4 py-3">
          <Calendar className="text-gray-400 mr-3" />
          <div className="text-left">
            <p className="text-xs font-bold text-gray-500 uppercase">End Date</p>
            <input type="date" className="text-sm outline-none w-full" />
          </div>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="bg-orange-500 text-white px-10 py-4 rounded-xl font-bold hover:bg-orange-600 transition"
        >
          Search Vehicles
        </button>
      </div>
    </section>
  );
};
export default Hero;