import { Car, Star, Zap, Settings } from 'lucide-react';
import { myVehicles } from '../../data/mockData';

const MyVehicles = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                        <div className="h-48 bg-gray-200 relative">
                            <img src={vehicle.image} alt={vehicle.name} className="w-full h-full object-cover" />
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-sm">
                                <Star size={12} className="text-orange-500 fill-orange-500" /> {vehicle.rating}
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{vehicle.name}</h3>
                                    <p className="text-xs text-gray-500">{vehicle.year} • {vehicle.type}</p>
                                </div>
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">{vehicle.status}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 my-4 py-4 border-y border-gray-50">
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <Car size={16} />
                                    <span>{vehicle.trips} Trips</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <Zap size={16} />
                                    <span>{vehicle.earned} Earned</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button className="flex-1 border border-gray-200 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">View Details</button>
                                <button className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition">
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Vehicle Card 3 - Add New Placeholder */}
                <button className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 hover:bg-white hover:border-[#003049] hover:text-[#003049] transition group h-full min-h-[300px]">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition">
                        <Settings size={32} className="text-gray-400 group-hover:text-[#003049]" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-500 group-hover:text-[#003049]">Add New Vehicle</h3>
                    <p className="text-sm text-gray-400 text-center mt-2 max-w-[200px]">List another vehicle to earn more</p>
                </button>
            </div>
        </div>
    );
};

export default MyVehicles;
