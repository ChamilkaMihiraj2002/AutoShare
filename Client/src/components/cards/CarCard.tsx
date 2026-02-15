import React from 'react';
import { Star, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatLkr } from '../../lib/currency';

interface CarProps {
  id: string;
  image: string;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  location: string;
  seats: number;
}

const CarCard: React.FC<CarProps> = ({ id, image, name, price, rating, reviews, location, seats }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
      <div className="relative h-48">
        <img src={image} alt={name} className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold">
          {formatLkr(price)}/<span className="text-xs font-normal text-gray-500">day</span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800">{name}</h3>
        <div className="flex items-center gap-1 mt-1 text-sm">
          <Star className="w-4 h-4 fill-orange-400 text-orange-400" />
          <span className="font-medium">{rating}</span>
          <span className="text-gray-400">({reviews} reviews)</span>
        </div>

        <div className="flex justify-between items-center mt-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {location}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" /> {seats}
          </div>
        </div>

        <Link
          to={`/vehicles/${id}`}
          state={{
            vehicle: {
              id,
              image,
              name,
              price,
              rating,
              reviews,
              location,
              seats,
            },
          }}
          className="block w-full mt-5 bg-[#003049] text-white py-2.5 rounded-lg font-semibold hover:bg-opacity-90 transition text-center"
        >
          View Details
        </Link>
      </div>
    </div>
  );
};

export default CarCard;
