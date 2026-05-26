import React, { useState, useCallback, useEffect } from 'react';
import { BadgeCheck, ExternalLink, FileText, LoaderCircle, ShieldAlert, XCircle, Search, Filter, Copy, Check, Calendar, MapPin, User, Shield, CarFront as CarFrontIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAdminVehicles, updateAdminVehicleVerification } from '../../lib/api';
import { clearAdminAuthToken } from '../../lib/auth';
import { resolveBackendAssetUrl } from '../../lib/profile';
import type { AdminVehicleVerificationItem } from '../../types';

const statusStyles: Record<AdminVehicleVerificationItem['verification_status'], { bg: string, text: string, border: string, dotBg: string }> = {
  not_submitted: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dotBg: 'bg-slate-400' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotBg: 'bg-amber-500' },
  verified: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotBg: 'bg-emerald-500' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dotBg: 'bg-rose-500' },
};

const AdminVehicles = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<AdminVehicleVerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Search, filter, and modal states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for capturing verification note
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVehicleId, setModalVehicleId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<'verified' | 'rejected' | null>(null);
  const [modalNotes, setModalNotes] = useState('');

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getAdminVehicles();
      setVehicles(response.vehicles);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load vehicles.';
      setError(message);
      if (message.toLowerCase().includes('authorization') || message.toLowerCase().includes('token')) {
        clearAdminAuthToken();
        navigate('/admin/signin', { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${type}-${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openActionModal = (vehicleId: string, action: 'verified' | 'rejected') => {
    setModalVehicleId(vehicleId);
    setModalAction(action);
    setModalNotes('');
    setModalOpen(true);
  };

  const submitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVehicleId || !modalAction) return;

    const targetVehicleId = modalVehicleId;
    const targetAction = modalAction;
    const notesInput = modalNotes;

    setProcessingId(targetVehicleId);
    setModalOpen(false);
    try {
      const updated = await updateAdminVehicleVerification(targetVehicleId, { 
        verification_status: targetAction, 
        verification_notes: notesInput 
      });
      setVehicles((prev) => prev.map((vehicle) => (vehicle.vehicle_id === targetVehicleId ? updated : vehicle)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update verification status.');
    } finally {
      setProcessingId(null);
      setModalVehicleId(null);
      setModalAction(null);
    }
  };

  // Filtered vehicles logic
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      `${vehicle.brand} ${vehicle.model}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vehicle.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vehicle.owner_uid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vehicle.vehicle_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' ||
      vehicle.verification_status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle className="animate-spin text-orange-500" size={32} />
          <p className="text-sm font-semibold uppercase tracking-wide">Syncing fleet verifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Mesh Gradient Banner */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#003049] via-[#002235] to-[#0b3c58] p-8 text-white shadow-xl border border-[#082E46]/20">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute right-1/4 -bottom-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
              Verification Desk
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Vehicle Registration Queue</h2>
            <p className="max-w-xl text-xs md:text-sm leading-relaxed text-slate-300">
              Audit ownership logs, license registries, and book details before approving the safety status verified badge.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm animate-in fade-in duration-255">
          {error}
        </div>
      )}

      {/* Filters Control Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by brand, location, Owner UID, Vehicle ID..."
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
            <option value="all">All Verification Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="verified">Verified Badge Granted</option>
            <option value="rejected">Rejected / Denied</option>
            <option value="not_submitted">Not Submitted</option>
          </select>
        </div>
      </section>

      {/* Grid of Vehicles Cards */}
      <div className="grid gap-5">
        {filteredVehicles.length > 0 ? (
          filteredVehicles.map((vehicle) => {
            const style = statusStyles[vehicle.verification_status] || statusStyles.not_submitted;
            const isPendingReview = vehicle.verification_status === 'pending';
            return (
              <article key={vehicle.vehicle_id} className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                
                {/* Header Information and Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center font-bold shadow-inner shrink-0">
                      <CarFrontIcon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug">{vehicle.brand} {vehicle.model}</h3>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{vehicle.year}</span>
                      </div>
                      
                      {/* Copied identifiers */}
                      <button 
                        onClick={() => handleCopyText(vehicle.vehicle_id, 'vehicle')}
                        className="flex items-center gap-1 mt-1.5 text-[11px] font-bold text-slate-400 hover:text-orange-500 transition cursor-pointer"
                        title="Copy Vehicle ID"
                      >
                        <span>ID: {vehicle.vehicle_id.slice(0, 8)}...</span>
                        {copiedId === `vehicle-${vehicle.vehicle_id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dotBg} ${isPendingReview ? 'animate-pulse' : ''}`}></span>
                      {vehicle.verification_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Info Grid Section */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  
                  {/* Owner ID */}
                  <div className="rounded-2xl bg-slate-50/50 border border-slate-100 px-4 py-3 text-xs text-slate-600 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <User size={12} className="text-orange-500" />
                      <span>Owner UID</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="font-semibold text-slate-700 truncate">{vehicle.owner_uid.slice(0, 12)}...</span>
                      <button 
                        onClick={() => handleCopyText(vehicle.owner_uid, 'owner')} 
                        className="text-slate-400 hover:text-orange-500 transition cursor-pointer"
                        title="Copy Owner UID"
                      >
                        {copiedId === `owner-${vehicle.owner_uid}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Registry submission timeline */}
                  <div className="rounded-2xl bg-slate-50/50 border border-slate-100 px-4 py-3 text-xs text-slate-600 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <Calendar size={12} className="text-orange-500" />
                      <span>Timeline submission</span>
                    </div>
                    <div className="mt-2 text-slate-700 font-semibold truncate leading-normal">
                      {vehicle.verification_submitted_at || 'Not submitted yet'}
                    </div>
                  </div>

                  {/* Location info */}
                  <div className="rounded-2xl bg-slate-50/50 border border-slate-100 px-4 py-3 text-xs text-slate-600 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <MapPin size={12} className="text-orange-500" />
                      <span>Vehicle Location</span>
                    </div>
                    <div className="mt-2 text-slate-700 font-semibold truncate leading-normal">
                      {vehicle.location || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Audit remarks notes */}
                {vehicle.verification_notes && (
                  <div className="mt-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 px-4 py-3.5 text-xs text-slate-600 leading-relaxed">
                    <p className="font-bold text-orange-600 uppercase tracking-wider text-[9px] mb-1.5">Review Remarks</p>
                    <p className="font-medium text-slate-600">{vehicle.verification_notes}</p>
                    {vehicle.verification_verified_by && (
                      <p className="mt-1 text-[10px] text-slate-400 font-medium">Reviewed by: {vehicle.verification_verified_by}</p>
                    )}
                  </div>
                )}

                {/* Attachment document links and Action actions */}
                <div className="mt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-t border-slate-100 pt-5">
                  {/* Documents attachments cards */}
                  <div className="grid gap-3 sm:grid-cols-2 flex-1 max-w-lg">
                    <a
                      href={vehicle.vehicle_book_url ? resolveBackendAssetUrl(vehicle.vehicle_book_url, vehicle.vehicle_book_url) : '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition group ${
                        vehicle.vehicle_book_url 
                          ? 'border-slate-200 bg-white text-[#003049] hover:bg-orange-50/30 hover:border-orange-200' 
                          : 'border-slate-100 bg-slate-50/50 text-slate-400 pointer-events-none'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400 group-hover:text-orange-500 transition" />
                        Vehicle Book
                      </span>
                      <ExternalLink size={13} className="text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    </a>

                    <a
                      href={vehicle.vehicle_license_url ? resolveBackendAssetUrl(vehicle.vehicle_license_url, vehicle.vehicle_license_url) : '#'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-bold transition group ${
                        vehicle.vehicle_license_url 
                          ? 'border-slate-200 bg-white text-[#003049] hover:bg-orange-50/30 hover:border-orange-200' 
                          : 'border-slate-100 bg-slate-50/50 text-slate-400 pointer-events-none'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400 group-hover:text-orange-500 transition" />
                        Vehicle License
                      </span>
                      <ExternalLink size={13} className="text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                    </a>
                  </div>

                  {/* Operational approval triggers */}
                  {isPendingReview && (
                    <div className="flex items-center gap-3 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => openActionModal(vehicle.vehicle_id, 'rejected')}
                        disabled={processingId === vehicle.vehicle_id}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-60 cursor-pointer"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => openActionModal(vehicle.vehicle_id, 'verified')}
                        disabled={processingId === vehicle.vehicle_id}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/10 disabled:opacity-60 cursor-pointer"
                      >
                        {processingId === vehicle.vehicle_id ? (
                          <LoaderCircle className="animate-spin" size={14} />
                        ) : (
                          <BadgeCheck size={14} />
                        )}
                        Approve Verified
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
            <ShieldAlert className="mx-auto text-slate-300 mb-3" size={36} />
            <p className="text-sm font-semibold">No vehicles match current search/filter settings.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedStatus('all'); }}
              className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600 underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Custom Dialog notes Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setModalOpen(false)} 
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 z-10">
            <h3 className="text-lg font-extrabold text-[#003049] flex items-center gap-2">
              <Shield size={18} className="text-orange-500" />
              {modalAction === 'verified' ? 'Approve Verification' : 'Reject Verification'}
            </h3>
            <p className="mt-2 text-xs text-slate-500 leading-normal">
              {modalAction === 'verified' 
                ? 'Provide details or notes regarding this approval (optional):' 
                : 'Provide the reason for rejecting this vehicle verification (required):'}
            </p>
            
            <form onSubmit={submitAction} className="mt-4 space-y-4">
              <textarea
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder={modalAction === 'verified' ? 'e.g. Serial book matching matches the register databases.' : 'e.g. Incomplete license photocopy, scan is blurry.'}
                rows={3}
                required={modalAction === 'rejected'}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white transition cursor-pointer ${
                    modalAction === 'verified' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {modalAction === 'verified' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVehicles;
