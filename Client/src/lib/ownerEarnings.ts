import { Calendar, Car, DollarSign, Hourglass } from 'lucide-react';

import type { OwnerEarningsOverview, OwnerEarningsTransaction, RentApi, VehicleApi } from '../types';
import { formatLkr } from './currency';

export function formatOwnerEarningsChange(changePercentage: number): string {
  const rounded = Math.abs(changePercentage).toFixed(Number.isInteger(changePercentage) ? 0 : 1);

  if (changePercentage > 0) {
    return `+${rounded}% from last month`;
  }

  if (changePercentage < 0) {
    return `-${rounded}% from last month`;
  }

  return 'No change from last month';
}

export function getOwnerEarningsChangeTone(changePercentage: number): string {
  if (changePercentage > 0) {
    return 'text-green-400';
  }

  if (changePercentage < 0) {
    return 'text-red-300';
  }

  return 'text-gray-300';
}

export function getOwnerTransactionStatusMeta(status: OwnerEarningsTransaction['booking_status']): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'completed':
      return { label: 'Completed', className: 'text-green-600' };
    case 'accepted':
      return { label: 'Accepted', className: 'text-blue-600' };
    case 'pending':
      return { label: 'Pending', className: 'text-orange-500' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'text-red-500' };
    default:
      return { label: status, className: 'text-gray-500' };
  }
}

export function buildOwnerDashboardStats(
  earnings: OwnerEarningsOverview | null,
  rents: RentApi[],
  vehicles: VehicleApi[],
) {
  const pendingRequests = rents.filter((rent) => rent.booking_status === 'pending').length;
  const activeVehicles = vehicles.filter((vehicle) => vehicle.availability).length;

  return [
    {
      label: 'Total Revenue',
      value: formatLkr(earnings?.summary.all_time.amount ?? 0),
      subtext: formatOwnerEarningsChange(earnings?.summary.change_percentage ?? 0),
      subtextClass:
        (earnings?.summary.change_percentage ?? 0) > 0
          ? 'text-green-600'
          : (earnings?.summary.change_percentage ?? 0) < 0
            ? 'text-red-500'
            : 'text-gray-500',
      icon: DollarSign,
    },
    {
      label: 'Completed Bookings',
      value: String(earnings?.summary.all_time.bookings ?? 0),
      subtext: `${earnings?.summary.this_month.bookings ?? 0} completed this month`,
      subtextClass: 'text-gray-500',
      icon: Calendar,
    },
    {
      label: 'Active Vehicles',
      value: String(activeVehicles),
      subtext: `${vehicles.length} total vehicles`,
      subtextClass: 'text-gray-500',
      icon: Car,
    },
    {
      label: 'Pending Requests',
      value: String(pendingRequests),
      subtext: 'Awaiting owner action',
      subtextClass: pendingRequests > 0 ? 'text-orange-500' : 'text-gray-500',
      icon: Hourglass,
    },
  ];
}
