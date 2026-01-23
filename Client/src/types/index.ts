import type { ReactNode } from 'react';

export interface Car {
  id: number;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  location: string;
  seats: number;
  image: string;
  type?: string;
  fuelType?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Step {
  id: number;
  title: string;
  description: string;
  icon: ReactNode;
}

export interface Service {
  title: string;
  description: string;
  icon: ReactNode;
}