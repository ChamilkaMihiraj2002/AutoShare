import type { AppNotification, PublicUserProfile, RentApi, VehicleApi } from '../types';
import { getProfileDisplayName } from './profile';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function getNotificationReadStorageKey(mode: 'owner' | 'renter'): string {
  return `autoshare:${mode}:notifications:read`;
}

function formatVehicleName(vehicle?: VehicleApi): string {
  if (!vehicle) return 'Vehicle';
  return `${vehicle.brand} ${vehicle.model}`;
}

function formatPersonName(profile?: PublicUserProfile, fallback = 'Customer'): string {
  if (!profile) return fallback;
  return getProfileDisplayName(profile.full_name, profile.email);
}

function startOfIso(value: string): number {
  return new Date(value).getTime();
}

function isWithinWindow(startDate: string, days: number): boolean {
  const now = Date.now();
  const start = startOfIso(startDate);
  return start >= now && start - now <= days * DAY_IN_MS;
}

export function buildOwnerNotifications(params: {
  rents: RentApi[];
  vehicles: VehicleApi[];
  renterProfiles: Map<string, PublicUserProfile | undefined>;
}): AppNotification[] {
  const { rents, vehicles, renterProfiles } = params;
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.vehicleid, vehicle]));

  return rents.flatMap((rent) => {
    const vehicle = vehicleById.get(rent.vehicle_id);
    const renterName = formatPersonName(renterProfiles.get(rent.renter_uid));
    const vehicleName = formatVehicleName(vehicle);
    const notifications: AppNotification[] = [];

    if (rent.booking_status === 'pending') {
      notifications.push({
        id: `owner-request-${rent.rentid}`,
        type: 'booking_request',
        title: 'New booking request',
        description: `${renterName} requested ${vehicleName}.`,
        timestamp: rent.start_date,
        route: '/dashboard/requests',
        entityId: rent.rentid,
      });
    }

    if (rent.booking_status === 'accepted' && new Date(rent.end_date) > new Date()) {
      notifications.push({
        id: `owner-upcoming-${rent.rentid}`,
        type: 'upcoming_booking',
        title: 'Upcoming booking',
        description: `${vehicleName} is booked by ${renterName}.`,
        timestamp: rent.start_date,
        route: '/dashboard/requests',
        entityId: rent.rentid,
      });
    }

    if (rent.booking_status === 'cancelled') {
      notifications.push({
        id: `owner-cancel-${rent.rentid}`,
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        description: `${renterName}'s ${vehicleName} booking was cancelled.`,
        timestamp: rent.end_date,
        route: '/dashboard/requests',
        entityId: rent.rentid,
      });
    }

    if (rent.booking_status === 'accepted' && isWithinWindow(rent.start_date, 2)) {
      notifications.push({
        id: `owner-handover-${rent.rentid}`,
        type: 'vehicle_handover',
        title: 'Vehicle handover soon',
        description: `${vehicleName} handover is due within 48 hours.`,
        timestamp: rent.start_date,
        route: '/dashboard/requests',
        entityId: rent.rentid,
      });
    }

    if ((rent.note || '').trim()) {
      notifications.push({
        id: `owner-message-${rent.rentid}`,
        type: 'message',
        title: 'New renter message',
        description: `${renterName} left a note for ${vehicleName}.`,
        timestamp: rent.start_date,
        route: '/dashboard/requests',
        entityId: rent.rentid,
      });
    }

    return notifications;
  }).sort((a, b) => startOfIso(b.timestamp) - startOfIso(a.timestamp));
}

export function buildRenterNotifications(params: {
  rents: RentApi[];
  vehicles: VehicleApi[];
  ownerProfiles: Map<string, PublicUserProfile | undefined>;
}): AppNotification[] {
  const { rents, vehicles, ownerProfiles } = params;
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.vehicleid, vehicle]));

  return rents.flatMap((rent) => {
    const vehicle = vehicleById.get(rent.vehicle_id);
    const ownerName = formatPersonName(ownerProfiles.get(rent.owner_uid), 'Owner');
    const vehicleName = formatVehicleName(vehicle);
    const notifications: AppNotification[] = [];

    if (rent.booking_status === 'pending') {
      notifications.push({
        id: `renter-request-${rent.rentid}`,
        type: 'booking_request',
        title: 'Booking request sent',
        description: `Your request for ${vehicleName} is waiting for ${ownerName}.`,
        timestamp: rent.start_date,
        route: '/user-dashboard/bookings',
        entityId: rent.rentid,
      });
    }

    if (rent.booking_status === 'accepted' && new Date(rent.end_date) > new Date()) {
      notifications.push({
        id: `renter-upcoming-${rent.rentid}`,
        type: 'upcoming_booking',
        title: 'Upcoming booking',
        description: `${vehicleName} is confirmed with ${ownerName}.`,
        timestamp: rent.start_date,
        route: '/user-dashboard/bookings',
        entityId: rent.rentid,
      });
    }

    if (rent.booking_status === 'cancelled') {
      notifications.push({
        id: `renter-cancel-${rent.rentid}`,
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        description: `${vehicleName} is no longer scheduled with ${ownerName}.`,
        timestamp: rent.end_date,
        route: '/user-dashboard/bookings',
        entityId: rent.rentid,
      });
    }

    if (rent.booking_status === 'accepted' && isWithinWindow(rent.start_date, 2)) {
      notifications.push({
        id: `renter-handover-${rent.rentid}`,
        type: 'vehicle_handover',
        title: 'Vehicle handover soon',
        description: `Collect ${vehicleName} within the next 48 hours.`,
        timestamp: rent.start_date,
        route: '/user-dashboard/bookings',
        entityId: rent.rentid,
      });
    }

    if ((rent.note || '').trim()) {
      notifications.push({
        id: `renter-message-${rent.rentid}`,
        type: 'message',
        title: 'Booking note saved',
        description: `Your note for ${vehicleName} is attached to this booking.`,
        timestamp: rent.start_date,
        route: '/user-dashboard/bookings',
        entityId: rent.rentid,
      });
    }

    return notifications;
  }).sort((a, b) => startOfIso(b.timestamp) - startOfIso(a.timestamp));
}

export function formatNotificationTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = date.getTime() - Date.now();
  const absHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));

  if (absHours < 24) {
    if (diffMs >= 0) {
      return `in ${Math.max(1, absHours)}h`;
    }
    return `${Math.max(1, absHours)}h ago`;
  }

  return date.toLocaleDateString();
}
