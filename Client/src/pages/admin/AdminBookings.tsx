import React from 'react';
import { CalendarCheck2, CircleCheck, LoaderCircle, Shield, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminBookings } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import type { AdminBookingItem } from '../../types';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = React.useState<AdminBookingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const loadBookings = async () => {
      try {
        const response = await getAdminBookings();
        setBookings(response.bookings);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load bookings.';
        setError(message);
        if (message.toLowerCase().includes('authorization') || message.toLowerCase().includes('token')) {
          clearAdminAuthToken();
          navigate('/admin/signin', { replace: true });
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadBookings();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-gray-200 bg-white">
        <div className="flex items-center gap-3 text-gray-500">
          <LoaderCircle className="animate-spin" size={20} />
          Loading bookings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="text-xl font-bold">Bookings unavailable</h2>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-orange-500">
          <CalendarCheck2 size={20} />
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">Bookings</p>
        </div>
        <h2 className="mt-3 text-3xl font-bold text-[#003049]">Current and completed rents</h2>
        <p className="mt-2 text-sm text-gray-500">Track booking status, vehicle links, and booking totals.</p>
      </section>

      <section className="grid gap-4">
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <article key={booking.rent_id} className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#003049]">Booking {booking.rent_id}</h3>
                  <p className="mt-1 text-sm text-gray-400">Vehicle: {booking.vehicle_id}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusStyles[booking.booking_status] || 'bg-gray-100 text-gray-600'}`}>
                  {booking.booking_status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2 text-orange-500">
                    <Shield size={16} />
                    <span className="font-semibold">Owner</span>
                  </div>
                  <p className="mt-2 break-all">{booking.owner_uid}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2 text-orange-500">
                    <CircleCheck size={16} />
                    <span className="font-semibold">Renter</span>
                  </div>
                  <p className="mt-2 break-all">{booking.renter_uid}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2 text-orange-500">
                    <CalendarCheck2 size={16} />
                    <span className="font-semibold">Rental Period</span>
                  </div>
                  <p className="mt-2">{booking.start_date || 'N/A'}</p>
                  <p className="text-xs text-gray-400">to {booking.end_date || 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2 text-orange-500">
                    <Tag size={16} />
                    <span className="font-semibold">Booking Total</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-[#003049]">
                    {booking.total_amount != null ? `LKR ${booking.total_amount.toLocaleString()}` : 'Not available'}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
            No bookings found.
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminBookings;
