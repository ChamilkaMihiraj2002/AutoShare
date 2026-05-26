import React from 'react';
import { Calendar, CarFront, Eye, MapPinned, Shield, UserRound } from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen';
import Modal from '../../components/common/Modal';
import { acceptOwnerRent, cancelOwnerRent, completeOwnerRent, getMyVehicles, getOwnerRents, getUserPublicProfile } from '../../lib/api';
import { formatLkr } from '../../lib/currency';
import { getProfileDisplayName } from '../../lib/profile';
import type { PricingQuote } from '../../types';

const SERVICE_FEE = 9;
const DELIVERY_FEE = 1500;
const CHILD_SEAT_DAILY_FEE = 500;

const getInsuranceDailyFee = (insurancePlan: string) => {
  if (insurancePlan === 'premium') return 2500;
  if (insurancePlan === 'standard') return 1200;
  return 0;
};

const getStatusBadgeClassName = (status: BookingRequestRow['status']) => {
  if (status === 'Pending') return 'bg-yellow-100 text-yellow-700';
  if (status === 'Accepted') return 'bg-blue-100 text-blue-700';
  if (status === 'Cancelled') return 'bg-red-100 text-red-700';
  return 'bg-green-100 text-green-700';
};

type BookingRequestRow = {
  id: string;
  renterUid: string;
  renterName: string;
  vehicleName: string;
  dateRange: string;
  amountLabel: string;
  status: 'Pending' | 'Accepted' | 'Completed' | 'Cancelled';
  pickupOption: string;
  deliveryAddress: string | null;
  insurancePlan: string;
  childSeatCount: number;
  note: string | null;
  totalDays: number;
  pricingSnapshot: PricingQuote | null;
  vehiclePricingTotal: number;
  insuranceTotal: number;
  deliveryFee: number;
  childSeatTotal: number;
  serviceFee: number;
  grandTotal: number;
};

const BookingRequests = () => {
  const [requests, setRequests] = React.useState<BookingRequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [selectedRequest, setSelectedRequest] = React.useState<BookingRequestRow | null>(null);
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);

  const loadRequests = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [rents, vehicles] = await Promise.all([getOwnerRents(), getMyVehicles()]);
      const renterIds = Array.from(new Set(rents.map((rent) => rent.renter_uid)));
      const renterEntries = await Promise.all(
        renterIds.map(async (uid) => {
          try {
            const profile = await getUserPublicProfile(uid);
            return [uid, getProfileDisplayName(profile.full_name, profile.email)] as const;
          } catch {
            return [uid, uid] as const;
          }
        }),
      );
      const renterNameByUid = new Map(renterEntries);

      const vehicleById = new Map(
        vehicles.map((vehicle) => [
          vehicle.vehicleid,
          {
            name: `${vehicle.brand} ${vehicle.model}`,
            price: vehicle.price,
          },
        ]),
      );

      const mapped = rents.map<BookingRequestRow>((rent) => {
        const vehicleInfo = vehicleById.get(rent.vehicle_id);
        const start = new Date(rent.start_date);
        const end = new Date(rent.end_date);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        const pricingSnapshot = rent.pricing_snapshot ?? null;
        const insurancePlan = rent.insurance_plan || 'basic';
        const childSeatCount = rent.child_seat_count ?? 0;
        const vehiclePricingTotal = pricingSnapshot?.total ?? (vehicleInfo ? vehicleInfo.price * days : 0);
        const insuranceTotal = getInsuranceDailyFee(insurancePlan) * days;
        const deliveryFee = (rent.pickup_option || 'self_pickup') === 'delivery' ? DELIVERY_FEE : 0;
        const childSeatTotal = childSeatCount * CHILD_SEAT_DAILY_FEE * days;
        const grandTotal = vehiclePricingTotal + insuranceTotal + deliveryFee + childSeatTotal + SERVICE_FEE;
        const status: BookingRequestRow['status'] =
          rent.booking_status === 'cancelled'
            ? 'Cancelled'
            : rent.booking_status === 'completed' || end <= new Date()
              ? 'Completed'
              : rent.booking_status === 'accepted'
                ? 'Accepted'
                : 'Pending';

        return {
          id: rent.rentid,
          renterUid: rent.renter_uid,
          renterName: renterNameByUid.get(rent.renter_uid) || rent.renter_uid,
          vehicleName: vehicleInfo?.name || `Vehicle #${rent.vehicle_id}`,
          dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          amountLabel: grandTotal > 0 ? formatLkr(grandTotal) : '-',
          status,
          pickupOption: rent.pickup_option || 'self_pickup',
          deliveryAddress: rent.delivery_address || null,
          insurancePlan,
          childSeatCount,
          note: rent.note || null,
          totalDays: pricingSnapshot?.total_days ?? days,
          pricingSnapshot,
          vehiclePricingTotal,
          insuranceTotal,
          deliveryFee,
          childSeatTotal,
          serviceFee: SERVICE_FEE,
          grandTotal,
        };
      });

      const sortOrder: Record<BookingRequestRow['status'], number> = {
        Pending: 0,
        Accepted: 1,
        Completed: 2,
        Cancelled: 3,
      };
      mapped.sort((a, b) => sortOrder[a.status] - sortOrder[b.status]);
      setRequests(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleAccept = async (request: BookingRequestRow) => {
    if (!request.id) {
      setError('This booking request is missing an ID and cannot be accepted.');
      return;
    }

    setSubmittingId(request.id);
    setError('');
    try {
      await acceptOwnerRent(request.id);
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: 'Accepted',
              }
            : item,
        ),
      );
      setSelectedRequest((current) =>
        current?.id === request.id
          ? {
              ...current,
              status: 'Accepted',
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept booking request');
    } finally {
      setSubmittingId(null);
    }
  };

  const updateRequestStatus = (requestId: string, status: BookingRequestRow['status']) => {
    setRequests((current) =>
      current.map((item) => (item.id === requestId ? { ...item, status } : item)),
    );
    setSelectedRequest((current) => (current?.id === requestId ? { ...current, status } : current));
  };

  const handleStatusAction = async (
    request: BookingRequestRow,
    action: 'cancel' | 'complete',
  ) => {
    if (!request.id) {
      setError('This booking request is missing an ID and cannot be updated.');
      return;
    }

    setSubmittingId(request.id);
    setError('');
    try {
      if (action === 'cancel') {
        await cancelOwnerRent(request.id);
        updateRequestStatus(request.id, 'Cancelled');
      } else {
        await completeOwnerRent(request.id);
        updateRequestStatus(request.id, 'Completed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} booking request`);
    } finally {
      setSubmittingId(null);
    }
  };

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter(
      (request) =>
        request.vehicleName.toLowerCase().includes(query) ||
        request.renterName.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query),
    );
  }, [requests, search]);

  if (loading) {
    return <LoadingScreen message="Loading booking requests..." />;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-bold text-[#003049]">All Booking Requests</h2>
        <div className="relative w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search requests..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-[#003049] md:w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
          No booking requests found.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((request) => (
            <div key={request.id} className="rounded-xl bg-gray-50 p-4 transition hover:shadow-md sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {request.renterName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <h3 className="truncate font-bold text-gray-900">{request.renterName}</h3>
                      <span className={`inline-flex w-fit rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${getStatusBadgeClassName(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{request.vehicleName}</p>
                    <div className="mt-2 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                      <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {request.dateRange}</span>
                      <span className="text-base font-bold text-gray-900">{request.amountLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
                  {request.status === 'Pending' && (
                    <button
                      onClick={() => void handleAccept(request)}
                      disabled={submittingId === request.id}
                      className="flex-1 rounded-lg bg-[#003049] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#002538] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-5"
                    >
                      {submittingId === request.id ? 'Accepting...' : 'Accept'}
                    </button>
                  )}
                  {request.status === 'Accepted' && (
                    <>
                      <button
                        onClick={() => void handleStatusAction(request, 'cancel')}
                        disabled={submittingId === request.id}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-5"
                      >
                        {submittingId === request.id ? 'Updating...' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => void handleStatusAction(request, 'complete')}
                        disabled={submittingId === request.id}
                        className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-5"
                      >
                        {submittingId === request.id ? 'Updating...' : 'Complete'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:flex-none sm:px-5"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        title="Booking Request Details"
        contentClassName="max-w-2xl"
        maxWidthClassName="max-w-5xl"
        bodyClassName="bg-[#f8fafc]"
      >
        {selectedRequest && (
          <div className="space-y-5 text-sm">
            <div className="rounded-[24px] bg-[#003049] px-4 py-4 text-white shadow-lg shadow-[#003049]/20 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold sm:text-xl">{selectedRequest.vehicleName}</h3>
                    <span className={`rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusBadgeClassName(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <p className="text-sm text-white/80">Booking request from {selectedRequest.renterName}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/75 sm:text-sm">
                    <span>#{selectedRequest.id}</span>
                    <span>{selectedRequest.dateRange}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur-sm lg:min-w-[220px]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Grand Total</p>
                  <p className="mt-1 text-2xl font-bold sm:text-3xl">{formatLkr(selectedRequest.grandTotal)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-gray-500">
                  <UserRound size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Renter</span>
                </div>
                <p className="font-semibold text-gray-900">{selectedRequest.renterName}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-gray-500">
                  <CarFront size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Pickup</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {selectedRequest.pickupOption === 'delivery' ? 'Delivery' : 'Self Pickup'}
                </p>
                {selectedRequest.deliveryAddress && (
                  <p className="mt-2 text-xs leading-5 text-gray-500">{selectedRequest.deliveryAddress}</p>
                )}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-gray-500">
                  <Shield size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Insurance</span>
                </div>
                <p className="font-semibold text-gray-900">{selectedRequest.insurancePlan.toUpperCase()}</p>
                <p className="mt-2 text-xs text-gray-500">Child seats: {selectedRequest.childSeatCount}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-gray-500">
                  <Calendar size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Trip</span>
                </div>
                <p className="font-semibold text-gray-900">{selectedRequest.totalDays} day{selectedRequest.totalDays === 1 ? '' : 's'}</p>
                <p className="mt-2 text-xs text-gray-500">{selectedRequest.dateRange}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <section className="rounded-[24px] border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-gray-900">Price Breakdown</h4>
                    <p className="text-xs text-gray-500">Full calculation used for this booking request.</p>
                  </div>
                  <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#92400e]">
                    {formatLkr(selectedRequest.grandTotal)}
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedRequest.pricingSnapshot ? (
                    <>
                      <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                        <span className="text-gray-600">Vehicle subtotal ({selectedRequest.pricingSnapshot.total_days} days)</span>
                        <span className="font-semibold text-gray-900">{formatLkr(selectedRequest.pricingSnapshot.subtotal)}</span>
                      </div>
                      {selectedRequest.pricingSnapshot.duration_discount_amount > 0 && (
                        <div className="flex items-start justify-between gap-4 rounded-2xl bg-green-50 px-4 py-3">
                          <span className="text-green-700">Length-of-trip discount ({selectedRequest.pricingSnapshot.duration_discount_percentage}%)</span>
                          <span className="font-semibold text-green-700">-{formatLkr(selectedRequest.pricingSnapshot.duration_discount_amount)}</span>
                        </div>
                      )}
                      {selectedRequest.pricingSnapshot.distance_fee > 0 && (
                        <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                          <span className="text-gray-600">Distance fee ({selectedRequest.pricingSnapshot.distance_km.toFixed(1)} km)</span>
                          <span className="font-semibold text-gray-900">{formatLkr(selectedRequest.pricingSnapshot.distance_fee)}</span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#003049]/10 bg-[#003049]/[0.03] px-4 py-3">
                        <span className="font-medium text-[#003049]">Vehicle quote total</span>
                        <span className="font-bold text-[#003049]">{formatLkr(selectedRequest.vehiclePricingTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-600">Vehicle rental ({selectedRequest.totalDays} days)</span>
                      <span className="font-semibold text-gray-900">{formatLkr(selectedRequest.vehiclePricingTotal)}</span>
                    </div>
                  )}

                  {selectedRequest.insuranceTotal > 0 && (
                    <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-600">Insurance ({selectedRequest.insurancePlan.toUpperCase()})</span>
                      <span className="font-semibold text-gray-900">{formatLkr(selectedRequest.insuranceTotal)}</span>
                    </div>
                  )}
                  {selectedRequest.deliveryFee > 0 && (
                    <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-600">Delivery fee</span>
                      <span className="font-semibold text-gray-900">{formatLkr(selectedRequest.deliveryFee)}</span>
                    </div>
                  )}
                  {selectedRequest.childSeatTotal > 0 && (
                    <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                      <span className="text-gray-600">Child seats ({selectedRequest.childSeatCount})</span>
                      <span className="font-semibold text-gray-900">{formatLkr(selectedRequest.childSeatTotal)}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
                    <span className="text-gray-600">Service fee</span>
                    <span className="font-semibold text-gray-900">{formatLkr(selectedRequest.serviceFee)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#003049]/10 bg-[#003049] px-4 py-3 text-white">
                    <span className="font-medium">Grand total</span>
                    <span className="font-bold">{formatLkr(selectedRequest.grandTotal)}</span>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="rounded-[24px] border border-gray-200 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPinned size={16} className="text-[#003049]" />
                    <h4 className="text-base font-bold text-gray-900">Trip Details</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-gray-500">Pickup option</span>
                      <span className="font-medium text-gray-900">
                        {selectedRequest.pickupOption === 'delivery' ? 'Delivery' : 'Self Pickup'}
                      </span>
                    </div>
                    {selectedRequest.deliveryAddress && (
                      <div>
                        <p className="text-gray-500">Delivery address</p>
                        <p className="font-medium text-gray-900">{selectedRequest.deliveryAddress}</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-gray-500">Insurance</span>
                      <span className="font-medium text-gray-900">{selectedRequest.insurancePlan.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-gray-500">Child seats</span>
                      <span className="font-medium text-gray-900">{selectedRequest.childSeatCount}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-gray-200 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <MapPinned size={16} className="text-[#003049]" />
                    <h4 className="text-base font-bold text-gray-900">Booking Notes</h4>
                  </div>
                  {selectedRequest.note ? (
                    <p className="rounded-2xl bg-gray-50 px-4 py-3 leading-6 text-gray-700">{selectedRequest.note}</p>
                  ) : (
                    <p className="rounded-2xl bg-gray-50 px-4 py-3 text-gray-500">No extra note from the renter.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BookingRequests;
