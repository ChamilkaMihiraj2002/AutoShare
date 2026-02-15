import React, { useState } from 'react';
import { User, Bell, Shield, Save } from 'lucide-react';
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '../../lib/api';
import { DEFAULT_AVATAR, getDisplayNameFromEmail, resolveAvatarUrl } from '../../lib/profile';

const OwnerSettings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        bio: 'Automotive enthusiast and experienced host.'
    });

    const [notifications, setNotifications] = useState({
        email: true,
        sms: true,
        marketing: false
    });

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    React.useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError('');
            try {
                const profile = await getMyProfile();
                setProfileData((prev) => ({
                    ...prev,
                    name: getDisplayNameFromEmail(profile.email),
                    email: profile.email,
                    phone: profile.phone,
                    address: profile.address,
                }));
                setAvatarSrc(resolveAvatarUrl(profile.avatar_url));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        void loadProfile();
    }, []);

    const handleSaveProfile = async () => {
        setError('');
        try {
            const updated = await updateMyProfile({
                phone: profileData.phone,
                address: profileData.address,
            });
            setProfileData((prev) => ({
                ...prev,
                email: updated.email,
                phone: updated.phone,
                address: updated.address,
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save profile');
        }
    };

    const handlePickAvatar = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        setError('');
        try {
            const updated = await uploadMyAvatar(file);
            setAvatarSrc(resolveAvatarUrl(updated.avatar_url));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
            event.target.value = '';
        }
    };

    const handleNotificationChange = (key: keyof typeof notifications) => {
        setNotifications({ ...notifications, [key]: !notifications[key] });
    };

    if (loading) {
        return <div className="text-gray-500">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#003049]">Settings</h2>
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-[#003049] border-b-2 border-[#003049]' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <User size={18} /> Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'text-[#003049] border-b-2 border-[#003049]' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Bell size={18} /> Notifications
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'security' ? 'text-[#003049] border-b-2 border-[#003049]' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <Shield size={18} /> Security
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'profile' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="flex items-center gap-4 mb-6">
                                <img src={avatarSrc} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                                <button
                                    type="button"
                                    onClick={handlePickAvatar}
                                    disabled={uploadingPhoto}
                                    className="text-sm font-medium text-[#003049] border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profileData.name}
                                        onChange={handleProfileChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profileData.email}
                                        onChange={handleProfileChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleProfileChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={profileData.address}
                                        onChange={handleProfileChange}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <textarea
                                    name="bio"
                                    value={profileData.bio}
                                    onChange={handleProfileChange}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                className="flex items-center gap-2 bg-[#003049] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#003049]/90 transition"
                            >
                                <Save size={18} /> Save Changes
                            </button>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="max-w-2xl space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                                    <div>
                                        <p className="font-medium text-gray-900">Email Notifications</p>
                                        <p className="text-sm text-gray-500">Receive booking updates and receipts via email</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.email}
                                            onChange={() => handleNotificationChange('email')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                                    <div>
                                        <p className="font-medium text-gray-900">SMS Notifications</p>
                                        <p className="text-sm text-gray-500">Receive instant alerts for new messages</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.sms}
                                            onChange={() => handleNotificationChange('sms')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                                    <div>
                                        <p className="font-medium text-gray-900">Marketing Communications</p>
                                        <p className="text-sm text-gray-500">Receive tips, promotions, and news</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notifications.marketing}
                                            onChange={() => handleNotificationChange('marketing')}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="max-w-2xl space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Login & Security</h3>

                            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-900">Password</p>
                                        <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                                    </div>
                                    <button className="text-sm font-medium text-[#003049] hover:underline">
                                        Update
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={false}
                                            onChange={() => { }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OwnerSettings;
