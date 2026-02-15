import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Calendar, Star, Shield, CheckCircle, Edit2 } from 'lucide-react';
import EditProfileModal from '../../components/dashboard/EditProfileModal';
import { getMyProfile, getMyVehicles, updateMyProfile, uploadMyAvatar } from '../../lib/api';
import { getDisplayNameFromEmail, getRoleLabel, resolveAvatarUrl } from '../../lib/profile';

type ProfileViewModel = {
    name: string;
    email: string;
    phone: string;
    location: string;
    joinedDate: string;
    role: string;
    avatar: string;
};

const OwnerProfile = () => {
    const [user, setUser] = useState<ProfileViewModel | null>(null);
    const [vehicleCount, setVehicleCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const [profile, vehicles] = await Promise.all([getMyProfile(), getMyVehicles()]);
                setUser({
                    name: getDisplayNameFromEmail(profile.email),
                    email: profile.email,
                    phone: profile.phone,
                    location: profile.address,
                    joinedDate: 'Recently',
                    role: getRoleLabel(profile.role),
                    avatar: resolveAvatarUrl(profile.avatar_url),
                });
                setVehicleCount(vehicles.length);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        void loadProfile();
    }, []);

    const handleSaveProfile = async (updatedData: ProfileViewModel) => {
        try {
            const profile = await updateMyProfile({
                address: updatedData.location,
                phone: updatedData.phone,
            });
            setUser({
                name: getDisplayNameFromEmail(profile.email),
                email: profile.email,
                phone: profile.phone,
                location: profile.address,
                joinedDate: 'Recently',
                role: getRoleLabel(profile.role),
                avatar: resolveAvatarUrl(profile.avatar_url),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
            return;
        }
    };

    const handlePickAvatar = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        setUploadingAvatar(true);
        setError('');
        try {
            const updated = await uploadMyAvatar(file);
            setUser({
                ...user,
                avatar: resolveAvatarUrl(updated.avatar_url),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload profile image');
        } finally {
            setUploadingAvatar(false);
            event.target.value = '';
        }
    };

    if (loading) {
        return <div className="text-gray-500">Loading profile...</div>;
    }

    if (error || !user) {
        return <div className="text-red-600">{error || 'Profile not found'}</div>;
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 bg-gray-100"
                        />
                        <button
                            type="button"
                            onClick={handlePickAvatar}
                            disabled={uploadingAvatar}
                            className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-white border border-gray-200 rounded-full font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {uploadingAvatar ? 'Uploading...' : 'Change'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-[#003049] text-white p-1.5 rounded-full border-4 border-white">
                            <Shield size={16} fill="currentColor" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-500">{user.role}</span>
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1 text-green-600 font-bold text-sm bg-green-50 px-2.5 py-0.5 rounded-full">
                                <CheckCircle size={14} /> Verified ID
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition"
                >
                    <Edit2 size={16} />
                    Edit Profile
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Contact & Info */}
                <div className="md:col-span-1 space-y-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Info</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <span className="text-sm font-medium">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                                    <Phone size={18} />
                                </div>
                                <span className="text-sm font-medium">{user.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                                    <MapPin size={18} />
                                </div>
                                <span className="text-sm font-medium">{user.location}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                                    <Calendar size={18} />
                                </div>
                                <span className="text-sm font-medium">Joined {user.joinedDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#003049] rounded-2xl p-6 text-white shadow-lg shadow-[#003049]/20">
                        <h3 className="text-lg font-bold mb-2">Superhost Status</h3>
                        <p className="text-blue-100 text-sm mb-4">You are on track to becoming a Superhost! Keep up the great work.</p>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-[85%] rounded-full"></div>
                            </div>
                            <span className="font-bold text-sm">85%</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Stats & Activity */}
                <div className="md:col-span-2 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                            <div className="text-2xl font-extrabold text-[#003049] mb-1">{vehicleCount}</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Vehicles</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                            <div className="text-2xl font-extrabold text-[#003049] mb-1">73</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Bookings</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                            <div className="text-2xl font-extrabold text-[#003049] mb-1 flex items-center justify-center gap-1">
                                4.9 <Star size={16} className="text-orange-500 fill-orange-500" />
                            </div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Rating</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                            <div className="text-2xl font-extrabold text-[#003049] mb-1">$8.8k</div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Earnings</div>
                        </div>
                    </div>

                    {/* Reviews / content placeholder */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center py-16">
                        <div className="inline-flex items-center justify-center p-4 bg-gray-50 rounded-full text-gray-400 mb-4">
                            <Shield size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Identity Verification</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2 mb-6">Your identity has been verified. You can now list unlimited vehicles and access premium features.</p>
                        <button className="text-[#003049] font-bold text-sm hover:underline">View Verification Details</button>
                    </div>
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                currentUser={user}
                onSave={handleSaveProfile}
            />
        </div>
    );
};

export default OwnerProfile;
