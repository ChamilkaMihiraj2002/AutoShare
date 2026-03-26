import type { AuthResponse, PublicUserProfile, RentApi, UserProfile, UserRole, VehicleApi } from '../types';
import { clearAuthToken, getAuthToken } from './auth';
import { notifyProfileUpdated } from './profile';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type RawVehicleApi = VehicleApi & { _id?: string };
type RawRentApi = RentApi & { _id?: string };

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

function normalizeRent(rent: RawRentApi): RentApi {
  return {
    ...rent,
    rentid: rent.rentid || rent._id || '',
    booking_status: rent.booking_status || 'pending',
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
  return apiRequest<PublicUserProfile>(`/users/${uid}`, 'GET', undefined, true);
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
  pickup_option?: string;
  delivery_address?: string | null;
  insurance_plan?: string;
  child_seat_count?: number;
  note?: string;
}): Promise<RentApi> {
  const rent = await apiRequest<RawRentApi>('/rents/', 'POST', payload, true);
  return normalizeRent(rent);
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
