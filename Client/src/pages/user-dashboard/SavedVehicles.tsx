import { savedVehicles } from '../../data/mockData';
import { Star, Heart, ArrowRight } from 'lucide-react';

const SavedVehicles = () => {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Saved Vehicles</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition hover:shadow-lg hover:border-gray-200">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden">
                            <img
                                src={vehicle.image}
                                alt={vehicle.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            />
                            <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-50 transition shadow-sm">
                                <Heart size={18} fill="currentColor" />
                            </button>
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                                {vehicle.type}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{vehicle.name}</h3>
                                <div className="flex items-center gap-1 text-sm font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">
                                    <Star size={14} className="text-orange-500 fill-orange-500" />
                                    {vehicle.rating}
                                </div>
                            </div>

                            <p className="text-gray-500 text-sm mb-4">{vehicle.trips} trips</p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div>
                                    <span className="text-xl font-bold text-[#003049]">{vehicle.price}</span>
                                </div>
                                <button className="flex items-center gap-2 text-sm font-bold text-white bg-[#003049] px-4 py-2 rounded-lg hover:bg-[#002538] transition shadow-lg shadow-[#003049]/20 group-hover:translate-x-1 duration-300">
                                    Book Now
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SavedVehicles;
