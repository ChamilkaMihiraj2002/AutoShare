import React from 'react';
import { Calendar, Eye } from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen';
import Modal from '../../components/common/Modal';
import { getMyVehicles, getOwnerRents, getUserPublicProfile } from '../../lib/api';
import { formatLkr } from '../../lib/currency';
import { getProfileDisplayName } from '../../lib/profile';

type BookingRequestRow = {
  id: string;
  renterUid: string;
  renterName: string;
  vehicleName: string;
  dateRange: string;
  amountLabel: string;
  status: 'Upcoming' | 'Completed';
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

  React.useEffect(() => {
    const loadRequests = async () => {
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
          const status: BookingRequestRow['status'] = end > new Date() ? 'Upcoming' : 'Completed';

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

        mapped.sort((a, b) => (a.status === b.status ? 0 : a.status === 'Upcoming' ? -1 : 1));
        setRequests(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load booking requests');
      } finally {
        setLoading(false);
      }
    };

    void loadRequests();
  }, []);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-[#003049]">All Booking Requests</h2>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search requests..."
            className="w-full md:w-64 pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#003049] transition text-sm"
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
            <div key={request.id} className="bg-gray-50 p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold">
                    {request.renterName.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{request.renterName}</h3>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wider ${request.status === 'Upcoming' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{request.vehicleName}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" /> {request.dateRange}</span>
                    <span className="font-bold text-gray-900 text-base">{request.amountLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto">
                <button
                  onClick={() => setSelectedRequest(request)}
                  className="flex-1 md:flex-none px-5 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition"
                >
                  View
                </button>
                <button
                  onClick={() => setSelectedRequest(request)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition"
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={selectedRequest !== null}
        onClose={() => setSelectedRequest(null)}
        title="Booking Request Details"
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

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between">
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
              <div className="flex justify-between">
                <span className="text-gray-500">Insurance</span>
                <span className="font-medium text-gray-900">{selectedRequest.insurancePlan.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
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
