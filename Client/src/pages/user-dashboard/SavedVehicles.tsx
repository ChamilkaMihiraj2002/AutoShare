import React from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingScreen from '../../components/common/LoadingScreen';
import { getMySavedVehicles, mapVehicleApiToCar, removeSavedVehicle } from '../../lib/api';
import { formatLkr } from '../../lib/currency';
import type { Car } from '../../types';

const SavedVehicles = () => {
    const [vehicles, setVehicles] = React.useState<Car[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [removingVehicleId, setRemovingVehicleId] = React.useState<string | null>(null);

    React.useEffect(() => {
        const loadSavedVehicles = async () => {
            setLoading(true);
            setError('');
            try {
                const result = await getMySavedVehicles();
                setVehicles(result.map(mapVehicleApiToCar));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load saved vehicles');
            } finally {
                setLoading(false);
            }
        };

        void loadSavedVehicles();
    }, []);

    const handleRemoveSavedVehicle = async (vehicleId: string) => {
        setRemovingVehicleId(vehicleId);
        setError('');
        try {
            await removeSavedVehicle(vehicleId);
            setVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove saved vehicle');
        } finally {
            setRemovingVehicleId(null);
        }
    };

    if (loading) {
        return <LoadingScreen message="Loading saved vehicles..." />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Saved Vehicles</h2>
                <p className="mt-1 text-sm text-gray-500">Keep track of vehicles you want to come back to later.</p>
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

            {vehicles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <Heart size={24} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No saved vehicles yet</h3>
                    <p className="mt-2 text-sm text-gray-500">Browse vehicles and tap the heart icon to save the ones you like.</p>
                    <Link
                        to="/search"
                        className="mt-5 inline-flex rounded-lg bg-[#003049] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#002538]"
                    >
                        Explore Vehicles
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-gray-200 hover:shadow-lg">
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={vehicle.image}
                                    alt={vehicle.name}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                                <button
                                    type="button"
                                    onClick={() => void handleRemoveSavedVehicle(vehicle.id)}
                                    disabled={removingVehicleId === vehicle.id}
                                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-red-500 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                                >
                                    <Heart size={18} fill="currentColor" />
                                </button>
                                <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                                    {vehicle.type || 'Vehicle'}
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="mb-2 flex items-start justify-between gap-3">
                                    <h3 className="line-clamp-1 text-lg font-bold text-gray-900">{vehicle.name}</h3>
                                    <div className="rounded-lg bg-gray-50 px-2 py-1 text-sm font-bold text-gray-900">
                                        {vehicle.rating.toFixed(1)}
                                    </div>
                                </div>

                                <p className="mb-4 text-sm text-gray-500">{vehicle.location}</p>

                                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                    <div>
                                        <span className="text-xl font-bold text-[#003049]">{formatLkr(vehicle.price)}</span>
                                        <span className="text-sm text-gray-500">/day</span>
                                    </div>
                                    <Link
                                        to={`/vehicles/${vehicle.id}`}
                                        state={{ vehicle }}
                                        className="rounded-lg bg-[#003049] px-4 py-2 text-sm font-bold text-white transition duration-300 hover:bg-[#002538]"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedVehicles;
