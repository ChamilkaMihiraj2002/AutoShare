import { Bell, Lock, Shield, CreditCard, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  beginMyTwoFactorSetup,
  changeMyPassword,
  disableMyTwoFactor,
  enableMyTwoFactor,
  getMyProfile,
} from '../../lib/api';
import { getTwoFactorQrUrl } from '../../lib/twoFactor';

const UserSettings = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    reminders: true,
    promotions: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  const [twoFactorSetup, setTwoFactorSetup] = useState({
    pending: false,
    secret: '',
    otpauth_url: '',
    code: '',
    disablingCode: '',
    disablingPassword: '',
    busy: false,
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await getMyProfile();
        setSecurity({
          twoFactorEnabled: Boolean(profile.two_factor_enabled),
          passwordChangedAt: profile.password_changed_at || null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load security settings');
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

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
      setSecurity((prev) => ({ ...prev, passwordChangedAt: new Date().toISOString() }));
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
        two_factor_code: '',
      });
      setSuccess('Password updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
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
    <div className="space-y-8 max-w-4xl">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

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
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60 space-y-4">
            <div>
              <p className="font-bold text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">
                {security.twoFactorEnabled
                  ? 'Your account now requires a 6-digit authenticator code during email sign-in.'
                  : 'Add an extra layer of security to your account with an authenticator app.'}
              </p>
            </div>

            {!security.twoFactorEnabled && !twoFactorSetup.pending && (
              <button
                onClick={handleBeginTwoFactorSetup}
                disabled={twoFactorSetup.busy}
                className="px-4 py-2 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition disabled:opacity-60"
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
                  <a href={twoFactorSetup.otpauth_url} className="mt-2 inline-block text-[#003049] hover:underline">
                    Open authenticator link
                  </a>
                </div>
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
                <button
                  onClick={handleEnableTwoFactor}
                  disabled={twoFactorSetup.busy}
                  className="px-4 py-2 bg-[#003049] text-white rounded-lg font-bold text-sm hover:bg-[#00253a] transition disabled:opacity-60"
                >
                  {twoFactorSetup.busy ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            )}

            {security.twoFactorEnabled && (
              <div className="space-y-4 border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-500">Disable 2FA only after confirming your current password and authenticator code.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={twoFactorSetup.disablingPassword}
                    onChange={(event) => setTwoFactorSetup((prev) => ({ ...prev, disablingPassword: event.target.value }))}
                    autoComplete="current-password"
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
                  className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition disabled:opacity-60"
                >
                  {twoFactorSetup.busy ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            )}
          </div>

          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/60 space-y-4">
            <div>
              <p className="font-bold text-gray-900">Change Password</p>
              <p className="text-sm text-gray-500">
                {security.passwordChangedAt
                  ? `Last changed ${new Date(security.passwordChangedAt).toLocaleDateString()}`
                  : 'Update your password regularly.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Current password"
                  value={passwordForm.current_password}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
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
                placeholder="New password"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                autoComplete="new-password"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirm_password}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                autoComplete="new-password"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              {security.twoFactorEnabled && (
                <input
                  type="text"
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
              className="px-4 py-2 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-60"
            >
              <Lock size={16} /> {changingPassword ? 'Updating...' : 'Update'}
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
