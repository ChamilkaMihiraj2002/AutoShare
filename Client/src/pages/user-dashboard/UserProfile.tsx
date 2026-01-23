import { userProfile } from '../../data/mockData';
import { Shield, CheckCircle, Edit2, Mail, Phone, MapPin, User } from 'lucide-react';

const UserProfile = () => {
    return (
        <div className="space-y-8">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <img
                            src={userProfile.avatar}
                            alt={userProfile.name}
                            className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 text-gray-400"
                        />
                        {userProfile.isVerified && (
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
                                <Shield size={16} fill="currentColor" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{userProfile.name}</h2>
                        <p className="text-gray-500 mt-1">Member since {userProfile.memberSince}</p>
                        {userProfile.isVerified && (
                            <div className="flex items-center gap-1.5 mt-3 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold w-fit">
                                <CheckCircle size={14} />
                                Verified Driver
                            </div>
                        )}
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-[#003049] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#002538] transition shadow-lg shadow-[#003049]/20">
                    <Edit2 size={16} />
                    Edit Profile
                </button>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Full Name</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <User size={20} className="text-gray-400" />
                            {userProfile.name}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Email Address</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <Mail size={20} className="text-gray-400" />
                            {userProfile.email}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Phone Number</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <Phone size={20} className="text-gray-400" />
                            {userProfile.phone}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-500">Location</label>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl text-gray-900 font-medium">
                            <MapPin size={20} className="text-gray-400" />
                            {userProfile.location}
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Account Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">{userProfile.stats.totalRentals}</div>
                        <div className="text-sm font-medium text-gray-500">Total Rentals</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">{userProfile.stats.savedVehicles}</div>
                        <div className="text-sm font-medium text-gray-500">Saved Vehicles</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">{userProfile.stats.renterRating}</div>
                        <div className="text-sm font-medium text-gray-500">Renter Rating</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="text-3xl font-extrabold text-[#003049] mb-1">{userProfile.stats.monthsActive}</div>
                        <div className="text-sm font-medium text-gray-500">Months Active</div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default UserProfile;
