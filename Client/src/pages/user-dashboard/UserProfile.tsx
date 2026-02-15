import { Shield, CheckCircle, Edit2, Mail, Phone, MapPin, User } from 'lucide-react';
import React from 'react';
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '../../lib/api';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import LoadingScreen from '../../components/common/LoadingScreen';
import { getProfileDisplayName, getRoleLabel, resolveAvatarUrl } from '../../lib/profile';
import type { UserProfile as UserProfileType } from '../../types';

const UserProfile = () => {
    const [profile, setProfile] = React.useState<UserProfileType | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [isEditing, setIsEditing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [form, setForm] = React.useState({
        full_name: '',
        phone: '',
        address: '',
        nic: '',
    });
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const result = await getMyProfile();
                setProfile(result);
                setForm({
                    full_name: result.full_name || '',
                    phone: result.phone,
                    address: result.address,
                    nic: result.nic,
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        void loadProfile();
    }, []);

    if (loading) {
        return <LoadingScreen message="Loading profile..." />;
    }

    if (error || !profile) {
        return <div className="text-red-600">{error || 'Profile not found'}</div>;
    }

    const name = getProfileDisplayName(profile.full_name, profile.email);
    const roleLabel = getRoleLabel(profile.role);
    const avatarSrc = resolveAvatarUrl(profile.avatar_url);

    const handlePickFile = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setError('');
        try {
            const updatedProfile = await uploadMyAvatar(file);
            setProfile(updatedProfile);
            setForm({
                full_name: updatedProfile.full_name || '',
                phone: updatedProfile.phone,
                address: updatedProfile.address,
                nic: updatedProfile.nic,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload profile image');
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditStart = () => {
        if (!profile) return;
        setError('');
        setForm({
            full_name: profile.full_name || '',
            phone: profile.phone,
            address: profile.address,
            nic: profile.nic,
        });
        setIsEditing(true);
    };

    const handleEditCancel = () => {
        if (!profile) return;
        setForm({
            full_name: profile.full_name || '',
            phone: profile.phone,
            address: profile.address,
            nic: profile.nic,
        });
        setIsEditing(false);
        setError('');
    };

    const handleSaveProfile = async () => {
        if (!profile) return;

        const payload = {
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            nic: form.nic.trim(),
        };

        if (!payload.phone || !payload.address || !payload.nic) {
            setError('Phone, address, and NIC are required.');
            return;
        }

        const hasChanges =
            payload.full_name !== (profile.full_name || '') ||
            payload.phone !== profile.phone ||
            payload.address !== profile.address ||
            payload.nic !== profile.nic;

        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        setSaving(true);
        setError('');
        try {
            const updated = await updateMyProfile(payload);
            setProfile(updated);
            setForm({
                full_name: updated.full_name || '',
                phone: updated.phone,
                address: updated.address,
                nic: updated.nic,
            });
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 relative">
            <LoadingOverlay show={uploading || saving} message={uploading ? 'Uploading profile photo...' : 'Saving profile...'} />
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <img
                            src={avatarSrc}
                            alt={name}
                            className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 text-gray-400"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
                            <Shield size={16} fill="currentColor" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
                        <p className="text-gray-500 mt-1">Member role: {roleLabel}</p>
                        <div className="flex items-center gap-1.5 mt-3 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold w-fit">
                            <CheckCircle size={14} />
                            Verified Driver
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handlePickFile}
                    disabled={uploading || saving}
                    className="flex items-center gap-2 bg-[#003049] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#002538] transition shadow-lg shadow-[#003049]/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Edit2 size={16} />
                    <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                />
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Contact Information</h3>
                    {!isEditing ? (
                        <button
                            type="button"
                            onClick={handleEditStart}
                            disabled={saving || uploading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                            <Edit2 size={14} />
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleEditCancel}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-[#003049] text-white text-sm font-bold hover:bg-[#002538] disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Full Name</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <User size={20} className="text-gray-400" />
                            {isEditing ? (
                                <input
                                    name="full_name"
                                    value={form.full_name}
                                    onChange={handleChange}
                                    className="w-full bg-transparent outline-none"
                                    disabled={saving}
                                />
                            ) : (
                                <span>{name}</span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Email Address</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <Mail size={20} className="text-gray-400" />
                            {profile.email}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Phone Number</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <Phone size={20} className="text-gray-400" />
                            {isEditing ? (
                                <input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    className="w-full bg-transparent outline-none"
                                    disabled={saving}
                                />
                            ) : (
                                profile.phone
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Location</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <MapPin size={20} className="text-gray-400" />
                            {isEditing ? (
                                <input
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    className="w-full bg-transparent outline-none"
                                    disabled={saving}
                                />
                            ) : (
                                profile.address
                            )}
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-gray-500">NIC</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <Shield size={20} className="text-gray-400" />
                            {isEditing ? (
                                <input
                                    name="nic"
                                    value={form.nic}
                                    onChange={handleChange}
                                    className="w-full bg-transparent outline-none"
                                    disabled={saving}
                                />
                            ) : (
                                profile.nic
                            )}
                        </div>
                    </div>
                </div>
                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            </div>

            {/* Statistics */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Account Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">-</div>
                        <div className="text-sm font-medium text-gray-500">Total Rentals</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">-</div>
                        <div className="text-sm font-medium text-gray-500">Saved Vehicles</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">-</div>
                        <div className="text-sm font-medium text-gray-500">Renter Rating</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">-</div>
                        <div className="text-sm font-medium text-gray-500">Months Active</div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default UserProfile;
