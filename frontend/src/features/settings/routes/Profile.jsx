import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Globe, Clock, Save, RotateCcw, AlertTriangle,
  Camera, Bell, Shield, Key, Monitor, Zap, Users, Activity,
  Settings, Download, ExternalLink, HelpCircle, Calendar,
  BarChart3, CreditCard, MessageSquare, BadgeCheck, Eye,
  Smartphone, BellRing, BellOff, QrCode, MapPin, Trash2,
  CheckCircle, X, ChevronRight, LogOut, Edit, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Avatar from '@/components/ui/Avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import PasswordStrength from '@/components/ui/PasswordStrength';
import { useUserProfileQuery, useUpdateUserProfileMutation } from '../api-user';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { data: profile, isLoading, error } = useUserProfileQuery();
  const updateProfile = useUpdateUserProfileMutation();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    timezone: '',
    language: 'en',
  });

  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Notification preferences
  const [notificationSettings, setNotificationSettings] = useState({
    email: {
      bookingConfirmations: true,
      bookingCancellations: true,
      payments: true,
      vaccinationReminders: true,
      dailySummary: false,
      weeklyReports: false,
      marketingUpdates: false,
    },
    sms: {
      bookingAlerts: true,
      checkInReminders: true,
      allUpdates: false,
    },
    push: {
      urgentAlerts: true,
      allNotifications: false,
    },
    frequency: 'real-time',
    digestTime: '08:00',
  });

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  // Password management
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // Personalization settings
  const [personalization, setPersonalization] = useState({
    dashboardLayout: 'comfortable',
    defaultLandingPage: 'dashboard',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    numberFormat: 'us',
  });

  // Active sessions (wire to session API)
  const [activeSessions] = useState([
    {
      id: 1,
      device: 'Chrome on Windows',
      location: 'San Francisco, CA',
      lastActive: 'Just now',
      current: true,
    },
    {
      id: 2,
      device: 'Safari on iPhone',
      location: 'Oakland, CA',
      lastActive: '2 hours ago',
      current: false,
    },
  ]);

  const [recentActivity] = useState([
    {
      id: 1,
      action: 'Changed business hours',
      timestamp: '2:34 PM',
      date: 'today',
    },
    {
      id: 2,
      action: 'Added new pet: Max (Golden Retriever)',
      timestamp: '1:15 PM',
      date: 'today',
    },
    {
      id: 3,
      action: 'Processed payment: $250',
      timestamp: '11:22 AM',
      date: 'today',
    },
    {
      id: 4,
      action: 'Updated vaccination for Bella',
      timestamp: '4:45 PM',
      date: 'yesterday',
    },
    {
      id: 5,
      action: 'Created booking: Cooper - Jan 15-18',
      timestamp: '2:30 PM',
      date: 'yesterday',
    },
  ]);

  const [connectedApps] = useState([
    {
      id: 1,
      name: 'Google Calendar',
      description: 'Syncing bookings to joshua.r.bradford1@gmail.com',
      connected: true,
      icon: Calendar,
    },
    {
      id: 2,
      name: 'QuickBooks',
      description: 'Sync financial data automatically',
      connected: false,
      icon: BarChart3,
    },
    {
      id: 3,
      name: 'Mailchimp',
      description: 'Syncing customer list',
      connected: true,
      icon: Mail,
    },
  ]);

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || user?.name || '',
        phone: profile.phone || '',
        timezone: profile.timezone || '',
        language: profile.language || 'en',
      });
    }
  }, [profile, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    if (profile) {
      setFormData({
        name: profile.name || user?.name || '',
        phone: profile.phone || '',
        timezone: profile.timezone || '',
        language: profile.language || 'en',
      });
    }
  };

  // Profile photo upload
  const handleProfilePhotoUpload = (file) => {
    // TODO: Implement actual file upload
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePhoto(e.target.result);
      toast.success('Profile photo updated successfully');
    };
    reader.readAsDataURL(file);
  };

  // Notification handlers
  const handleNotificationChange = (type, setting, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [setting]: value,
      },
    }));
  };

  // Password handlers
  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      const response = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      if (response.ok) {
        toast.success('Password updated successfully');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('An error occurred while updating your password');
    }
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  // 2FA handlers
  const handleEnable2FA = () => {
    setShow2FAModal(true);
  };

  const handleDisable2FA = () => {
    setTwoFactorEnabled(false);
    toast.success('Two-factor authentication disabled');
  };

  // Session handlers
  const handleSignOutSession = (sessionId) => {
    // TODO: Implement session sign out
    toast.success('Session signed out successfully');
  };

  const handleSignOutAllSessions = () => {
    // TODO: Implement sign out all sessions
    toast.success('Signed out of all other sessions');
  };

  // Quick actions
  const quickActions = [
    {
      id: 'schedule',
      label: 'View My Schedule',
      icon: Calendar,
      path: '/calendar',
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    },
    {
      id: 'reports',
      label: 'Today\'s Report',
      icon: BarChart3,
      path: '/reports',
      color: 'bg-green-50 hover:bg-green-100 text-green-700',
    },
    {
      id: 'business',
      label: 'Business Settings',
      icon: Settings,
      path: '/settings/business',
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
    },
    {
      id: 'payments',
      label: 'Recent Payments',
      icon: CreditCard,
      path: '/payments',
      color: 'bg-orange-50 hover:bg-orange-100 text-orange-700',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      path: '/messages',
      color: 'bg-pink-50 hover:bg-pink-100 text-pink-700',
      badge: '3',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      path: '/notifications',
      color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
      badge: '3',
    },
  ];

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#263238] mb-2">Error Loading Profile</h3>
        <p className="text-[#64748B]">Unable to load your profile information. Please try again.</p>
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

  return (
    <div className="space-y-6">
      {/* Email Verification Banner */}
      {!profile?.emailVerified && (
        <Alert variant="warning">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Email Not Verified</AlertTitle>
          <AlertDescription>
            Please verify your email to receive important notifications.
            <button className="text-blue-600 underline ml-2">
              Resend Verification Email
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card title="Quick Actions" description="Fast access to common tasks">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className={`p-4 rounded-lg transition-colors text-left relative ${action.color}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6" />
                  <span className="font-medium">{action.label}</span>
                </div>
                {action.badge && (
                  <Badge variant="primary" className="absolute top-2 right-2 text-xs">
                    {action.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Profile Header with Photo Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-6">
          <Avatar
            size="xl"
            src={profilePhoto}
            fallback={profile?.name || user?.name}
            uploadable={true}
            onUpload={handleProfilePhotoUpload}
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{profile?.name || user?.name || 'Your Profile'}</h1>
            <p className="text-gray-600">{profile?.email || user?.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'January 15, 2024'}
            </p>
            <button className="text-blue-600 text-sm mt-2 hover:underline flex items-center gap-1">
              <Camera className="w-4 h-4" />
              Change Photo
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information Form */}
      <Card title="Personal Information" description="Update your name, contact details, and regional settings">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={profile?.email || user?.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 123-4567"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Auto-detect</option>
                <option value="America/New_York">Eastern Time (US)</option>
                <option value="America/Chicago">Central Time (US)</option>
                <option value="America/Denver">Mountain Time (US)</option>
                <option value="America/Los_Angeles">Pacific Time (US)</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Notification Preferences */}
      <Card title="Notification Settings" description="Choose how you want to be notified about important updates">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Notifications
            </h4>
            <div className="space-y-3">
              {Object.entries(notificationSettings.email).map(([key, value]) => {
                const labels = {
                  bookingConfirmations: 'Booking confirmations',
                  bookingCancellations: 'Booking cancellations',
                  payments: 'Payment received',
                  vaccinationReminders: 'Vaccination expiration warnings',
                  dailySummary: 'Daily summary (at 8:00 AM)',
                  weeklyReports: 'Weekly reports',
                  marketingUpdates: 'Marketing updates',
                };
                return (
                  <label key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange('email', key, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{labels[key]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              SMS Notifications (if phone verified)
            </h4>
            <div className="space-y-3">
              {Object.entries(notificationSettings.sms).map(([key, value]) => {
                const labels = {
                  bookingAlerts: 'Same-day booking alerts',
                  checkInReminders: 'Check-in reminders',
                  allUpdates: 'All booking updates',
                };
                return (
                  <label key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange('sms', key, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{labels[key]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <BellRing className="w-4 h-4" />
              Push Notifications (browser)
            </h4>
            <div className="space-y-3">
              {Object.entries(notificationSettings.push).map(([key, value]) => {
                const labels = {
                  urgentAlerts: 'Urgent alerts only',
                  allNotifications: 'All notifications',
                };
                return (
                  <label key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNotificationChange('push', key, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{labels[key]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Notification Frequency</h4>
            <div className="space-y-2">
              {[
                { value: 'real-time', label: 'Real-time (immediate)' },
                { value: 'digest-daily', label: 'Digest (once daily at ' },
                { value: 'digest-twice', label: 'Digest (twice daily)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={notificationSettings.frequency === option.value}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, frequency: e.target.value }))}
                    className="border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                  {option.value.includes('digest-daily') && (
                    <input
                      type="time"
                      value={notificationSettings.digestTime}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, digestTime: e.target.value }))}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Security Section with 2FA and Password */}
      <Card title="Security" description="Manage your account security and authentication">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Two-Factor Authentication
              </h4>
              <p className="text-sm text-gray-600">Protect your account with an extra layer of security</p>
            </div>
            <div className="text-right">
              <Badge variant={twoFactorEnabled ? 'success' : 'error'}>
                {twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
              </Badge>
              <div className="mt-2">
                {!twoFactorEnabled ? (
                  <Button onClick={handleEnable2FA} size="sm">
                    Enable 2FA
                  </Button>
                ) : (
                  <Button onClick={handleDisable2FA} variant="outline" size="sm">
                    Disable 2FA
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Password Security
              </h4>
              <p className="text-sm text-gray-600">Last changed: Never</p>
            </div>
            <Button onClick={() => setShowPasswordModal(true)}>
              Change Password
            </Button>
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      <Card title="Active Sessions" description="View and manage devices where you're logged in">
        <div className="space-y-4">
          {activeSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {session.current ? (
                  <Monitor className="w-5 h-5 text-blue-600" />
                ) : (
                  <Smartphone className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{session.device}</p>
                  <p className="text-sm text-gray-600">
                    Last active: {session.lastActive} • {session.location}
                    {session.current && ' (current session)'}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSignOutSession(session.id)}
                >
                  Sign Out
                </Button>
              )}
            </div>
          ))}
          <div className="pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleSignOutAllSessions}>
              Sign Out All Other Sessions
            </Button>
          </div>
        </div>
      </Card>

      {/* Role & Permissions */}
      <Card title="Your Role & Access" description="View your current permissions and access level">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="success">Owner</Badge>
            <span className="text-sm text-gray-600">Business Owner</span>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Permissions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'Full access to all features',
                'Can manage staff',
                'Can view financial reports',
                'Can modify business settings',
              ].map((permission, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {permission}
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline">
            View All Permissions →
          </Button>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title="Recent Activity" description="Track your recent actions in the system">
        <div className="space-y-4">
          {['Today', 'Yesterday'].map((date) => (
            <div key={date}>
              <h4 className="font-medium text-gray-900 mb-3">{date}</h4>
              <div className="space-y-3">
                {recentActivity
                  .filter((activity) => activity.date === date.toLowerCase())
                  .map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-200">
            <Button variant="outline">
              View Full Activity Log →
            </Button>
          </div>
        </div>
      </Card>

      {/* Display Preferences */}
      <Card title="Display Preferences" description="Customize how information appears in the system">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dashboard Layout
            </label>
            <div className="space-y-2">
              {[
                { value: 'compact', label: 'Compact view (more info, less space)' },
                { value: 'comfortable', label: 'Comfortable view (balanced)' },
                { value: 'spacious', label: 'Spacious view (easier to read)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="dashboardLayout"
                    value={option.value}
                    checked={personalization.dashboardLayout === option.value}
                    onChange={(e) => setPersonalization(prev => ({ ...prev, dashboardLayout: e.target.value }))}
                    className="border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Landing Page
              </label>
              <select
                value={personalization.defaultLandingPage}
                onChange={(e) => setPersonalization(prev => ({ ...prev, defaultLandingPage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dashboard">Dashboard</option>
                <option value="schedule">Today's Schedule</option>
                <option value="bookings">Bookings</option>
                <option value="reports">Reports</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                value={personalization.dateFormat}
                onChange={(e) => setPersonalization(prev => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <select
                value={personalization.timeFormat}
                onChange={(e) => setPersonalization(prev => ({ ...prev, timeFormat: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="12-hour">12-hour (2:30 PM)</option>
                <option value="24-hour">24-hour (14:30)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number Format
              </label>
              <select
                value={personalization.numberFormat}
                onChange={(e) => setPersonalization(prev => ({ ...prev, numberFormat: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="us">1,234.56 (US)</option>
                <option value="european">1.234,56 (European)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Privacy & Data */}
      <Card title="Privacy & Data" description="You have full control over your personal information">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Download My Data</h4>
              <p className="text-sm text-gray-600">Export all your profile data and activity (JSON/CSV)</p>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium text-red-900">Request Account Deletion</h4>
              <p className="text-sm text-red-700">Permanently delete your account and data (requires confirmation)</p>
            </div>
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Request Deletion
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Data Retention: All personal data retained per GDPR guidelines</p>
            <p>
              Privacy Policy: <button className="text-blue-600 underline">Link</button> |
              Terms of Service: <button className="text-blue-600 underline ml-1">Link</button>
            </p>
          </div>
        </div>
      </Card>

      {/* Connected Apps */}
      <Card title="Connected Apps" description="Manage third-party integrations linked to your account">
        <div className="space-y-4">
          {connectedApps.map((app) => {
            const Icon = app.icon;
            return (
              <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{app.name}</h4>
                    <p className="text-sm text-gray-600">{app.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.connected ? (
                    <>
                      <Badge variant="success">Connected</Badge>
                      <Button variant="outline" size="sm">
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm">
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-gray-200">
            <Button variant="outline">
              Manage All Integrations →
            </Button>
          </div>
        </div>
      </Card>

      {/* Help & Support */}
      <Card title="Need Help?" description="Get support and access documentation">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex-col gap-2">
            <HelpCircle className="w-6 h-6" />
            View Documentation
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2">
            <MessageSquare className="w-6 h-6" />
            Contact Support
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2">
            <Monitor className="w-6 h-6" />
            Video Tutorials
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2">
            <ExternalLink className="w-6 h-6" />
            Community Forum
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">System Information</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Account ID:</span>
              <p className="font-mono">#12345</p>
            </div>
            <div>
              <span className="text-gray-500">Plan:</span>
              <p>Professional</p>
            </div>
            <div>
              <span className="text-gray-500">Version:</span>
              <p>2.1.4</p>
            </div>
            <div>
              <span className="text-gray-500">Last Updated:</span>
              <p>Jan 15, 2024</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Account Information */}
      <Card title="Account Information" description="View your account details and status">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Account Created</label>
            <p className="font-medium">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'January 15, 2024'}
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Email Status</label>
            <Badge variant={profile?.emailVerified ? 'success' : 'warning'}>
              {profile?.emailVerified ? 'Verified' : 'Not Verified'}
            </Badge>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Last Login</label>
            <p className="font-medium">Just now</p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Account Type</label>
            <p className="font-medium">Business Owner</p>
          </div>
        </div>
      </Card>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => handlePasswordChange('current', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => handlePasswordChange('new', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <PasswordStrength password={passwordForm.new} className="mt-2" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => handlePasswordChange('confirm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>✓ At least 8 characters</p>
                <p>✓ One uppercase letter</p>
                <p>✓ One number</p>
                <p>○ One special character (!@#$%)</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit}>
                Update Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Secure Your Account</h3>

            <div className="space-y-4">
              <div className="text-center">
                <QrCode className="w-32 h-32 mx-auto mb-4 border border-gray-200 rounded-lg p-2" />
                <p className="text-sm text-gray-600 mb-4">
                  1. Download authenticator app (Google Authenticator, Authy)
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  2. Scan the QR code above with your app
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  3. Enter the 6-digit code from your app
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShow2FAModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setTwoFactorEnabled(true);
                setShow2FAModal(false);
                toast.success('Two-factor authentication enabled successfully');
              }}>
                Verify & Enable
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;