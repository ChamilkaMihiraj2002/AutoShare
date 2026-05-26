import React from 'react';
import { Calendar, Eye } from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen';
import Modal from '../../components/common/Modal';
import { acceptOwnerRent, cancelOwnerRent, completeOwnerRent, getMyVehicles, getOwnerRents, getUserPublicProfile } from '../../lib/api';
import { formatLkr } from '../../lib/currency';
import { getProfileDisplayName } from '../../lib/profile';

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
        const amount = vehicleInfo ? vehicleInfo.price * days : 0;
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
          amountLabel: amount > 0 ? formatLkr(amount) : '-',
          status,
          pickupOption: rent.pickup_option || 'self_pickup',
          deliveryAddress: rent.delivery_address || null,
          insurancePlan: rent.insurance_plan || 'basic',
          childSeatCount: rent.child_seat_count ?? 0,
          note: rent.note || null,
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
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {request.renterName.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <h3 className="truncate font-bold text-gray-900">{request.renterName}</h3>
                      <span
                        className={`inline-flex w-fit rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          request.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : request.status === 'Accepted'
                              ? 'bg-blue-100 text-blue-700'
                              : request.status === 'Cancelled'
                                ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
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
      >
        {selectedRequest && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500">Renter</p>
                <p className="font-semibold text-gray-900">{selectedRequest.renterName}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-semibold text-gray-900">{selectedRequest.status}</p>
              </div>
              <div>
                <p className="text-gray-500">Vehicle</p>
                <p className="font-semibold text-gray-900">{selectedRequest.vehicleName}</p>
              </div>
              <div>
                <p className="text-gray-500">Total</p>
                <p className="font-semibold text-gray-900">{selectedRequest.amountLabel}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Dates</p>
                <p className="font-semibold text-gray-900">{selectedRequest.dateRange}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-4">
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
              {selectedRequest.note && (
                <div>
                  <p className="text-gray-500">Note</p>
                  <p className="font-medium text-gray-900">{selectedRequest.note}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BookingRequests;
