import React, { useState, useMemo } from 'react';
import CarCard from '../components/cards/CarCard';
import { Filter, X } from 'lucide-react';
import { getPublicVehicles } from '../lib/api';
import { getPrimaryVehicleImage } from '../lib/profile';
import type { Car } from '../types';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Convertible', 'Truck'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];

const SearchVehicles: React.FC = () => {
    const [vehicles, setVehicles] = React.useState<Car[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    React.useEffect(() => {
        const loadVehicles = async () => {
            setLoading(true);
            setError('');
            try {
                const result = await getPublicVehicles();
                const mapped = result.map((vehicle) => ({
                    id: vehicle.vehicleid,
                    name: `${vehicle.brand} ${vehicle.model}`,
                    price: vehicle.price,
                    rating: 4.8,
                    reviews: 0,
                    location: vehicle.location,
                    seats: vehicle.seats ?? 5,
                    type: vehicle.type,
                    fuelType: vehicle.fuel,
                    image: getPrimaryVehicleImage(vehicle.image_urls, vehicle.image_url),
                }));
                setVehicles(mapped);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load vehicles');
            } finally {
                setLoading(false);
            }
        };

        void loadVehicles();
    }, []);

    const toggleType = (type: string) => {
        setSelectedTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const toggleFuelType = (type: string) => {
        setSelectedFuelTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(car => {
            const typeMatch = selectedTypes.length === 0 || (car.type && selectedTypes.includes(car.type));
            const fuelMatch = selectedFuelTypes.length === 0 || (car.fuelType && selectedFuelTypes.includes(car.fuelType));
            return typeMatch && fuelMatch;
        });
    }, [vehicles, selectedTypes, selectedFuelTypes]);

    const clearFilters = () => {
        setSelectedTypes([]);
        setSelectedFuelTypes([]);
    };

    return (
        <div className="bg-gray-50 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Mobile Filter Toggle */}
                    <div className="md:hidden mb-4">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200"
                        >
                            <Filter size={20} />
                            <span>Filters</span>
                        </button>
                    </div>

                    {/* Sidebar Filters */}
                    <aside className={`md:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
                        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Filters</h3>
                                {(selectedTypes.length > 0 || selectedFuelTypes.length > 0) && (
                                    <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 font-medium">
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {/* Vehicle Type Filter */}
                            <div className="mb-8">
                                <h4 className="font-medium mb-3 text-gray-900">Vehicle Type</h4>
                                <div className="space-y-2">
                                    {VEHICLE_TYPES.map(type => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTypes.includes(type) ? 'bg-orange-500 border-orange-500' : 'border-gray-300 group-hover:border-orange-400'}`}>
                                                {selectedTypes.includes(type) && <Filter size={12} className="text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedTypes.includes(type)}
                                                onChange={() => toggleType(type)}
                                            />
                                            <span className={`text-sm ${selectedTypes.includes(type) ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                                {type}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Fuel Type Filter */}
                            <div>
                                <h4 className="font-medium mb-3 text-gray-900">Fuel Type</h4>
                                <div className="space-y-2">
                                    {FUEL_TYPES.map(type => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedFuelTypes.includes(type) ? 'bg-orange-500 border-orange-500' : 'border-gray-300 group-hover:border-orange-400'}`}>
                                                {selectedFuelTypes.includes(type) && <Filter size={12} className="text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedFuelTypes.includes(type)}
                                                onChange={() => toggleFuelType(type)}
                                            />
                                            <span className={`text-sm ${selectedFuelTypes.includes(type) ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                                {type}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <div className="mb-6 flex justify-between items-end">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Available Vehicles</h1>
                                <p className="text-gray-500 mt-1">
                                    Showing {filteredVehicles.length} result{filteredVehicles.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                                <p className="text-gray-500">Loading vehicles...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-red-200">
                                <p className="text-red-600">{error}</p>
                            </div>
                        ) : filteredVehicles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredVehicles.map(car => (
                                    <CarCard key={car.id} {...car} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                                <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    <X className="text-gray-400" size={32} />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No vehicles found</h3>
                                <p className="text-gray-500">Try adjusting your filters to find what you're looking for.</p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 text-orange-600 font-medium hover:text-orange-700"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SearchVehicles;
