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
  verified?: boolean;
  type?: string;
  fuelType?: string;
  transmission?: string;
  year?: number;
  ownerUid?: string;
  images?: string[];
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

export interface AdminAuthResponse {
  username: string;
  token: string;
  message: string;
}

export interface AdminOverviewStats {
  total_users: number;
  total_renters: number;
  total_vehicle_owners: number;
  active_vehicles: number;
  inactive_vehicles: number;
  pending_vehicle_verifications: number;
  verified_vehicles: number;
  current_rents: number;
  completed_rents: number;
}

export interface AdminActivityItem {
  title: string;
  detail: string;
  created_at?: string | null;
  outcome?: string | null;
}

export interface AdminAccountSummary {
  username: string;
  display_name: string;
  last_login_at?: string | null;
}

export interface AdminDashboardOverview {
  admin: AdminAccountSummary;
  stats: AdminOverviewStats;
  recent_requests: AdminActivityItem[];
  recent_admin_logins: AdminActivityItem[];
}

export interface AdminUserItem {
  uid: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  roles: string[];
  address?: string | null;
}

export interface AdminBookingItem {
  rent_id: string;
  renter_uid: string;
  owner_uid: string;
  vehicle_id: string;
  booking_status: string;
  start_date?: string | null;
  end_date?: string | null;
  total_amount?: number | null;
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
}

export interface AdminBookingsResponse {
  bookings: AdminBookingItem[];
}

export interface AdminVehicleVerificationItem {
  vehicle_id: string;
  owner_uid: string;
  brand: string;
  model: string;
  year: number;
  location: string;
  availability: boolean;
  verification_status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  verification_notes?: string | null;
  verification_submitted_at?: string | null;
  verification_verified_at?: string | null;
  verification_verified_by?: string | null;
  vehicle_book_url?: string | null;
  vehicle_license_url?: string | null;
}

export interface AdminVehiclesResponse {
  vehicles: AdminVehicleVerificationItem[];
}

export interface AdminDynamicPricingSettings {
  enabled: boolean;
  weekend_multiplier: number;
  weekly_discount_percentage: number;
  monthly_discount_percentage: number;
  holiday_multiplier: number;
  rainy_weather_multiplier: number;
  severe_weather_multiplier: number;
  distance_included_km: number;
  distance_surcharge_per_km: number;
  custom_date_multipliers: CustomDateMultiplier[];
}

export interface AdminDynamicPricingSettingsResponse {
  settings: AdminDynamicPricingSettings;
}

export interface VehicleVerificationDocuments {
  vehicle_book_url?: string | null;
  vehicle_license_url?: string | null;
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
  avatar_url?: string | null;
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
  dynamic_pricing?: VehicleDynamicPricing | null;
  verification_documents?: VehicleVerificationDocuments | null;
  verification_status?: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  verification_notes?: string | null;
  verification_submitted_at?: string | null;
  verification_verified_at?: string | null;
  verification_verified_by?: string | null;
}

export interface CustomDateMultiplier {
  label?: string | null;
  start_date: string;
  end_date: string;
  multiplier: number;
}

export interface VehicleDynamicPricing {
  enabled: boolean;
  weekend_multiplier: number;
  weekly_discount_percentage: number;
  monthly_discount_percentage: number;
  holiday_multiplier: number;
  rainy_weather_multiplier: number;
  severe_weather_multiplier: number;
  distance_included_km: number;
  distance_surcharge_per_km: number;
  custom_date_multipliers: CustomDateMultiplier[];
}

export interface PricingQuoteLineItem {
  date: string;
  base_price: number;
  adjusted_price: number;
  applied_multipliers: string[];
}

export interface PricingQuote {
  currency: string;
  base_daily_price: number;
  total_days: number;
  subtotal: number;
  duration_discount_percentage: number;
  duration_discount_amount: number;
  distance_km: number;
  distance_fee: number;
  holiday_dates: string[];
  weather_summary: string[];
  weather_note?: string | null;
  total: number;
  line_items: PricingQuoteLineItem[];
}

export interface RentApi {
  rentid: string;
  renter_uid: string;
  owner_uid: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  country_code?: string;
  booking_status: 'pending' | 'accepted' | 'cancelled' | 'completed';
  pickup_option?: string;
  delivery_address?: string | null;
  insurance_plan?: string;
  child_seat_count?: number;
  note?: string | null;
  pricing_snapshot?: PricingQuote | null;
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

export type AppNotificationType =
  | 'booking_request'
  | 'upcoming_booking'
  | 'booking_cancelled'
  | 'vehicle_handover'
  | 'message';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  description: string;
  timestamp: string;
  route: string;
  entityId: string;
}
