import React, { useState } from 'react';
import { CalendarCheck2, CircleCheck, LoaderCircle, Shield, Tag, Search, Filter, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminBookings } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import type { AdminBookingItem } from '../../types';

const statusStyles: Record<string, { bg: string, text: string, border: string, dotBg: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotBg: 'bg-amber-500' },
  accepted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dotBg: 'bg-blue-500' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotBg: 'bg-emerald-500' },
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dotBg: 'bg-rose-500' },
};

const AdminBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${type}-${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter bookings logic
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      (booking.rent_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.vehicle_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.renter_uid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.owner_uid || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' ||
      booking.booking_status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin text-orange-500" size={32} />
          <p className="text-sm font-semibold tracking-wide uppercase">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm animate-in fade-in duration-300">
        <h2 className="text-lg font-bold">Bookings unavailable</h2>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title Header Card */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 rounded-full translate-x-12 -translate-y-12 blur-2xl"></div>
        <div className="flex items-center gap-2.5 text-orange-500">
          <CalendarCheck2 size={20} className="transform scale-110" />
          <p className="text-xs font-bold uppercase tracking-wider">Fleet Records</p>
        </div>
        <h2 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#003049] tracking-tight">Rental Bookings</h2>
        <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Monitor request statuses, rental durations, client handovers, and total transaction amounts generated on the platform.
        </p>
      </section>

      {/* Search and Filters Control Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Rent ID, Vehicle ID, Renter, Owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative flex items-center gap-2 min-w-[200px]">
          <Filter className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-8 text-sm text-slate-700 outline-none transition appearance-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </section>

      {/* Bookings List Layout */}
      <section className="grid gap-5">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => (
            <article key={booking.rent_id} className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              {/* Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center font-bold shadow-inner">
                    <CalendarCheck2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">Booking ID: {booking.rent_id.slice(0, 12)}...</h3>
                      <button 
                        onClick={() => handleCopyText(booking.rent_id, 'rent')}
                        className="text-slate-400 hover:text-orange-500 transition cursor-pointer"
                        title="Copy Rent ID"
                      >
                        {copiedId === `rent-${booking.rent_id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                      Vehicle ID: <span className="text-slate-600 font-bold">{booking.vehicle_id}</span>
                      <button 
                        onClick={() => handleCopyText(booking.vehicle_id, 'vehicle')} 
                        className="hover:text-orange-500 transition cursor-pointer"
                        title="Copy Vehicle ID"
                      >
                        {copiedId === `vehicle-${booking.vehicle_id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      </button>
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider border ${
                    statusStyles[booking.booking_status] 
                      ? `${statusStyles[booking.booking_status].bg} ${statusStyles[booking.booking_status].text} ${statusStyles[booking.booking_status].border}`
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      statusStyles[booking.booking_status] ? statusStyles[booking.booking_status].dotBg : 'bg-slate-400'
                    } ${booking.booking_status === 'pending' || booking.booking_status === 'accepted' ? 'animate-pulse' : ''}`}></span>
                    {booking.booking_status}
                  </span>
                </div>
              </div>

              {/* Grid content metadata details */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Owner details info */}
                <div className="rounded-2xl bg-slate-50/50 border border-slate-100 px-4 py-3 text-xs text-slate-600 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <Shield size={12} className="text-orange-500" />
                    <span>Vehicle Owner</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="font-semibold text-slate-700 truncate">{booking.owner_uid.slice(0, 10)}...</span>
                    <button 
                      onClick={() => handleCopyText(booking.owner_uid, 'owner')} 
                      className="text-slate-400 hover:text-orange-500 transition cursor-pointer"
                      title="Copy Owner UID"
                    >
                      {copiedId === `owner-${booking.owner_uid}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Renter details info */}
                <div className="rounded-2xl bg-slate-50/50 border border-slate-100 px-4 py-3 text-xs text-slate-600 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <CircleCheck size={12} className="text-orange-500" />
                    <span>Renter Client</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="font-semibold text-slate-700 truncate">{booking.renter_uid.slice(0, 10)}...</span>
                    <button 
                      onClick={() => handleCopyText(booking.renter_uid, 'renter')} 
                      className="text-slate-400 hover:text-orange-500 transition cursor-pointer"
                      title="Copy Renter UID"
                    >
                      {copiedId === `renter-${booking.renter_uid}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* Time range info */}
                <div className="rounded-2xl bg-slate-50/50 border border-slate-100 px-4 py-3 text-xs text-slate-600 flex flex-col justify-between">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Rental Period</span>
                  <div className="mt-2.5 space-y-0.5">
                    <p className="font-bold text-slate-700 text-xs">{booking.start_date || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">to {booking.end_date || 'N/A'}</p>
                  </div>
                </div>

                {/* Total amount invoice styling */}
                <div className="rounded-2xl bg-[#003049]/5 border border-[#003049]/10 px-4 py-3 text-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <Tag size={12} className="text-orange-500" />
                    <span>Booking Total</span>
                  </div>
                  <p className="mt-2.5 text-base font-extrabold text-[#003049] tracking-tight">
                    {booking.total_amount != null ? `LKR ${booking.total_amount.toLocaleString()}` : 'Not available'}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
            <CalendarCheck2 size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold">No bookings found matching current search/filter settings.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedStatus('all'); }}
              className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600 underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminBookings;

