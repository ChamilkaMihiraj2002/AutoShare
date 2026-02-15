import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Calendar, MapPin, Navigation } from 'lucide-react';
import MapWidget from '../components/map/MapWidget';
import LoadingScreen from '../components/common/LoadingScreen';
import { createRent, getPublicVehicleById } from '../lib/api';
import { getPrimaryVehicleImage } from '../lib/profile';
import { formatLkr } from '../lib/currency';
import type { Car } from '../types';

interface BookingVehicle extends Car {
  ownerUid: string;
}

const VehicleBooking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<BookingVehicle | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [location, setLocation] = useState<string>('');
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupOption, setPickupOption] = useState<'self_pickup' | 'delivery'>('self_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [insurancePlan, setInsurancePlan] = useState<'basic' | 'standard' | 'premium'>('basic');
  const [childSeatCount, setChildSeatCount] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        },
      );
    }
  }, []);

  useEffect(() => {
    const loadVehicle = async () => {
      if (!id) {
        setLoadingVehicle(false);
        return;
      }

      setLoadingVehicle(true);
      setLoadError('');
      try {
        const result = await getPublicVehicleById(id);
        if (!result) {
          setVehicle(null);
          return;
        }

        const mappedVehicle: BookingVehicle = {
          id: result.vehicleid,
          ownerUid: result.owner_uid,
          name: `${result.brand} ${result.model}`,
          price: result.price,
          rating: 4.8,
          reviews: 0,
          location: result.location,
          seats: result.seats ?? 5,
          type: result.type,
          fuelType: result.fuel,
          image: getPrimaryVehicleImage(result.image_urls, result.image_url),
        };

        setVehicle(mappedVehicle);
        setLocation(mappedVehicle.location);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load vehicle');
      } finally {
        setLoadingVehicle(false);
      }
    };

    void loadVehicle();
  }, [id]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (userLocation && destination) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, destination.lat, destination.lng);
      setDistance(Math.round(dist * 10) / 10);
    }
  }, [userLocation, destination]);

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const duration = calculateDays(startDate, endDate);
  const serviceFee = 9;
  const baseRent = vehicle ? vehicle.price * duration : 0;
  const insurancePerDay = insurancePlan === 'basic' ? 0 : insurancePlan === 'standard' ? 1200 : 2500;
  const insuranceTotal = insurancePerDay * duration;
  const deliveryFee = pickupOption === 'delivery' ? 1500 : 0;
  const childSeatTotal = childSeatCount * 500 * duration;
  const total = baseRent + serviceFee + insuranceTotal + deliveryFee + childSeatTotal;

  const handleLocationUpdate = async () => {
    setIsEditingLocation(false);
    if (!location.trim()) return;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        setDestination({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      }
    } catch (error) {
      console.error('Failed to geocode location:', error);
    }
  };

  const handleConfirmBooking = async () => {
    if (!vehicle) return;

    setSubmitError('');
    if (pickupOption === 'delivery' && !deliveryAddress.trim()) {
      setSubmitError('Delivery address is required when delivery is selected.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createRent({
        vehicle_id: vehicle.id,
        owner_uid: vehicle.ownerUid,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        pickup_option: pickupOption,
        delivery_address: pickupOption === 'delivery' ? deliveryAddress.trim() : null,
        insurance_plan: insurancePlan,
        child_seat_count: childSeatCount,
        note: note.trim() || undefined,
      });
      navigate('/user-dashboard/bookings');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingVehicle) {
    return <LoadingScreen message="Loading vehicle..." />;
  }

  if (loadError) {
    return <div className="pt-24 text-center text-red-600">{loadError}</div>;
  }

  if (!vehicle) {
    return <div className="pt-24 text-center">Vehicle not found</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-900 font-medium mb-8 hover:text-gray-700">
          <ArrowLeft size={20} className="mr-2" />
          Back to Vehicle
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Confirm and Pay</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 pb-0">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Trip</h2>
              </div>

              <div className="h-64 w-full bg-gray-100 relative">
                <MapWidget userLocation={userLocation} destination={destination} />
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
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1 border rounded text-sm" />
                          <span className="self-center">-</span>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1 border rounded text-sm" />
                          <button onClick={() => setIsEditingDates(false)} className="text-xs bg-orange-100 text-orange-600 px-2 rounded hover:bg-orange-200">
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-500">{startDate} - {endDate}</div>
                      )}
                    </div>
                  </div>
                  {!isEditingDates && (
                    <button onClick={() => setIsEditingDates(true)} className="text-gray-900 underline font-medium ml-2">
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
                          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                          <button onClick={handleLocationUpdate} className="text-xs bg-orange-100 text-orange-600 px-2 rounded hover:bg-orange-200">
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-500">{location}</div>
                      )}
                    </div>
                  </div>
                  {!isEditingLocation && (
                    <button onClick={() => setIsEditingLocation(true)} className="text-gray-900 underline font-medium ml-2">
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-xl font-bold text-gray-900 mb-6">Rent Options</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Option</label>
                  <select
                    value={pickupOption}
                    onChange={(e) => setPickupOption(e.target.value as 'self_pickup' | 'delivery')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="self_pickup">Self Pickup</option>
                    <option value="delivery">Delivery (+{formatLkr(1500)})</option>
                  </select>
                </div>

                {pickupOption === 'delivery' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter full delivery address"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Plan</label>
                  <select
                    value={insurancePlan}
                    onChange={(e) => setInsurancePlan(e.target.value as 'basic' | 'standard' | 'premium')}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="basic">Basic (Included)</option>
                    <option value="standard">Standard (+{formatLkr(1200)}/day)</option>
                    <option value="premium">Premium (+{formatLkr(2500)}/day)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Child Seats</label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={childSeatCount}
                    onChange={(e) => setChildSeatCount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formatLkr(500)} per seat/day</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note to Owner (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Any special request?"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="text-xl font-bold text-gray-900">Payment Information</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                    <input type="text" placeholder="123" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
                  <input type="text" placeholder="John Doe" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mt-6">
                <Lock size={16} />
                Your payment information is secure and encrypted
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Required for your trip</h2>
              <p className="text-gray-600 mb-6">
                By selecting the button below, I agree to the Host's House Rules, Ground Rules for guests, AutoShare's Rebooking and Refund Policy, and that AutoShare can charge my payment method if I'm responsible for damage.
              </p>
              <button
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition text-lg shadow-lg shadow-orange-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Confirming...' : `Confirm & Pay ${formatLkr(total)}`}
              </button>
              {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
            </div>
          </div>

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
                  <span>{formatLkr(vehicle.price)} × {duration} days</span>
                  <span>{formatLkr(baseRent)}</span>
                </div>
                {insuranceTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Insurance ({insurancePlan})</span>
                    <span>{formatLkr(insuranceTotal)}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span>{formatLkr(deliveryFee)}</span>
                  </div>
                )}
                {childSeatTotal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Child seats ({childSeatCount})</span>
                    <span>{formatLkr(childSeatTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Pickup option</span>
                  <span>{pickupOption === 'delivery' ? 'Delivery' : 'Self Pickup'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Service fee</span>
                  <span>{formatLkr(serviceFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-3 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatLkr(total)}</span>
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
