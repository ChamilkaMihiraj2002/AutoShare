import type { ReactNode } from 'react';

export interface Car {
  id: string;
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

export interface AuthResponse {
  uid: string;
  email?: string | null;
  idToken?: string | null;
}

export type UserRole = 'user' | 'vehicle_owner' | 'renter';

export interface UserProfile {
  uid: string;
  email: string;
  full_name?: string | null;
  address: string;
  nic: string;
  phone: string;
  roles: UserRole[];
  avatar_url?: string | null;
}

export interface PublicUserProfile {
  uid: string;
  full_name?: string | null;
  email: string;
}

export interface VehicleApi {
  vehicleid: string;
  owner_uid: string;
  type: string;
  fuel: string;
  transmission: string;
  price: number;
  seats: number;
  availability: boolean;
  location: string;
  brand: string;
  year: number;
  model: string;
  image_urls?: string[] | null;
  image_url?: string | null;
}

export interface RentApi {
  rentid: string;
  renter_uid: string;
  owner_uid: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  booking_status: 'pending' | 'accepted' | 'cancelled' | 'completed';
  pickup_option?: string;
  delivery_address?: string | null;
  insurance_plan?: string;
  child_seat_count?: number;
  note?: string | null;
}

export interface OwnerEarningsPeriodSummary {
  amount: number;
  bookings: number;
}

export interface OwnerEarningsSummary {
  this_month: OwnerEarningsPeriodSummary;
  last_month: OwnerEarningsPeriodSummary;
  all_time: OwnerEarningsPeriodSummary;
  change_percentage: number;
}

export interface OwnerEarningsTransaction {
  rent_id: string;
  vehicle_id: string;
  vehicle_name: string;
  renter_uid: string;
  start_date: string;
  end_date: string;
  amount: number;
  booking_status: 'pending' | 'accepted' | 'cancelled' | 'completed';
}

export interface OwnerEarningsOverview {
  summary: OwnerEarningsSummary;
  transactions: OwnerEarningsTransaction[];
}
