import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Calendar, MapPin, Navigation } from 'lucide-react';
import { MOCK_VEHICLES } from '../data/mockVehicles';
import MapWidget from '../components/map/MapWidget';

const VehicleBooking: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const vehicle = MOCK_VEHICLES.find(v => v.id === Number(id));

    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [distance, setDistance] = useState<number | null>(null);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            }, (error) => {
                console.error("Error getting location:", error);
            });
        }
    }, []);



    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    if (!vehicle) {
        return <div className="pt-24 text-center">Vehicle not found</div>;
    }

    // State for booking details
    const [startDate, setStartDate] = useState<string>('2023-08-15');
    const [endDate, setEndDate] = useState<string>('2023-08-16');
    const [location, setLocation] = useState<string>(vehicle?.location || '');

    // Edit modes
    const [isEditingDates, setIsEditingDates] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState(false);

    const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(
        vehicle?.coordinates || null
    );



    // Derived state
    const calculateDays = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
    };

    const duration = calculateDays(startDate, endDate);
    const serviceFee = 9;
    const total = vehicle ? (vehicle.price * duration + serviceFee) : 0;

    useEffect(() => {
        if (vehicle && !location) {
            setLocation(vehicle.location);
        }
        if (vehicle?.coordinates) {
            setDestination(vehicle.coordinates);
        }
    }, [vehicle]);

    useEffect(() => {
        if (userLocation && destination) {
            const dist = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                destination.lat,
                destination.lng
            );
            setDistance(Math.round(dist * 10) / 10);
        }
    }, [userLocation, destination]);

    const handleLocationUpdate = async () => {
        setIsEditingLocation(false);
        if (!location.trim()) return;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const newCoords = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                setDestination(newCoords);
            }
        } catch (error) {
            console.error("Failed to geocode location:", error);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-900 font-medium mb-8 hover:text-gray-700"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Vehicle
                </button>

                <h1 className="text-2xl font-bold text-gray-900 mb-8">Confirm and Pay</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Forms */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Trip Details & Map Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 pb-0">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Trip</h2>
                            </div>

                            {/* Map Container */}
                            <div className="h-64 w-full bg-gray-100 relative">
                                <MapWidget
                                    userLocation={userLocation}
                                    destination={destination}
                                />
                                {distance !== null && (
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm text-sm font-bold text-gray-800 z-[1000] border border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <Navigation size={16} className="text-orange-500" />
                                            {distance} km away
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                                    <div className="flex gap-3 w-full">
                                        <Calendar className="mt-1 text-gray-500" size={20} />
                                        <div className="w-full">
                                            <div className="font-medium text-gray-900">Dates</div>
                                            {isEditingDates ? (
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="px-2 py-1 border rounded text-sm"
                                                    />
                                                    <span className="self-center">-</span>
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="px-2 py-1 border rounded text-sm"
                                                    />
                                                    <button
                                                        onClick={() => setIsEditingDates(false)}
                                                        className="text-xs bg-orange-100 text-orange-600 px-2 rounded hover:bg-orange-200"
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-gray-500">{startDate} - {endDate}</div>
                                            )}
                                        </div>
                                    </div>
                                    {!isEditingDates && (
                                        <button
                                            onClick={() => setIsEditingDates(true)}
                                            className="text-gray-900 underline font-medium ml-2"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 w-full">
                                        <MapPin className="mt-1 text-gray-500" size={20} />
                                        <div className="w-full">
                                            <div className="font-medium text-gray-900">Vehicle Location</div>
                                            {isEditingLocation ? (
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        value={location}
                                                        onChange={(e) => setLocation(e.target.value)}
                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                    />
                                                    <button
                                                        onClick={handleLocationUpdate}
                                                        className="text-xs bg-orange-100 text-orange-600 px-2 rounded hover:bg-orange-200"
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-gray-500">{location}</div>
                                            )}
                                        </div>
                                    </div>
                                    {!isEditingLocation && (
                                        <button
                                            onClick={() => setIsEditingLocation(true)}
                                            className="text-gray-900 underline font-medium ml-2"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="text-xl font-bold text-gray-900">Payment Information</div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                                    <input
                                        type="text"
                                        placeholder="1234 5678 9012 3456"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                                        <input
                                            type="text"
                                            placeholder="123"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-6">
                                <Lock size={16} />
                                Your payment information is secure and encrypted
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Required for your trip</h2>
                            <p className="text-gray-600 mb-6">
                                By selecting the button below, I agree to the Host's House Rules, Ground Rules for guests, AutoShare's Rebooking and Refund Policy, and that AutoShare can charge my payment method if I'm responsible for damage.
                            </p>
                            <button className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition text-lg shadow-lg shadow-orange-500/30">
                                Confirm & Pay ${total}
                            </button>
                        </div>

                    </div>

                    {/* Right Column - Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Booking Summary</h2>

                            <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
                                <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src={vehicle.image} alt={vehicle.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{vehicle.name}</h3>
                                    <p className="text-sm text-gray-500">{vehicle.type}</p>
                                    <p className="text-sm text-gray-500">{vehicle.location}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>${vehicle.price} × {duration} days</span>
                                    <span>${vehicle.price * duration}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Service fee</span>
                                    <span>${serviceFee}</span>
                                </div>
                                <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-100">
                                    <span>Total (USD)</span>
                                    <span>${total}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleBooking;
