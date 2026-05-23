import React, { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Users, Fuel, Gauge, Calendar } from 'lucide-react';
import LoadingScreen from '../components/common/LoadingScreen';
import { getPublicVehicleById } from '../lib/api';
import { getPrimaryVehicleImage } from '../lib/profile';
import { MOCK_VEHICLES } from '../data/mockVehicles';
import type { Car } from '../types';

type VehicleBookingRouteState = {
    startDate?: string;
    endDate?: string;
};

const VehicleDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const routeVehicle = (location.state as { vehicle?: Car } | null)?.vehicle ?? null;
    const [vehicle, setVehicle] = React.useState<Car | null>(routeVehicle);
    const [isLoading, setIsLoading] = React.useState(!routeVehicle);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        const loadVehicle = async () => {
            if (!id) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError('');
            try {
                const result = await getPublicVehicleById(id);
                if (result) {
                    setVehicle({
                        id: result.vehicleid,
                        name: `${result.brand} ${result.model}`,
                        price: result.price,
                        rating: 4.8,
                        reviews: 0,
                        location: result.location,
                        seats: result.seats ?? 5,
                        type: result.type,
                        fuelType: result.fuel,
                        image: getPrimaryVehicleImage(result.image_urls, result.image_url),
                    });
                    return;
                }

                const mockVehicle = MOCK_VEHICLES.find((entry) => entry.id === id);
                setVehicle(mockVehicle || null);
            } catch (err) {
                if (!routeVehicle) {
                    setError(err instanceof Error ? err.message : 'Failed to load vehicle');
                }
            } finally {
                setIsLoading(false);
            }
        };

        void loadVehicle();
    }, [id, routeVehicle]);

    // Mock additional details not in the basic type
    const specifications = {
        year: 2023,
        transmission: 'Automatic',
        fuel: vehicle?.fuelType || 'Electric',
        capacity: vehicle?.seats || 5
    };

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [dateError, setDateError] = useState('');

    if (isLoading) {
        return <LoadingScreen message="Loading vehicle..." />;
    }

    if (error) {
        return <div className="pt-24 text-center text-red-600">{error}</div>;
    }

    if (!vehicle) {
        return <div className="pt-24 text-center">Vehicle not found</div>;
    }

    const handleBookNow = () => {
        if (!startDate || !endDate) {
            setDateError('Please select both start and end dates.');
            return;
        }

        if (new Date(endDate) <= new Date(startDate)) {
            setDateError('End date must be after start date.');
            return;
        }

        setDateError('');
        navigate(`/vehicles/${vehicle.id}/book`, {
            state: {
                startDate,
                endDate,
            } satisfies VehicleBookingRouteState,
        });
    };

    return (
        <div className="bg-gray-50 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <Link to="/search" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium">
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Search
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Images & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Main Image */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                            <img src={vehicle.image} alt={vehicle.name} className="w-full h-96 object-cover" />
                        </div>

                        {/* Thumbnails (Mock) */}
                        <div className="flex gap-4">
                            <div className="w-32 h-24 rounded-lg overflow-hidden cursor-pointer border-2 border-orange-500">
                                <img src={vehicle.image} alt="Thumbnail 1" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-32 h-24 rounded-lg overflow-hidden cursor-pointer opacity-70 hover:opacity-100 transition">
                                <img src={vehicle.image} alt="Thumbnail 2" className="w-full h-full object-cover" />
                            </div>
                        </div>


                        {/* Vehicle Info */}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{vehicle.name}</h1>
                            <div className="flex items-center gap-4 text-gray-600 mb-6">
                                <div className="flex items-center gap-1">
                                    <Star className="text-orange-400 fill-orange-400" size={18} />
                                    <span className="font-bold text-gray-900">{vehicle.rating}</span>
                                    <span>({vehicle.reviews} reviews)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin size={18} />
                                    <span>{vehicle.location}</span>
                                </div>
                            </div>

                            {/* Host Info */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                                            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Host" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Hosted by</p>
                                            <h3 className="font-bold text-gray-900">Sarah Johnson</h3>
                                        </div>
                                    </div>
                                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                                        Message Owner
                                    </button>
                                </div>
                            </div>

                            {/* Specifications */}
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Vehicle Specifications</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Calendar className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Year</div>
                                    <div className="font-bold text-gray-900">{specifications.year}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Gauge className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Transmission</div>
                                    <div className="font-bold text-gray-900">{specifications.transmission}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Fuel className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Fuel</div>
                                    <div className="font-bold text-gray-900">{specifications.fuel}</div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <Users className="mx-auto text-gray-400 mb-2" size={24} />
                                    <div className="text-sm text-gray-500">Capacity</div>
                                    <div className="font-bold text-gray-900 text-center">{specifications.capacity} seats</div>
                                </div>
                            </div>

                            {/* Description */}
                            <h3 className="text-xl font-bold text-gray-900 mb-4">About this vehicle</h3>
                            <p className="text-gray-600 leading-relaxed mb-8">
                                Experience the future of driving with this pristine {vehicle.name}. Features autopilot, premium sound system, and incredible range. Perfect for city driving or weekend getaways. maintained in excellent condition.
                            </p>

                            {/* Reviews */}
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Reviews</h3>
                            <div className="space-y-6">
                                <div className="border-b border-gray-100 pb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex text-orange-400">
                                            {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                        </div>
                                        <span className="font-bold text-sm">John D.</span>
                                        <span className="text-gray-400 text-sm">• 2 weeks ago</span>
                                    </div>
                                    <p className="text-gray-600">Amazing experience! The car was in perfect condition and the owner was very responsive.</p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right Column - Booking Widget */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Plan Your Trip</h2>
                                <p className="text-sm text-gray-500 mt-1">Choose your dates and continue to see the live dynamic price.</p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        value={startDate}
                                        min={new Date().toISOString().slice(0, 10)}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setDateError('');
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        value={endDate}
                                        min={startDate || new Date().toISOString().slice(0, 10)}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setDateError('');
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleBookNow}
                                className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30"
                            >
                                Book Now
                            </button>

                            {dateError && <p className="mt-3 text-sm text-red-600">{dateError}</p>}

                            <p className="text-center text-sm text-gray-400 mt-4">You will review the live dynamic price on the next step.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetails;
