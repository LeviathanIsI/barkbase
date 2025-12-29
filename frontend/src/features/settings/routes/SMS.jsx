import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import { useTenantStore } from '@/stores/tenant';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  Phone,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Send,
  Edit2,
  Info,
  Zap,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useSmsSettingsQuery,
  useUpdateSmsSettingsMutation,
  useVerifyTwilioMutation,
  useDisconnectTwilioMutation,
  useSendTestSmsMutation,
  useSmsTemplatesQuery,
  useUpdateSmsTemplateMutation,
} from '../api';

// Template Edit Modal Component
const TemplateEditModal = ({ template, availableVariables, onClose, onSave }) => {
  const [content, setContent] = useState(template?.content || '');
  const updateMutation = useUpdateSmsTemplateMutation();

  const characterCount = content.length;
  const segmentCount = Math.ceil(characterCount / 160);
  const isOverLimit = characterCount > 160;

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        type: template.type,
        content,
        name: template.name,
      });
      toast.success('Template saved successfully');
      onSave?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    }
  };

  const insertVariable = (variable) => {
    setContent(prev => prev + variable);
  };

  return (
    <Modal open onClose={onClose} title={`Edit ${template?.name || 'Template'}`} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Message Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary font-mono text-sm"
            placeholder="Enter your SMS template..."
          />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-xs ${isOverLimit ? 'text-amber-500' : 'text-gray-500 dark:text-text-secondary'}`}>
              {characterCount} characters
              {segmentCount > 1 && ` (${segmentCount} SMS segments)`}
            </span>
            {isOverLimit && (
              <span className="text-xs text-amber-500">
                Messages over 160 chars cost more
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Available Variables</label>
          <div className="flex flex-wrap gap-2">
            {availableVariables?.map((variable) => (
              <button
                key={variable.name}
                type="button"
                onClick={() => insertVariable(variable.name)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-surface-secondary hover:bg-gray-200 dark:hover:bg-surface-elevated rounded border border-gray-200 dark:border-surface-border transition-colors"
                title={variable.description}
              >
                {variable.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !content.trim()}
          >
            {updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              'Save Template'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const SMS = () => {
  const tz = useTimezoneUtils();
  const tenant = useTenantStore((state) => state.tenant);
  const plan = tenant?.plan || 'FREE';

  // API hooks
  const { data: smsData, isLoading, isError } = useSmsSettingsQuery();
  const { data: templatesData } = useSmsTemplatesQuery();
  const updateSettingsMutation = useUpdateSmsSettingsMutation();
  const verifyMutation = useVerifyTwilioMutation();
  const disconnectMutation = useDisconnectTwilioMutation();
  const sendTestMutation = useSendTestSmsMutation();

  // Local state for credentials form
  const [credentials, setCredentials] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
  });
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Local state for notification toggles
  const [notificationToggles, setNotificationToggles] = useState({
    bookingConfirmations: true,
    bookingReminders: true,
    checkinReminders: false,
    vaccinationReminders: false,
    paymentReceipts: false,
  });
  const [hasToggleChanges, setHasToggleChanges] = useState(false);

  const settings = smsData?.settings || {};
  const templates = templatesData?.templates || [];
  const availableVariables = templatesData?.availableVariables || [];

  // Sync server data to local state
  useEffect(() => {
    if (smsData?.settings) {
      const s = smsData.settings;
      setNotificationToggles({
        bookingConfirmations: s.bookingConfirmations ?? true,
        bookingReminders: s.bookingReminders ?? true,
        checkinReminders: s.checkinReminders ?? false,
        vaccinationReminders: s.vaccinationReminders ?? false,
        paymentReceipts: s.paymentReceipts ?? false,
      });
      setCredentials({
        accountSid: s.twilioAccountSid || '',
        authToken: '',
        phoneNumber: s.twilioPhoneNumber || '',
      });
      setHasToggleChanges(false);
    }
  }, [smsData]);

  const handleToggleChange = (key, value) => {
    setNotificationToggles(prev => ({ ...prev, [key]: value }));
    setHasToggleChanges(true);
  };

  const handleSaveToggles = async () => {
    try {
      await updateSettingsMutation.mutateAsync(notificationToggles);
      toast.success('SMS notification settings saved');
      setHasToggleChanges(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentials.accountSid || !credentials.authToken || !credentials.phoneNumber) {
      toast.error('Please fill in all Twilio credentials');
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        twilioAccountSid: credentials.accountSid,
        twilioAuthToken: credentials.authToken,
        twilioPhoneNumber: credentials.phoneNumber,
      });
      toast.success('Credentials saved. Click "Test Connection" to verify.');
      setCredentials(prev => ({ ...prev, authToken: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save credentials');
    }
  };

  const handleVerifyConnection = async () => {
    try {
      const result = await verifyMutation.mutateAsync();
      toast.success(result.message || 'Twilio connection verified!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Connection verification failed');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Twilio? This will disable all SMS notifications.')) {
      return;
    }

    try {
      await disconnectMutation.mutateAsync();
      toast.success('Twilio disconnected successfully');
      setCredentials({ accountSid: '', authToken: '', phoneNumber: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect');
    }
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    try {
      const result = await sendTestMutation.mutateAsync({ phone: testPhone });
      toast.success(result.message || 'Test SMS sent!');
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.requiresSetup) {
        toast.error('Please configure and verify Twilio first');
      } else {
        toast.error(errorData?.message || 'Failed to send test SMS');
      }
    }
  };

  // Show upgrade banner for free plan
  if (plan === 'FREE') {
    return (
      <div className="space-y-6">
        <UpgradeBanner requiredPlan="PRO" feature="SMS Notifications" />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500 dark:text-text-secondary">Loading SMS settings...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Failed to load SMS settings. Please try again.</span>
        </div>
      </div>
    );
  }

  const notificationOptions = [
    { key: 'bookingConfirmations', label: 'Booking Confirmations', desc: 'Send when a booking is confirmed' },
    { key: 'bookingReminders', label: 'Booking Reminders', desc: 'Reminder before appointments' },
    { key: 'checkinReminders', label: 'Check-in Reminders', desc: 'Remind to check in pets' },
    { key: 'vaccinationReminders', label: 'Vaccination Reminders', desc: 'Alert when vaccinations expiring' },
    { key: 'paymentReceipts', label: 'Payment Receipts', desc: 'Send receipts after payments' },
  ];

  return (
    <div className="space-y-6">
      {/* Row 1: SMS Configuration | Automated SMS Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Configuration */}
        <Card title="SMS Configuration" description="Connect your Twilio account to enable SMS">
          {/* Connection Status */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-surface-secondary">
            <div className={`flex items-center gap-2 ${settings.isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-text-secondary'}`}>
              {settings.isConnected ? (
                <><CheckCircle className="w-5 h-5" /><span className="font-medium">Connected</span></>
              ) : (
                <><XCircle className="w-5 h-5" /><span className="font-medium">Not Connected</span></>
              )}
            </div>
            {settings.isConnected && settings.twilioPhoneNumber && (
              <Badge variant="neutral" className="ml-auto">
                <Phone className="w-3 h-3 mr-1" />
                {settings.twilioPhoneNumber}
              </Badge>
            )}
          </div>

          {/* Credentials Form or Connected Info */}
          {!settings.isConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-text-secondary">
                To enable SMS notifications, connect your Twilio account:
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">Account SID</label>
                <input
                  type="text"
                  value={credentials.accountSid}
                  onChange={(e) => setCredentials(prev => ({ ...prev, accountSid: e.target.value }))}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Auth Token</label>
                <div className="relative">
                  <input
                    type={showAuthToken ? 'text' : 'password'}
                    value={credentials.authToken}
                    onChange={(e) => setCredentials(prev => ({ ...prev, authToken: e.target.value }))}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-text-primary"
                  >
                    {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={credentials.phoneNumber}
                  onChange={(e) => setCredentials(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+15551234567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">Your Twilio phone number (E.164 format)</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveCredentials} disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Credentials
                </Button>
                {settings.twilioAccountSid && (
                  <Button variant="outline" onClick={handleVerifyConnection} disabled={verifyMutation.isPending}>
                    {verifyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Test Connection
                  </Button>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Get your credentials at{' '}
                    <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                      twilio.com/console <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-text-secondary">Account SID</span>
                  <p className="font-mono mt-1 text-sm truncate">{settings.twilioAccountSid}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-text-secondary">Phone Number</span>
                  <p className="font-mono mt-1">{settings.twilioPhoneNumber}</p>
                </div>
                {settings.connectionVerifiedAt && (
                  <div>
                    <span className="text-gray-500 dark:text-text-secondary">Verified</span>
                    <p className="mt-1 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {tz.formatShortDate(settings.connectionVerifiedAt)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-text-secondary">This Month</span>
                  <p className="mt-1">{settings.messagesSentThisMonth || 0} messages</p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {disconnectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Disconnect Twilio
              </Button>
            </div>
          )}
        </Card>

        {/* Automated SMS Notifications */}
        <Card title="Automated SMS Notifications" description="Choose which notifications are sent via text message">
          <div className="space-y-2">
            {notificationOptions.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-2">
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">{desc}</p>
                </div>
                <Switch
                  checked={notificationToggles[key]}
                  onChange={(checked) => handleToggleChange(key, checked)}
                  disabled={!settings.isConnected}
                />
              </div>
            ))}
          </div>

          {!settings.isConnected && (
            <p className="text-xs text-gray-500 dark:text-text-secondary mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
              Connect Twilio above to enable SMS notifications
            </p>
          )}

          {hasToggleChanges && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border flex justify-end">
              <Button onClick={handleSaveToggles} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: SMS Templates | Two-Way SMS + Test SMS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Templates */}
        <Card title="SMS Templates" description="Customize your automated messages">
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.type}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg border border-gray-200 dark:border-surface-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{template.name}</span>
                    {template.isCustom && <Badge variant="success" size="sm">Customized</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-text-secondary font-mono truncate mt-0.5">
                    "{template.content}"
                  </p>
                  <p className="text-xs text-gray-400 dark:text-text-muted mt-0.5">
                    {template.characterCount} characters
                    {template.characterCount > 160 && ` (${Math.ceil(template.characterCount / 160)} segments)`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(template)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
            <p className="text-xs text-gray-500 dark:text-text-secondary">
              <span className="font-medium">Available variables:</span>{' '}
              {availableVariables.map(v => v.name).join(', ')}
            </p>
          </div>
        </Card>

        {/* Right column: Two-Way SMS + Test SMS stacked */}
        <div className="space-y-6">
          {/* Two-Way SMS (Coming Soon) */}
          {plan !== 'ENTERPRISE' ? (
            <UpgradeBanner requiredPlan="ENTERPRISE" feature="Two-way SMS" />
          ) : (
            <Card
              title={
                <div className="flex items-center gap-2">
                  Two-Way SMS
                  <Badge variant="warning">Coming Soon</Badge>
                </div>
              }
              description="Allow customers to reply to text messages"
            >
              <p className="text-sm text-gray-500 dark:text-text-secondary">
                When enabled, customer replies will appear in your inbox and can be routed to staff members.
                This feature is coming soon for Enterprise plans.
              </p>
            </Card>
          )}

          {/* Test SMS */}
          <Card title="Test SMS" description="Send a test message to verify your configuration">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+15551234567"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                  />
                  <Button
                    onClick={handleSendTest}
                    disabled={sendTestMutation.isPending || !settings.isConnected}
                  >
                    {sendTestMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Send Test</>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  Enter phone in E.164 format
                </p>
              </div>

              {!settings.isConnected && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">Connect and verify Twilio to send test messages</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Template Edit Modal */}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          availableVariables={availableVariables}
          onClose={() => setEditingTemplate(null)}
          onSave={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
};

export default SMS;
