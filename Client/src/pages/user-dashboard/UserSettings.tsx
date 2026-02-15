import { Bell, Lock, Shield, CreditCard } from 'lucide-react';
import { useState } from 'react';

const UserSettings = () => {
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        reminders: true,
        promotions: false
    });

    const [security, setSecurity] = useState({
        twoFactor: true
    });

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Notifications */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                    <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                        <p className="text-gray-500 text-sm">Manage how you receive notifications</p>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900">Email Notifications</p>
                            <p className="text-sm text-gray-500">Receive booking confirmations and updates via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.email} onChange={() => setNotifications({ ...notifications, email: !notifications.email })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003049]"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900">SMS Notifications</p>
                            <p className="text-sm text-gray-500">Get text messages for important updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.sms} onChange={() => setNotifications({ ...notifications, sms: !notifications.sms })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003049]"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900">Booking Reminders</p>
                            <p className="text-sm text-gray-500">Receive reminders before your rental starts</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.reminders} onChange={() => setNotifications({ ...notifications, reminders: !notifications.reminders })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003049]"></div>
                        </label>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900">Promotional Emails</p>
                            <p className="text-sm text-gray-500">Get notified about special offers and deals</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={notifications.promotions} onChange={() => setNotifications({ ...notifications, promotions: !notifications.promotions })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003049]"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Security */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-4">
                    <div className="bg-green-50 p-2.5 rounded-xl text-green-600">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Security</h3>
                        <p className="text-gray-500 text-sm">Keep your account secure</p>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900">Two-Factor Authentication</p>
                            <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={security.twoFactor} onChange={() => setSecurity({ ...security, twoFactor: !security.twoFactor })} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003049]"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-bold text-gray-900">Change Password</p>
                            <p className="text-sm text-gray-500">Update your password regularly</p>
                        </div>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center gap-2">
                            <Lock size={16} /> Update
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-bold text-gray-900">Payment Methods</p>
                            <p className="text-sm text-gray-500">Manage your saved payment methods</p>
                        </div>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center gap-2">
                            <CreditCard size={16} /> Manage
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-100 rounded-2xl p-6 bg-red-50/50">
                <h3 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h3>
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-red-100">
                    <div>
                        <p className="font-bold text-gray-900">Delete Account</p>
                        <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                    </div>
                    <button className="px-4 py-2 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition text-sm">
                        Delete
                    </button>
                </div>
            </div>

        </div>
    );
};

export default UserSettings;
