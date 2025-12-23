import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User, Mail, Phone, Globe, Clock, Save, AlertTriangle,
  Camera, Shield, Key, Monitor,
  Smartphone, BellRing, QrCode,
  CheckCircle, Link2, Unlink, Check, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import Avatar from '@/components/ui/Avatar';
import StyledSelect from '@/components/ui/StyledSelect';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import PasswordStrength from '@/components/ui/PasswordStrength';
import { useUserProfileQuery, useUpdateUserProfileMutation } from '../api-user';
import { useAuthStore } from '@/stores/auth';
import apiClient, { uploadFile } from '@/lib/apiClient';
import {
  useAuthSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllOtherSessionsMutation,
  useChangePasswordMutation,
  useResendVerificationMutation,
} from '@/features/auth/api';
import EmailConnectionModal from '../components/EmailConnectionModal';

// Helper function to parse user agent string into readable device name
const parseUserAgent = (ua) => {
  if (!ua) return 'Unknown Device';

  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return os ? `${browser} on ${os}` : browser;
};

// Helper function to format last active timestamp
const formatLastActive = (timestamp) => {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const Profile = () => {
  const { data: profile, isLoading, error } = useUserProfileQuery();
  const updateProfile = useUpdateUserProfileMutation();
  const user = useAuthStore((state) => state.user);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    timezone: '',
    language: 'en',
  });

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailPayments: true,
    emailVaccinations: true,
    smsAlerts: true,
    pushUrgent: true,
    frequency: 'real-time',
  });

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  // Password management
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const changePassword = useChangePasswordMutation();

  // Email connection
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Personalization settings
  const [personalization, setPersonalization] = useState({
    dashboardLayout: 'comfortable',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    numberFormat: 'us',
  });

  // Active sessions
  const { data: activeSessionsData, isLoading: isLoadingSessions } = useAuthSessionsQuery();
  const activeSessions = Array.isArray(activeSessionsData) ? activeSessionsData : [];
  const revokeSession = useRevokeSessionMutation();
  const revokeAllOtherSessions = useRevokeAllOtherSessionsMutation();
  const resendVerification = useResendVerificationMutation();

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || user?.name || '',
        phone: profile.phone || '',
        timezone: profile.timezone || '',
        language: profile.language || 'en',
      });
      setAvatarPreview(null);
    }
  }, [profile, user]);

  // Fetch connected email status from API
  useEffect(() => {
    const fetchConnectedEmail = async () => {
      try {
        const response = await apiClient.get('/api/v1/auth/connected-email');
        if (response.data?.connected) {
          setConnectedEmail({
            email: response.data.email,
            connectedAt: response.data.connectedAt,
          });
        } else {
          setConnectedEmail(null);
        }
      } catch (error) {
        console.error('[Profile] Failed to fetch connected email:', error);
        setConnectedEmail(null);
      } finally {
        setIsLoadingEmail(false);
      }
    };

    fetchConnectedEmail();
  }, []);

  // Handle OAuth callback params
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth_success');
    const oauthError = searchParams.get('oauth_error');
    const connectedEmailParam = searchParams.get('email');

    if (oauthSuccess === 'true') {
      toast.success(`Gmail connected: ${connectedEmailParam || 'Success'}`);
      // Refresh connected email status
      apiClient.get('/api/v1/auth/connected-email')
        .then(response => {
          if (response.data?.connected) {
            setConnectedEmail({
              email: response.data.email,
              connectedAt: response.data.connectedAt,
            });
          }
        })
        .catch(console.error);
      // Clear URL params
      setSearchParams({}, { replace: true });
    } else if (oauthError) {
      const errorMessages = {
        missing_params: 'OAuth flow was interrupted',
        invalid_state: 'Security validation failed - please try again',
        expired: 'Connection timed out - please try again',
        token_exchange_failed: 'Failed to connect to Gmail - please try again',
        user_info_failed: 'Could not retrieve Gmail info - please try again',
        storage_failed: 'Failed to save connection - please try again',
      };
      toast.error(errorMessages[oauthError] || `Connection failed: ${oauthError}`);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePhotoUpload = async (file) => {
    if (!file || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target.result);
      reader.readAsDataURL(file);
      const { key, publicUrl } = await uploadFile({ file, category: 'avatars' });
      await updateProfile.mutateAsync({ avatarUrl: publicUrl || key });
      setAvatarPreview(null);
      toast.success('Profile photo updated');
    } catch (error) {
      setAvatarPreview(null);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new,
      });
      toast.success('Password updated');
      setShowPasswordModal(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    }
  };

  const handleSignOutSession = async (sessionId) => {
    try {
      await revokeSession.mutateAsync(sessionId);
      toast.success('Session signed out');
    } catch (error) {
      toast.error(error.message || 'Failed to sign out');
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification.mutateAsync();
      toast.success('Verification email sent');
    } catch (error) {
      toast.error(error.message || 'Failed to send');
    }
  };

  const handleEmailConnect = (connectionData) => {
    // This is called from the modal - refresh from API
    apiClient.get('/api/v1/auth/connected-email')
      .then(response => {
        if (response.data?.connected) {
          setConnectedEmail({
            email: response.data.email,
            connectedAt: response.data.connectedAt,
          });
        }
      })
      .catch(console.error);
  };

  const handleEmailDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await apiClient.delete('/api/v1/auth/connected-email');
      setConnectedEmail(null);
      toast.success('Email disconnected');
    } catch (error) {
      console.error('[Profile] Failed to disconnect email:', error);
      toast.error(error.response?.data?.message || 'Failed to disconnect email');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-text mb-2">Error Loading Profile</h3>
        <p className="text-muted">Unable to load your profile. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentSession = activeSessions.find(s => s.isCurrentSession);
  const otherSessions = activeSessions.filter(s => !s.isCurrentSession);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Profile Settings</h1>
          <p className="mt-1 text-sm text-muted">Manage your personal information and preferences</p>
        </div>
        <Button onClick={handleSubmit} disabled={updateProfile.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </header>

      {/* Email Verification Banner */}
      {!profile?.emailVerified && (
        <Alert variant="warning" className="py-2">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle className="text-sm">Email Not Verified</AlertTitle>
          <AlertDescription className="text-sm">
            <button onClick={handleResendVerification} disabled={resendVerification.isPending} className="text-blue-600 underline ml-1">
              {resendVerification.isPending ? 'Sending...' : 'Resend verification'}
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - 60% */}
        <div className="lg:col-span-3 space-y-4">
          {/* User Card + Personal Info Combined */}
          <Card className="p-5">
            <div className="flex items-start gap-4 mb-5 pb-4 border-b border-border">
              <Avatar
                size="lg"
                src={avatarPreview || profile?.avatarUrl}
                fallback={profile?.name || user?.name}
                uploadable={true}
                onUpload={handleProfilePhotoUpload}
                isUploading={isUploadingAvatar}
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-text truncate">{profile?.name || user?.name || 'Your Profile'}</h2>
                <p className="text-sm text-muted truncate">{profile?.email || user?.email}</p>
                <p className="text-xs text-muted mt-1">
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
                <p className="text-xs text-primary mt-1 flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  {isUploadingAvatar ? 'Uploading...' : 'Click to change'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="email"
                    value={profile?.email || user?.email}
                    disabled
                    className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md bg-surface-secondary text-muted cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 123-4567"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Language</label>
                <StyledSelect
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' },
                  ]}
                  value={formData.language}
                  onChange={(opt) => setFormData(prev => ({ ...prev, language: opt?.value || 'en' }))}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted mb-1">Timezone</label>
                <StyledSelect
                  options={[
                    { value: '', label: 'Auto-detect' },
                    { value: 'America/New_York', label: 'Eastern (US)' },
                    { value: 'America/Chicago', label: 'Central (US)' },
                    { value: 'America/Denver', label: 'Mountain (US)' },
                    { value: 'America/Los_Angeles', label: 'Pacific (US)' },
                    { value: 'Europe/London', label: 'London' },
                    { value: 'Europe/Paris', label: 'Paris' },
                  ]}
                  value={formData.timezone}
                  onChange={(opt) => setFormData(prev => ({ ...prev, timezone: opt?.value || '' }))}
                  isClearable={false}
                  isSearchable={true}
                />
              </div>
            </div>
          </Card>

          {/* Security - Compact */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text">Two-Factor Auth</p>
                  <Badge variant={twoFactorEnabled ? 'success' : 'neutral'} size="sm" className="mt-1">
                    {twoFactorEnabled ? 'Enabled' : 'Off'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => twoFactorEnabled ? setTwoFactorEnabled(false) : setShow2FAModal(true)}
                >
                  {twoFactorEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-text">Password</p>
                  <p className="text-xs text-muted">
                    Last changed: {profile?.passwordChangedAt
                      ? new Date(profile.passwordChangedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Never'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
                  Change
                </Button>
              </div>
            </div>
          </Card>

          {/* Email Connection */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </h3>
            {isLoadingEmail ? (
              <div className="flex items-center gap-2 text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : connectedEmail ? (
              /* Connected State */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <Badge variant="success" size="sm">Connected</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{connectedEmail.email}</p>
                    <p className="text-xs text-muted">
                      Connected on {new Date(connectedEmail.connectedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmailDisconnect}
                  disabled={isDisconnecting}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unlink className="w-4 h-4 mr-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Disconnected State */
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Connect your personal email to send and track communications from BarkBase
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    Send emails to clients directly from BarkBase
                  </li>
                  <li className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    Log all email communication automatically
                  </li>
                  <li className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    Track when clients open your emails
                  </li>
                </ul>
                <Button onClick={() => setShowEmailModal(true)}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Connect personal email
                </Button>
              </div>
            )}
          </Card>

          {/* Active Sessions - Compact */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Active Sessions
            </h3>
            {isLoadingSessions ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="space-y-2">
                {currentSession && (
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-text">
                          {parseUserAgent(currentSession.userAgent)}
                          <Badge variant="success" size="sm" className="ml-2">Current</Badge>
                        </p>
                        <p className="text-xs text-muted">{formatLastActive(currentSession.lastActive)}</p>
                      </div>
                    </div>
                  </div>
                )}
                {otherSessions.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-sm text-muted">{otherSessions.length} other session{otherSessions.length > 1 ? 's' : ''}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeAllOtherSessions.mutateAsync()}
                      disabled={revokeAllOtherSessions.isPending}
                    >
                      {revokeAllOtherSessions.isPending ? 'Signing out...' : 'Sign out all'}
                    </Button>
                  </div>
                )}
                {activeSessions.length === 0 && (
                  <p className="text-sm text-muted text-center py-2">No sessions found</p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - 40% */}
        <div className="lg:col-span-2 space-y-4">
          {/* Notification Settings - Compact */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              Notifications
            </h3>
            <div className="space-y-2">
              <ToggleRow
                icon={Mail}
                label="Email notifications"
                checked={notifications.emailBookings}
                onChange={(v) => setNotifications(p => ({ ...p, emailBookings: v }))}
              />
              <ToggleRow
                icon={Smartphone}
                label="SMS alerts"
                checked={notifications.smsAlerts}
                onChange={(v) => setNotifications(p => ({ ...p, smsAlerts: v }))}
              />
              <ToggleRow
                icon={BellRing}
                label="Push notifications"
                checked={notifications.pushUrgent}
                onChange={(v) => setNotifications(p => ({ ...p, pushUrgent: v }))}
              />
              <div className="pt-2 border-t border-border">
                <label className="block text-xs font-medium text-muted mb-1">Frequency</label>
                <div className="flex gap-2">
                  {['real-time', 'daily', 'weekly'].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setNotifications(p => ({ ...p, frequency: freq }))}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                        notifications.frequency === freq
                          ? 'bg-primary text-white'
                          : 'bg-surface-secondary text-muted hover:bg-surface-elevated'
                      }`}
                    >
                      {freq === 'real-time' ? 'Real-time' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Display Preferences - Compact */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3">Display Preferences</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Layout</label>
                <StyledSelect
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'spacious', label: 'Spacious' },
                  ]}
                  value={personalization.dashboardLayout}
                  onChange={(opt) => setPersonalization(p => ({ ...p, dashboardLayout: opt?.value || 'comfortable' }))}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Date</label>
                  <StyledSelect
                    options={[
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                    ]}
                    value={personalization.dateFormat}
                    onChange={(opt) => setPersonalization(p => ({ ...p, dateFormat: opt?.value || 'MM/DD/YYYY' }))}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Time</label>
                  <StyledSelect
                    options={[
                      { value: '12-hour', label: '12-hour' },
                      { value: '24-hour', label: '24-hour' },
                    ]}
                    value={personalization.timeFormat}
                    onChange={(opt) => setPersonalization(p => ({ ...p, timeFormat: opt?.value || '12-hour' }))}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Role & Access - Compact */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-3">Your Role & Access</h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="success">Owner</Badge>
              <span className="text-sm text-muted">Business Owner</span>
            </div>
            <div className="space-y-1">
              {['Full access', 'Manage staff', 'Financial reports', 'Business settings'].map((perm, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  {perm}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (() => {
        const passwordsMatch = passwordForm.new === passwordForm.confirm;
        const showMismatch = passwordForm.confirm.length > 0 && !passwordsMatch;
        const canSubmit = passwordForm.current && passwordForm.new.length >= 8 && passwordsMatch;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-surface-primary rounded-lg p-6 w-full max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm(p => ({ ...p, new: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md"
                  />
                  <PasswordStrength password={passwordForm.new} className="mt-2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border rounded-md ${
                      showMismatch ? 'border-red-500 focus:ring-red-500' : 'border-border'
                    }`}
                  />
                  <p className={`text-xs mt-1 h-4 ${showMismatch ? 'text-red-500' : 'text-transparent'}`}>
                    {showMismatch ? 'Passwords do not match' : '\u00A0'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                <Button size="sm" onClick={handlePasswordSubmit} disabled={!canSubmit || changePassword.isPending}>
                  {changePassword.isPending ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-primary rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Enable Two-Factor Auth</h3>
            <div className="text-center">
              <QrCode className="w-24 h-24 mx-auto mb-3 border border-border rounded-lg p-2" />
              <p className="text-xs text-muted mb-3">Scan with authenticator app</p>
              <input
                type="text"
                placeholder="000000"
                maxLength="6"
                className="w-full px-3 py-2 text-center text-lg font-mono border border-border rounded-md"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShow2FAModal(false)}>Cancel</Button>
              <Button size="sm" onClick={() => {
                setTwoFactorEnabled(true);
                setShow2FAModal(false);
                toast.success('2FA enabled');
              }}>
                Enable
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Connection Modal */}
      <EmailConnectionModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onConnect={handleEmailConnect}
      />
    </div>
  );
};

// Toggle Row Component
const ToggleRow = ({ icon: Icon, label, checked, onChange }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted" />
      <span className="text-sm text-text">{label}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
  </div>
);

export default Profile;
