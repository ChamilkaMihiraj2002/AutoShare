import React from 'react';
import CarCard from '../../components/cards/CarCard';
import type { Car } from '../../types';
import { getPublicVehicles, mapVehicleApiToCar } from '../../lib/api';

const NearbyVehicles = () => {
  const [cars, setCars] = React.useState<Car[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const loadVehicles = async () => {
      setLoading(true);
      setError('');

      try {
        const vehicles = await getPublicVehicles();
        const availableCars = vehicles
          .filter((vehicle) => vehicle.availability)
          .map(mapVehicleApiToCar)
          .slice(0, 4);
        setCars(availableCars);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    void loadVehicles();
  }, []);

  return (
    <section className="py-20 px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-2">Top-Rated Nearby Vehicles</h2>
        <p className="text-gray-500">Discover the most popular vehicles available in your area</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading vehicles...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : cars.length === 0 ? (
        <p className="text-center text-gray-500">No vehicles are currently available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {cars.map((car) => <CarCard key={car.id} {...car} />)}
        </div>
      )}
    </section>
  );
};

export default NearbyVehicles;
