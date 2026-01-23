import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Users, Fuel, Gauge, Calendar } from 'lucide-react';
import { MOCK_VEHICLES } from '../data/mockVehicles';

const VehicleDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const vehicle = MOCK_VEHICLES.find(v => v.id === Number(id));

    // Mock additional details not in the basic type
    const specifications = {
        year: 2023,
        transmission: 'Automatic',
        fuel: vehicle?.fuelType || 'Electric',
        capacity: vehicle?.seats || 5
    };

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    if (!vehicle) {
        return <div className="pt-24 text-center">Vehicle not found</div>;
    }

    const calculateTotal = () => {
        // Simplified calculation
        if (!startDate || !endDate) return null;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays * vehicle.price : 0;
    };

    const days = calculateTotal() ? Math.ceil(calculateTotal()! / vehicle.price) : 0;
    const serviceFee = 9;
    const total = (days * vehicle.price) + serviceFee;


    const handleBookNow = () => {
        navigate(`/vehicles/${vehicle.id}/book`);
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
                            <div className="flex justify-between items-baseline mb-6">
                                <div className="text-2xl font-bold text-gray-900">${vehicle.price} <span className="text-base font-normal text-gray-500">per day</span></div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {days > 0 && (
                                <div className="space-y-3 mb-6 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between text-gray-600">
                                        <span>${vehicle.price} × {days} days</span>
                                        <span>${days * vehicle.price}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Service fee</span>
                                        <span>${serviceFee}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-100">
                                        <span>Total</span>
                                        <span>${total}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleBookNow}
                                className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/30"
                            >
                                Book Now
                            </button>

                            <p className="text-center text-sm text-gray-400 mt-4">You won't be charged yet</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetails;
