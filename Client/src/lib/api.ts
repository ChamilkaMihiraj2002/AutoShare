import type {
  AdminAuthResponse,
  AdminBookingsResponse,
  AdminDashboardOverview,
  AdminDynamicPricingSettings,
  AdminDynamicPricingSettingsResponse,
  AdminVehicleVerificationItem,
  AdminVehiclesResponse,
  AdminUsersResponse,
  AuthResponse,
  ConversationApi,
  OwnerEarningsOverview,
  PricingQuote,
  PublicUserProfile,
  RentApi,
  UserProfile,
  UserRole,
  VehicleApi,
} from '../types';
import { clearAdminAuthToken, clearAuthToken, getAdminAuthToken, getAuthToken } from './auth';
import { notifyProfileUpdated } from './profile';
import { getPrimaryVehicleImage } from './profile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RawVehicleApi = VehicleApi & { _id?: string };
type RawRentApi = RentApi & { _id?: string };
type RawConversationApi = ConversationApi & { _id?: string };

function normalizeVehicle(vehicle: RawVehicleApi): VehicleApi {
  const urls = Array.isArray(vehicle.image_urls) ? vehicle.image_urls.filter(Boolean) : [];
  const legacy = vehicle.image_url ? [vehicle.image_url] : [];
  const image_urls = urls.length > 0 ? urls : legacy;
  const image_url = vehicle.image_url || image_urls[0] || null;
  return {
    ...vehicle,
    vehicleid: vehicle.vehicleid || vehicle._id || '',
    seats: Number.isFinite(vehicle.seats) ? vehicle.seats : 5,
    image_urls,
    image_url,
  };
}

export function mapVehicleApiToCar(vehicle: VehicleApi) {
  return {
    id: vehicle.vehicleid,
    ownerUid: vehicle.owner_uid,
    name: `${vehicle.brand} ${vehicle.model}`,
    price: vehicle.price,
    rating: 4.8,
    reviews: 0,
    location: vehicle.location,
    seats: vehicle.seats ?? 5,
    type: vehicle.type,
    fuelType: vehicle.fuel,
    transmission: vehicle.transmission,
    year: vehicle.year,
    image: getPrimaryVehicleImage(vehicle.image_urls, vehicle.image_url),
    images: vehicle.image_urls ?? [],
    verified: vehicle.verification_status === 'verified',
  };
}

function normalizeRent(rent: RawRentApi): RentApi {
  return {
    ...rent,
    rentid: rent.rentid || rent._id || '',
    booking_status: rent.booking_status || 'pending',
  };
}

function normalizeConversation(conversation: RawConversationApi): ConversationApi {
  return {
    ...conversation,
    conversationid: conversation.conversationid || conversation._id || '',
    messages: Array.isArray(conversation.messages) ? conversation.messages : [],
  };
}

async function apiRequest<T>(
  path: string,
  method: RequestMethod = 'GET',
  body?: unknown,
  useAuth = false,
  tokenOverride?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (useAuth) {
    const token = tokenOverride ?? getAuthToken();
    if (!token) {
      throw new Error('You are not signed in.');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      const detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      if (detail) errorMessage = detail;
    } catch {
      // Keep generic error when body isn't JSON.
    }

    if (response.status === 401) {
      clearAuthToken();
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function adminApiRequest<T>(
  path: string,
  method: RequestMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const token = getAdminAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      const detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      if (detail) errorMessage = detail;
    } catch {
      // Keep generic error when body isn't JSON.
    }

    if (response.status === 401) {
      clearAdminAuthToken();
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export async function loginAdmin(username: string, password: string): Promise<AdminAuthResponse> {
  return adminApiRequest<AdminAuthResponse>('/admin/auth/login', 'POST', { username, password });
}

export async function getAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  return adminApiRequest<AdminDashboardOverview>('/admin/dashboard/overview');
}

export async function getAdminUsers(): Promise<AdminUsersResponse> {
  return adminApiRequest<AdminUsersResponse>('/admin/users');
}

export async function getAdminBookings(): Promise<AdminBookingsResponse> {
  return adminApiRequest<AdminBookingsResponse>('/admin/bookings');
}

export async function getAdminVehicles(): Promise<AdminVehiclesResponse> {
  return adminApiRequest<AdminVehiclesResponse>('/admin/vehicles');
}

export async function getAdminPricingSettings(): Promise<AdminDynamicPricingSettingsResponse> {
  return adminApiRequest<AdminDynamicPricingSettingsResponse>('/admin/pricing-settings');
}

export async function updateAdminPricingSettings(
  payload: AdminDynamicPricingSettings,
): Promise<AdminDynamicPricingSettingsResponse> {
  return adminApiRequest<AdminDynamicPricingSettingsResponse>('/admin/pricing-settings', 'PUT', payload);
}

export async function updateAdminVehicleVerification(
  vehicleId: string,
  payload: {
    verification_status: 'verified' | 'rejected';
    verification_notes?: string;
  },
): Promise<AdminVehicleVerificationItem> {
  return adminApiRequest<AdminVehicleVerificationItem>(`/admin/vehicles/${vehicleId}/verification`, 'PATCH', payload);
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', 'POST', { email, password });
}

export async function registerWithEmail(payload: {
  email: string;
  password: string;
  address: string;
  nic: string;
  phone: string;
  roles: UserRole[];
}): Promise<void> {
  await apiRequest('/auth/register/email', 'POST', payload);
}

export async function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me', 'GET', undefined, true);
}

export async function getUserPublicProfile(uid: string): Promise<PublicUserProfile> {
  return apiRequest<PublicUserProfile>(`/users/${uid}`);
}

export async function updateMyProfile(payload: {
  full_name?: string;
  address?: string;
  nic?: string;
  phone?: string;
  roles?: UserRole[];
}): Promise<UserProfile> {
  const profile = await apiRequest<UserProfile>('/users/me', 'PATCH', payload, true);
  notifyProfileUpdated(profile);
  return profile;
}

export async function loginSocial(idToken: string): Promise<UserProfile> {
  return apiRequest<UserProfile>('/auth/login/social', 'POST', undefined, true, idToken);
}

export async function registerSocial(
  payload: {
    address: string;
    nic: string;
    phone: string;
    roles: UserRole[];
  },
  idToken?: string,
): Promise<void> {
  await apiRequest('/auth/register/social', 'POST', payload, true, idToken);
}

export async function getPublicVehicles(): Promise<VehicleApi[]> {
  const vehicles = await apiRequest<RawVehicleApi[]>('/vehicles');
  return vehicles.map(normalizeVehicle);
}

export async function getPublicVehicleById(vehicleId: string): Promise<VehicleApi | null> {
  const vehicles = await getPublicVehicles();
  return vehicles.find((vehicle) => vehicle.vehicleid === vehicleId) || null;
}

export async function getMyRents(): Promise<RentApi[]> {
  const rents = await apiRequest<RawRentApi[]>('/rents/', 'GET', undefined, true);
  return rents.map(normalizeRent);
}

export async function getOwnerRents(): Promise<RentApi[]> {
  const rents = await apiRequest<RawRentApi[]>('/rents/owner', 'GET', undefined, true);
  return rents.map(normalizeRent);
}

export async function getOwnerEarnings(): Promise<OwnerEarningsOverview> {
  return apiRequest<OwnerEarningsOverview>('/rents/owner/earnings', 'GET', undefined, true);
}

export async function getMyVehicles(): Promise<VehicleApi[]> {
  const vehicles = await apiRequest<RawVehicleApi[]>('/vehicles/', 'GET', undefined, true);
  return vehicles.map(normalizeVehicle);
}

export async function getMyVehicleById(vehicleId: string): Promise<VehicleApi> {
  const vehicle = await apiRequest<RawVehicleApi>(`/vehicles/${vehicleId}`, 'GET', undefined, true);
  return normalizeVehicle(vehicle);
}

export async function createMyVehicle(payload: {
  type: string;
  fuel: string;
  transmission: string;
  price: number;
  availability: boolean;
  location: string;
  brand: string;
  year: number;
  model: string;
  seats: number;
}): Promise<VehicleApi> {
  const vehicle = await apiRequest<RawVehicleApi>('/vehicles/', 'POST', payload, true);
  return normalizeVehicle(vehicle);
}

export async function updateMyVehicle(
  vehicleId: string,
  payload: {
    type?: string;
    fuel?: string;
    transmission?: string;
    price?: number;
    availability?: boolean;
    location?: string;
    brand?: string;
    year?: number;
    model?: string;
    seats?: number;
    image_urls?: string[];
    image_url?: string;
  },
): Promise<VehicleApi> {
  const vehicle = await apiRequest<RawVehicleApi>(`/vehicles/${vehicleId}`, 'PATCH', payload, true);
  return normalizeVehicle(vehicle);
}

export async function deleteMyVehicle(vehicleId: string): Promise<void> {
  await apiRequest<void>(`/vehicles/${vehicleId}`, 'DELETE', undefined, true);
}

export async function uploadVehicleImage(vehicleId: string, file: File): Promise<VehicleApi> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('You are not signed in.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      const detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      if (detail) errorMessage = detail;
    } catch {
      // Keep generic error.
    }
    if (response.status === 401) {
      clearAuthToken();
    }
    throw new Error(errorMessage);
  }

  const vehicle = (await response.json()) as RawVehicleApi;
  return normalizeVehicle(vehicle);
}

export async function uploadVehicleVerificationDocuments(
  vehicleId: string,
  payload: {
    vehicleBook: File;
    vehicleLicense: File;
  },
): Promise<VehicleApi> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('You are not signed in.');
  }

  const formData = new FormData();
  formData.append('vehicle_book', payload.vehicleBook);
  formData.append('vehicle_license', payload.vehicleLicense);

  const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/verification-documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      const detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      if (detail) errorMessage = detail;
    } catch {
      // Keep generic error.
    }
    if (response.status === 401) {
      clearAuthToken();
    }
    throw new Error(errorMessage);
  }

  const vehicle = (await response.json()) as RawVehicleApi;
  return normalizeVehicle(vehicle);
}

export async function deleteVehicleImage(vehicleId: string, imageUrl: string): Promise<VehicleApi> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('You are not signed in.');
  }

  const query = new URLSearchParams({ image_url: imageUrl });
  const response = await fetch(`${API_BASE_URL}/vehicles/${vehicleId}/image?${query.toString()}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      const detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      if (detail) errorMessage = detail;
    } catch {
      // Keep generic error.
    }
    if (response.status === 401) {
      clearAuthToken();
    }
    throw new Error(errorMessage);
  }

  const vehicle = (await response.json()) as RawVehicleApi;
  return normalizeVehicle(vehicle);
}

export async function createRent(payload: {
  vehicle_id: string;
  owner_uid: string;
  start_date: string;
  end_date: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  country_code?: string;
  pickup_option?: string;
  delivery_address?: string | null;
  insurance_plan?: string;
  child_seat_count?: number;
  note?: string;
}): Promise<RentApi> {
  const rent = await apiRequest<RawRentApi>('/rents/', 'POST', payload, true);
  return normalizeRent(rent);
}

export async function updateMyRent(
  rentId: string,
  payload: {
    start_date?: string;
    end_date?: string;
    pickup_latitude?: number | null;
    pickup_longitude?: number | null;
    destination_latitude?: number | null;
    destination_longitude?: number | null;
    country_code?: string;
    pickup_option?: string;
    delivery_address?: string | null;
    insurance_plan?: string;
    child_seat_count?: number;
    note?: string;
  },
): Promise<RentApi> {
  const rent = await apiRequest<RawRentApi>(`/rents/${rentId}`, 'PATCH', payload, true);
  return normalizeRent(rent);
}

export async function cancelMyRent(rentId: string): Promise<RentApi> {
  const rent = await apiRequest<RawRentApi>(`/rents/${rentId}/cancel-by-renter`, 'POST', undefined, true);
  return normalizeRent(rent);
}

export async function getVehiclePricingQuote(
  vehicleId: string,
  payload: {
    startDate: string;
    endDate: string;
    pickupLatitude?: number | null;
    pickupLongitude?: number | null;
    destinationLatitude?: number | null;
    destinationLongitude?: number | null;
    countryCode?: string;
  },
): Promise<PricingQuote> {
  const query = new URLSearchParams({
    start_date: payload.startDate,
    end_date: payload.endDate,
  });
  if (payload.pickupLatitude !== undefined && payload.pickupLatitude !== null) {
    query.set('pickup_latitude', String(payload.pickupLatitude));
  }
  if (payload.pickupLongitude !== undefined && payload.pickupLongitude !== null) {
    query.set('pickup_longitude', String(payload.pickupLongitude));
  }
  if (payload.destinationLatitude !== undefined && payload.destinationLatitude !== null) {
    query.set('destination_latitude', String(payload.destinationLatitude));
  }
  if (payload.destinationLongitude !== undefined && payload.destinationLongitude !== null) {
    query.set('destination_longitude', String(payload.destinationLongitude));
  }
  if (payload.countryCode) {
    query.set('country_code', payload.countryCode);
  }
  return apiRequest<PricingQuote>(`/vehicles/${vehicleId}/pricing?${query.toString()}`);
}

export async function acceptOwnerRent(rentId: string): Promise<RentApi> {
  const rent = await apiRequest<RawRentApi>(`/rents/${rentId}/accept`, 'POST', undefined, true);
  return normalizeRent(rent);
}

export async function cancelOwnerRent(rentId: string): Promise<RentApi> {
  const rent = await apiRequest<RawRentApi>(`/rents/${rentId}/cancel`, 'POST', undefined, true);
  return normalizeRent(rent);
}

export async function completeOwnerRent(rentId: string): Promise<RentApi> {
  const rent = await apiRequest<RawRentApi>(`/rents/${rentId}/complete`, 'POST', undefined, true);
  return normalizeRent(rent);
}

export async function getMyConversations(): Promise<ConversationApi[]> {
  const conversations = await apiRequest<RawConversationApi[]>('/messages/conversations', 'GET', undefined, true);
  return conversations.map(normalizeConversation);
}

export async function getConversationById(conversationId: string): Promise<ConversationApi> {
  const conversation = await apiRequest<RawConversationApi>(`/messages/conversations/${conversationId}`, 'GET', undefined, true);
  return normalizeConversation(conversation);
}

export async function createConversation(payload: {
  vehicle_id: string;
  owner_uid: string;
  initial_message?: string;
}): Promise<ConversationApi> {
  const conversation = await apiRequest<RawConversationApi>('/messages/conversations', 'POST', payload, true);
  return normalizeConversation(conversation);
}

export async function sendConversationMessage(conversationId: string, payload: {
  text: string;
}): Promise<ConversationApi> {
  const conversation = await apiRequest<RawConversationApi>(`/messages/conversations/${conversationId}/messages`, 'POST', payload, true);
  return normalizeConversation(conversation);
}

export async function uploadMyAvatar(file: File): Promise<UserProfile> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('You are not signed in.');
  }

  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      const detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      if (detail) errorMessage = detail;
    } catch {
      // Keep generic error.
    }
    if (response.status === 401) {
      clearAuthToken();
    }
    throw new Error(errorMessage);
  }

  const profile = await response.json() as UserProfile;
  notifyProfileUpdated(profile);
  return profile;
}
