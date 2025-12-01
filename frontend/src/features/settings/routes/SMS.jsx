import { useState, useEffect, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import { useTenantStore } from '@/stores/tenant';
import SettingsPage from '../components/SettingsPage';
import {
  MessageSquare,
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
  Clock,
  Zap,
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
            <span className={`text-xs ${isOverLimit ? 'text-amber-500' : 'text-muted'}`}>
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
                className="px-2 py-1 text-xs bg-surface-secondary hover:bg-surface-tertiary rounded border border-surface-border transition-colors"
                title={variable.description}
              >
                {variable.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !content.trim()}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
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
        authToken: '', // Never show actual token
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
      setCredentials(prev => ({ ...prev, authToken: '' })); // Clear token field
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
      <SettingsPage title="SMS Settings" description="Send text message notifications and reminders to pet owners">
        <UpgradeBanner requiredPlan="PRO" feature="SMS Notifications" className="xl:col-span-2" />
      </SettingsPage>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <SettingsPage title="SMS Settings" description="Send text message notifications and reminders to pet owners">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted">Loading SMS settings...</span>
        </div>
      </SettingsPage>
    );
  }

  // Error state
  if (isError) {
    return (
      <SettingsPage title="SMS Settings" description="Send text message notifications and reminders to pet owners">
        <Card>
          <div className="flex items-center gap-3 text-danger">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to load SMS settings</span>
          </div>
        </Card>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage title="SMS Settings" description="Send text message notifications and reminders to pet owners">
      {/* SMS Configuration Card */}
      <Card
        title="SMS Configuration"
        description="Connect your Twilio account to enable SMS"
        className="xl:col-span-2"
      >
        {/* Connection Status */}
        <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-surface-secondary">
          <div className={`flex items-center gap-2 ${settings.isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
            {settings.isConnected ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Not Connected</span>
              </>
            )}
          </div>
          {settings.isConnected && settings.twilioPhoneNumber && (
            <Badge variant="neutral" className="ml-auto">
              <Phone className="w-3 h-3 mr-1" />
              {settings.twilioPhoneNumber}
            </Badge>
          )}
        </div>

        {/* Credentials Form */}
        {!settings.isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted mb-4">
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-text-primary"
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
              <p className="text-xs text-muted mt-1">Your Twilio phone number in E.164 format</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveCredentials}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Credentials
              </Button>
              {settings.twilioAccountSid && (
                <Button
                  variant="outline"
                  onClick={handleVerifyConnection}
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Get your credentials at{' '}
                  <a
                    href="https://www.twilio.com/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    twilio.com/console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted">Account SID</span>
                <p className="font-mono mt-1">{settings.twilioAccountSid}</p>
              </div>
              <div>
                <span className="text-muted">Phone Number</span>
                <p className="font-mono mt-1">{settings.twilioPhoneNumber}</p>
              </div>
              {settings.connectionVerifiedAt && (
                <div>
                  <span className="text-muted">Verified</span>
                  <p className="mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {new Date(settings.connectionVerifiedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted">Messages This Month</span>
                <p className="mt-1">{settings.messagesSentThisMonth || 0}</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="text-danger hover:bg-danger/10"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Disconnect Twilio
            </Button>
          </div>
        )}
      </Card>

      {/* Automated SMS Notifications */}
      <Card
        title="Automated SMS Notifications"
        description="Choose which notifications are sent via text message"
      >
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium">Booking Confirmations</span>
              <p className="text-xs text-muted">Send when a booking is confirmed</p>
            </div>
            <Switch
              checked={notificationToggles.bookingConfirmations}
              onChange={(checked) => handleToggleChange('bookingConfirmations', checked)}
              disabled={!settings.isConnected}
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium">Booking Reminders</span>
              <p className="text-xs text-muted">Reminder before appointments</p>
            </div>
            <Switch
              checked={notificationToggles.bookingReminders}
              onChange={(checked) => handleToggleChange('bookingReminders', checked)}
              disabled={!settings.isConnected}
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium">Check-in Reminders</span>
              <p className="text-xs text-muted">Remind to check in pets</p>
            </div>
            <Switch
              checked={notificationToggles.checkinReminders}
              onChange={(checked) => handleToggleChange('checkinReminders', checked)}
              disabled={!settings.isConnected}
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium">Vaccination Reminders</span>
              <p className="text-xs text-muted">Alert when vaccinations are expiring</p>
            </div>
            <Switch
              checked={notificationToggles.vaccinationReminders}
              onChange={(checked) => handleToggleChange('vaccinationReminders', checked)}
              disabled={!settings.isConnected}
            />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium">Payment Receipts</span>
              <p className="text-xs text-muted">Send receipts after payments</p>
            </div>
            <Switch
              checked={notificationToggles.paymentReceipts}
              onChange={(checked) => handleToggleChange('paymentReceipts', checked)}
              disabled={!settings.isConnected}
            />
          </label>
        </div>

        {hasToggleChanges && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <Button
              onClick={handleSaveToggles}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        )}

        {!settings.isConnected && (
          <p className="text-xs text-muted mt-4">
            Connect Twilio above to enable SMS notifications
          </p>
        )}

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted flex items-center gap-1">
            <Info className="w-3 h-3" />
            Cost: ~$0.01 per SMS segment (160 characters)
          </p>
        </div>
      </Card>

      {/* SMS Templates */}
      <Card
        title="SMS Templates"
        description="Customize your automated messages"
        className="xl:col-span-2"
      >
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.type}
              className="p-4 border border-surface-border rounded-lg hover:bg-surface-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.isCustom && (
                      <Badge variant="primary" size="sm">Customized</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-1 font-mono truncate">
                    "{template.content}"
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {template.characterCount} characters
                    {template.characterCount > 160 && ` (${Math.ceil(template.characterCount / 160)} segments)`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTemplate(template)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted">
            <span className="font-medium">Available variables:</span>{' '}
            {availableVariables.map(v => v.name).join(', ')}
          </p>
        </div>
      </Card>

      {/* Two-Way SMS (Coming Soon) */}
      {plan !== 'ENTERPRISE' ? (
        <UpgradeBanner requiredPlan="ENTERPRISE" feature="Two-way SMS" className="xl:col-span-2" />
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
          <p className="text-sm text-muted">
            When enabled, customer replies will appear in your inbox and can be routed to staff members.
            This feature is coming soon for Enterprise plans.
          </p>
        </Card>
      )}

      {/* Test SMS */}
      <Card
        title="Test SMS"
        description="Send a test message to verify your configuration"
      >
        <div className="space-y-4">
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
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted mt-1">
              Enter a phone number in E.164 format to receive a test message
            </p>
          </div>

          {!settings.isConnected && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Connect and verify Twilio to send test messages
            </p>
          )}
        </div>
      </Card>

      {/* Template Edit Modal */}
      {editingTemplate && (
        <TemplateEditModal
          template={editingTemplate}
          availableVariables={availableVariables}
          onClose={() => setEditingTemplate(null)}
          onSave={() => setEditingTemplate(null)}
        />
      )}
    </SettingsPage>
  );
};

export default SMS;
