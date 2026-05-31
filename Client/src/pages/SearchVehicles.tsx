import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, Filter, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import CarCard from '../components/cards/CarCard';
import { getMyProfile, getPublicVehicles, mapVehicleApiToCar, removeSavedVehicle, saveVehicle } from '../lib/api';
import { getAuthToken } from '../lib/auth';
import type { Car } from '../types';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Convertible', 'Truck'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'];
const REVIEW_FILTER_OPTIONS = [
    { value: 'all', label: 'Any rating' },
    { value: '4.5', label: '4.5+ stars' },
    { value: '4.7', label: '4.7+ stars' },
    { value: '4.8', label: '4.8+ stars' },
];
const SORT_OPTIONS = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating-high', label: 'Rating: High to Low' },
    { value: 'reviews-high', label: 'Most Reviews' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'seats-high', label: 'Seats: High to Low' },
];

const SearchVehicles: React.FC = () => {
    const [vehicles, setVehicles] = React.useState<Car[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [saveError, setSaveError] = React.useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('recommended');
    const [minimumRating, setMinimumRating] = useState('all');
    const [savedVehicleIds, setSavedVehicleIds] = useState<string[]>([]);
    const [savingVehicleId, setSavingVehicleId] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const initialLocation = searchParams.get('location') ?? '';
    const [searchTerm, setSearchTerm] = useState(initialLocation);

    React.useEffect(() => {
        const loadVehicles = async () => {
            setLoading(true);
            setError('');
            setSaveError('');
            try {
                const [result, profile] = await Promise.all([
                    getPublicVehicles(),
                    getAuthToken() ? getMyProfile().catch(() => null) : Promise.resolve(null),
                ]);
                const mapped = result.map(mapVehicleApiToCar);
                setVehicles(mapped);
                setSavedVehicleIds(profile?.saved_vehicle_ids ?? []);
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
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const ratingThreshold = minimumRating === 'all' ? 0 : Number(minimumRating);

        const matches = vehicles.filter(car => {
            const typeMatch = selectedTypes.length === 0 || (car.type && selectedTypes.includes(car.type));
            const fuelMatch = selectedFuelTypes.length === 0 || (car.fuelType && selectedFuelTypes.includes(car.fuelType));
            const ratingMatch = car.rating >= ratingThreshold;
            const searchMatch =
                normalizedSearch.length === 0 ||
                car.name.toLowerCase().includes(normalizedSearch) ||
                car.location.toLowerCase().includes(normalizedSearch) ||
                car.type?.toLowerCase().includes(normalizedSearch) ||
                car.fuelType?.toLowerCase().includes(normalizedSearch);

            return typeMatch && fuelMatch && ratingMatch && searchMatch;
        });

        return [...matches].sort((first, second) => {
            switch (sortBy) {
                case 'price-low':
                    return first.price - second.price;
                case 'price-high':
                    return second.price - first.price;
                case 'rating-high':
                    return second.rating - first.rating;
                case 'reviews-high':
                    return second.reviews - first.reviews;
                case 'name-asc':
                    return first.name.localeCompare(second.name);
                case 'seats-high':
                    return second.seats - first.seats;
                default:
                    return 0;
            }
        });
    }, [vehicles, selectedTypes, selectedFuelTypes, minimumRating, searchTerm, sortBy]);

    const clearFilters = () => {
        setSelectedTypes([]);
        setSelectedFuelTypes([]);
        setMinimumRating('all');
        setSearchTerm('');
        setSortBy('recommended');
    };

    const handleToggleSave = async (vehicleId: string) => {
        if (!getAuthToken()) {
            setSaveError('Please sign in to save vehicles.');
            return;
        }

        const currentlySaved = savedVehicleIds.includes(vehicleId);
        setSavingVehicleId(vehicleId);
        setSaveError('');
        try {
            const profile = currentlySaved
                ? await removeSavedVehicle(vehicleId)
                : await saveVehicle(vehicleId);
            setSavedVehicleIds(profile.saved_vehicle_ids ?? []);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to update saved vehicles');
        } finally {
            setSavingVehicleId(null);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">Browse Vehicles</p>
                            <h1 className="text-2xl font-bold text-gray-900 mt-2">Find the right vehicle on a separate page</h1>
                            <p className="text-gray-500 mt-2">Search all vehicles, apply filters, and sort the results the way you want.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 lg:min-w-[520px]">
                            <label className="flex-1 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                                <Search size={18} className="text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search by name, location, type, or fuel"
                                    className="w-full bg-transparent text-sm outline-none"
                                />
                            </label>
                            <label className="sm:w-64 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                                <ArrowUpDown size={18} className="text-gray-400" />
                                <select
                                    value={sortBy}
                                    onChange={(event) => setSortBy(event.target.value)}
                                    className="w-full bg-transparent text-sm outline-none"
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>
                </div>

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
                                {(selectedTypes.length > 0 || selectedFuelTypes.length > 0 || minimumRating !== 'all') && (
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

                            <div className="mt-8">
                                <h4 className="font-medium mb-3 text-gray-900">Reviews</h4>
                                <div className="space-y-2">
                                    {REVIEW_FILTER_OPTIONS.map((option) => (
                                        <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="minimum-rating"
                                                value={option.value}
                                                checked={minimumRating === option.value}
                                                onChange={(event) => setMinimumRating(event.target.value)}
                                                className="h-4 w-4 border-gray-300 text-orange-500 focus:ring-orange-500"
                                            />
                                            <span className={`text-sm ${minimumRating === option.value ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                                {option.label}
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

                        {saveError && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                {saveError}
                            </div>
                        )}

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
                                    <CarCard
                                        key={car.id}
                                        {...car}
                                        isSaved={savedVehicleIds.includes(car.id)}
                                        onToggleSave={handleToggleSave}
                                        saveDisabled={savingVehicleId === car.id}
                                    />
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
