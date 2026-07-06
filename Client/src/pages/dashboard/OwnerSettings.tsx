import React, { useState } from 'react';
import { User, Bell, Shield, Save, Eye, EyeOff } from 'lucide-react';
import {
  beginMyTwoFactorSetup,
  changeMyPassword,
  disableMyTwoFactor,
  enableMyTwoFactor,
  getMyProfile,
  uploadMyAvatar,
  updateMyProfile,
} from '../../lib/api';
import { DEFAULT_AVATAR, getDisplayNameFromEmail, resolveAvatarUrl } from '../../lib/profile';
import { getTwoFactorQrUrl } from '../../lib/twoFactor';

const OwnerSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarSrc, setAvatarSrc] = useState(DEFAULT_AVATAR);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    bio: 'Automotive enthusiast and experienced host.',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    marketing: false,
  });
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    passwordChangedAt: '' as string | null,
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    two_factor_code: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(true);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    pending: boolean;
    secret: string;
    otpauth_url: string;
    code: string;
    disablingCode: string;
    disablingPassword: string;
    busy: boolean;
  }>({
    pending: false,
    secret: '',
    otpauth_url: '',
    code: '',
    disablingCode: '',
    disablingPassword: '',
    busy: false,
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
          name: profile.full_name || getDisplayNameFromEmail(profile.email),
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          city: profile.city || '',
          postal_code: profile.postal_code || '',
        }));
        setSecurity({
          twoFactorEnabled: Boolean(profile.two_factor_enabled),
          passwordChangedAt: profile.password_changed_at || null,
        });
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
    setSuccess('');
    try {
      const updated = await updateMyProfile({
        full_name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        postal_code: profileData.postal_code,
      });
      setProfileData((prev) => ({
        ...prev,
        name: updated.full_name || prev.name,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
        city: updated.city || '',
        postal_code: updated.postal_code || '',
      }));
      setSuccess('Profile updated successfully.');
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
    setSuccess('');
    try {
      const updated = await uploadMyAvatar(file);
      setAvatarSrc(resolveAvatarUrl(updated.avatar_url));
      setSuccess('Profile photo updated.');
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

  const handlePasswordFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setError('Please fill in all password fields.');
      setSuccess('');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('New password and confirmation do not match.');
      setSuccess('');
      return;
    }

    setChangingPassword(true);
    setError('');
    setSuccess('');
    try {
      await changeMyPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        two_factor_code: passwordForm.two_factor_code || undefined,
      });
      setSecurity((prev) => ({
        ...prev,
        passwordChangedAt: new Date().toISOString(),
      }));
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
        two_factor_code: '',
      });
      setSuccess('Password updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleBeginTwoFactorSetup = async () => {
    setError('');
    setSuccess('');
    setTwoFactorSetup((prev) => ({ ...prev, busy: true }));
    try {
      const response = await beginMyTwoFactorSetup();
      setTwoFactorSetup({
        pending: true,
        secret: response.secret,
        otpauth_url: response.otpauth_url,
        code: '',
        disablingCode: '',
        disablingPassword: '',
        busy: false,
      });
    } catch (err) {
      setTwoFactorSetup((prev) => ({ ...prev, busy: false }));
      setError(err instanceof Error ? err.message : 'Failed to start two-factor setup');
    }
  };

  const handleEnableTwoFactor = async () => {
    setError('');
    setSuccess('');
    setTwoFactorSetup((prev) => ({ ...prev, busy: true }));
    try {
      const status = await enableMyTwoFactor(twoFactorSetup.code);
      setSecurity((prev) => ({ ...prev, twoFactorEnabled: status.enabled }));
      setTwoFactorSetup({
        pending: false,
        secret: '',
        otpauth_url: '',
        code: '',
        disablingCode: '',
        disablingPassword: '',
        busy: false,
      });
      setSuccess('Two-factor authentication is now enabled.');
    } catch (err) {
      setTwoFactorSetup((prev) => ({ ...prev, busy: false }));
      setError(err instanceof Error ? err.message : 'Failed to enable two-factor authentication');
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!twoFactorSetup.disablingPassword || !twoFactorSetup.disablingCode) {
      setError('Please enter your current password and 2FA code.');
      setSuccess('');
      return;
    }

    setError('');
    setSuccess('');
    setTwoFactorSetup((prev) => ({ ...prev, busy: true }));
    try {
      const status = await disableMyTwoFactor({
        current_password: twoFactorSetup.disablingPassword,
        code: twoFactorSetup.disablingCode,
      });
      setSecurity((prev) => ({ ...prev, twoFactorEnabled: status.enabled }));
      setTwoFactorSetup({
        pending: false,
        secret: '',
        otpauth_url: '',
        code: '',
        disablingCode: '',
        disablingPassword: '',
        busy: false,
      });
      setSuccess('Two-factor authentication has been disabled.');
    } catch (err) {
      setTwoFactorSetup((prev) => ({ ...prev, busy: false }));
      setError(err instanceof Error ? err.message : 'Failed to disable two-factor authentication');
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#003049]">Settings</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

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
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 outline-none"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={profileData.city}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={profileData.postal_code}
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
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Password</p>
                    <p className="text-sm text-gray-500">
                      {security.passwordChangedAt
                        ? `Last changed ${new Date(security.passwordChangedAt).toLocaleDateString()}`
                        : 'Set a strong password and rotate it regularly.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="current_password"
                      placeholder="Current password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordFieldChange}
                      autoComplete="current-password"
                      required
                      className="w-full px-4 py-2 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <input
                    type="password"
                    name="new_password"
                    placeholder="New password"
                    value={passwordForm.new_password}
                    onChange={handlePasswordFieldChange}
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                  <input
                    type="password"
                    name="confirm_password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirm_password}
                    onChange={handlePasswordFieldChange}
                    autoComplete="new-password"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                  {security.twoFactorEnabled && (
                    <input
                      type="text"
                      name="two_factor_code"
                      inputMode="numeric"
                      placeholder="2FA code"
                      value={passwordForm.two_factor_code}
                      onChange={(event) => setPasswordForm((prev) => ({
                        ...prev,
                        two_factor_code: event.target.value.replace(/\D/g, '').slice(0, 6),
                      }))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                  )}
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="inline-flex items-center gap-2 bg-[#003049] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#003049]/90 transition disabled:opacity-60"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>

              <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/50 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500">
                      {security.twoFactorEnabled
                        ? 'Your account now requires a 6-digit authenticator code during email sign-in.'
                        : 'Protect your account with an authenticator app code during email sign-in.'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${security.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {!security.twoFactorEnabled && !twoFactorSetup.pending && (
                  <button
                    onClick={handleBeginTwoFactorSetup}
                    disabled={twoFactorSetup.busy}
                    className="inline-flex items-center gap-2 border border-gray-200 px-5 py-2 rounded-lg font-medium text-[#003049] hover:bg-white transition disabled:opacity-60"
                  >
                    {twoFactorSetup.busy ? 'Preparing...' : 'Set Up 2FA'}
                  </button>
                )}

                {!security.twoFactorEnabled && twoFactorSetup.pending && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700">
                      <p className="font-medium text-gray-900">Step 1</p>
                      <p>Scan this QR code with Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app.</p>
                      <div className="mt-4 flex justify-center">
                        <img
                          src={getTwoFactorQrUrl(twoFactorSetup.otpauth_url)}
                          alt="Two-factor authentication QR code"
                          className="h-52 w-52 rounded-xl border border-orange-200 bg-white p-3"
                        />
                      </div>
                      <p className="mt-4">If scanning is unavailable, add this secret manually.</p>
                      <p className="mt-2 font-mono break-all text-[#003049]">{twoFactorSetup.secret}</p>
                      <a
                        href={twoFactorSetup.otpauth_url}
                        className="mt-2 inline-block text-[#003049] hover:underline"
                      >
                        Open authenticator link
                      </a>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Step 2</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        value={twoFactorSetup.code}
                        onChange={(event) => setTwoFactorSetup((prev) => ({
                          ...prev,
                          code: event.target.value.replace(/\D/g, '').slice(0, 6),
                        }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <button
                      onClick={handleEnableTwoFactor}
                      disabled={twoFactorSetup.busy}
                      className="inline-flex items-center gap-2 bg-[#003049] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#003049]/90 transition disabled:opacity-60"
                    >
                      {twoFactorSetup.busy ? 'Verifying...' : 'Enable 2FA'}
                    </button>
                  </div>
                )}

                {security.twoFactorEnabled && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-500">Disable 2FA only after confirming your password and a current authenticator code.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="password"
                        placeholder="Current password"
                        value={twoFactorSetup.disablingPassword}
                        onChange={(event) => setTwoFactorSetup((prev) => ({ ...prev, disablingPassword: event.target.value }))}
                        autoComplete="current-password"
                        required
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="6-digit code"
                        value={twoFactorSetup.disablingCode}
                        onChange={(event) => setTwoFactorSetup((prev) => ({
                          ...prev,
                          disablingCode: event.target.value.replace(/\D/g, '').slice(0, 6),
                        }))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <button
                      onClick={handleDisableTwoFactor}
                      disabled={twoFactorSetup.busy}
                      className="inline-flex items-center gap-2 border border-red-200 text-red-600 px-5 py-2 rounded-lg font-medium hover:bg-red-50 transition disabled:opacity-60"
                    >
                      {twoFactorSetup.busy ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerSettings;
