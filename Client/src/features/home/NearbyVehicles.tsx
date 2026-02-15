import CarCard from '../../components/cards/CarCard';
import type { Car } from '../../types';

const DUMMY_CARS: Car[] = [
  { id: '1', name: 'Tesla Model 3', price: 89, rating: 4.9, reviews: 127, location: 'Jada', seats: 5, image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80' },
  { id: '2', name: 'BMW X5 SUV', price: 125, rating: 4.8, reviews: 94, location: 'Negombo', seats: 7, image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80' },
  { id: '3', name: 'Porsche 911', price: 299, rating: 5.0, reviews: 56, location: 'Moratuwa', seats: 2, image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80' },
  { id: '4', name: 'Mercedes C-Class', price: 95, rating: 4.7, reviews: 83, location: 'Nikaweratiya', seats: 5, image: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80' },
];

const NearbyVehicles = () => {
  return (
    <section className="py-20 px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-2">Top-Rated Nearby Vehicles</h2>
        <p className="text-gray-500">Discover the most popular vehicles available in your area</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {DUMMY_CARS.map(car => <CarCard key={car.id} {...car} />)}
      </div>
    </section>
  );
};
export default NearbyVehicles;
