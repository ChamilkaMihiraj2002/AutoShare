import type { Car } from '../types';

export const MOCK_VEHICLES: Car[] = [
    {
        id: 1,
        name: 'Tesla Model 3',
        price: 89,
        rating: 4.9,
        reviews: 127,
        location: 'Jada',
        seats: 5,
        type: 'Sedan',
        fuelType: 'Electric',
        image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80',
        coordinates: { lat: 7.0840, lng: 79.8977 } // Ja-Ela (Jada?)
    },
    {
        id: 2,
        name: 'BMW X5 SUV',
        price: 125,
        rating: 4.8,
        reviews: 94,
        location: 'Negombo',
        seats: 7,
        type: 'SUV',
        fuelType: 'Diesel',
        image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80',
        coordinates: { lat: 7.2008, lng: 79.8737 } // Negombo
    },
    {
        id: 3,
        name: 'Porsche 911',
        price: 299,
        rating: 5.0,
        reviews: 56,
        location: 'Moratuwa',
        seats: 2,
        type: 'Coupe',
        fuelType: 'Petrol',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80',
        coordinates: { lat: 6.7881, lng: 79.8795 } // Moratuwa
    },
    {
        id: 4,
        name: 'Mercedes C-Class',
        price: 95,
        rating: 4.7,
        reviews: 83,
        location: 'Nikaweratiya',
        seats: 5,
        type: 'Sedan',
        fuelType: 'Hybrid',
        image: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80',
        coordinates: { lat: 7.7490, lng: 80.1228 } // Nikaweratiya
    },
    {
        id: 5,
        name: 'Toyota Land Cruiser',
        price: 150,
        rating: 4.9,
        reviews: 200,
        location: 'Colombo',
        seats: 7,
        type: 'SUV',
        fuelType: 'Diesel',
        image: 'https://images.unsplash.com/photo-1594502184342-28efcb0a5748?auto=format&fit=crop&q=80',
        coordinates: { lat: 6.9271, lng: 79.8612 } // Colombo
    },
    {
        id: 6,
        name: 'Honda Civic',
        price: 55,
        rating: 4.6,
        reviews: 150,
        location: 'Kandy',
        seats: 5,
        type: 'Sedan',
        fuelType: 'Petrol',
        image: 'https://images.unsplash.com/photo-1606152421811-aba7269676ff?auto=format&fit=crop&q=80',
        coordinates: { lat: 7.2906, lng: 80.6337 } // Kandy
    },
    {
        id: 7,
        name: 'Ford Mustang',
        price: 130,
        rating: 4.8,
        reviews: 89,
        location: 'Galle',
        seats: 4,
        type: 'Coupe',
        fuelType: 'Petrol',
        image: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&q=80',
        coordinates: { lat: 6.0535, lng: 80.2210 } // Galle
    },
    {
        id: 8,
        name: 'Nissan Leaf',
        price: 60,
        rating: 4.5,
        reviews: 110,
        location: 'Kurunegala',
        seats: 5,
        type: 'Hatchback',
        fuelType: 'Electric',
        image: 'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?auto=format&fit=crop&q=80',
        coordinates: { lat: 7.4818, lng: 80.3609 } // Kurunegala
    }
];
