import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import StyledSelect from '@/components/ui/StyledSelect';
import { useTenantStore } from '@/stores/tenant';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  useEmailSettingsQuery,
  useUpdateEmailSettingsMutation,
  useEmailUsageQuery,
  useEmailTemplatesQuery,
  useUpdateEmailTemplateMutation,
  useSendTestEmailMutation,
} from '../api';
import {
  Mail,
  Send,
  Eye,
  Pencil,
  CheckCircle,
  Image,
  Loader2,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Email = () => {
  const tz = useTimezoneUtils();
  const tenant = useTenantStore((state) => state.tenant);

  // API hooks
  const { data: settingsData, isLoading: isLoadingSettings } = useEmailSettingsQuery();
  const { data: usageData, isLoading: isLoadingUsage } = useEmailUsageQuery();
  const { data: templatesData, isLoading: isLoadingTemplates } = useEmailTemplatesQuery();
  const updateSettingsMutation = useUpdateEmailSettingsMutation();
  const updateTemplateMutation = useUpdateEmailTemplateMutation();
  const sendTestEmailMutation = useSendTestEmailMutation();

  // Local state for settings form
  const [settings, setSettings] = useState({
    logoUrl: '',
    primaryColor: '#4F46E5',
    headerBgColor: '#1F2937',
    footerText: '',
    replyToEmail: '',
    sendBookingConfirmation: true,
    sendCheckinReminder: true,
    sendVaccinationReminder: false,
    sendBookingCancelled: true,
    sendPaymentReceipt: true,
  });

  // Template editor modal state
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ subject: '', body: '' });

  // Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [selectedTestTemplate, setSelectedTestTemplate] = useState('booking_confirmation');

  // Settings dirty state
  const [isDirty, setIsDirty] = useState(false);

  // Sync settings from API
  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  // Handle settings change
  const handleSettingsChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync(settings);
      setIsDirty(false);
      toast.success('Email settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    }
  };

  // Open template editor
  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({ subject: template.subject, body: template.body });
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await updateTemplateMutation.mutateAsync({
        type: editingTemplate.type,
        subject: templateForm.subject,
        body: templateForm.body,
        name: editingTemplate.name,
      });
      setEditingTemplate(null);
      toast.success('Template saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    }
  };

  // Preview template with sample data
  const renderPreview = (template) => {
    const sampleData = {
      owner_name: 'John Smith',
      pet_name: 'Max',
      business_name: tenant?.name || 'Your Business',
      date: tz.formatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: '9:00 AM',
      service: 'Daycare',
      total: '$45.00',
      booking_id: 'BK-12345',
      footer_text: settings.footerText || 'Thank you for choosing us!',
    };

    let subject = template.subject;
    let body = template.body;

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { subject, body };
  };

  // Send test email
  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      await sendTestEmailMutation.mutateAsync({
        templateType: selectedTestTemplate,
        recipientEmail: testEmail,
      });
      toast.success('Test email sent to ' + testEmail);
      setTestEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    }
  };

  const templates = templatesData?.templates || [];
  const usage = usageData?.usage || { today: 0, thisMonth: 0, dailyLimit: 200, monthlyLimit: 1000 };
  const sender = usageData?.sender || { email: 'notifications@barkbase.io', verified: true };
  const usagePercent = usage.monthlyLimit > 0 ? Math.round((usage.thisMonth / usage.monthlyLimit) * 100) : 0;

  const automationOptions = [
    { key: 'sendBookingConfirmation', label: 'Booking confirmation', desc: 'When a booking is created' },
    { key: 'sendCheckinReminder', label: 'Check-in reminder', desc: '24 hours before check-in' },
    { key: 'sendVaccinationReminder', label: 'Vaccination expiration', desc: '30, 14, 7 days before expiration' },
    { key: 'sendBookingCancelled', label: 'Booking cancelled', desc: 'When a booking is cancelled' },
    { key: 'sendPaymentReceipt', label: 'Payment receipt', desc: 'After successful payment' },
  ];

  const variables = ['owner_name', 'pet_name', 'business_name', 'date', 'time', 'service', 'total', 'booking_id', 'footer_text'];

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Email Templates & Automated Emails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Templates */}
        <Card title="Email Templates" description="Customize emails sent to your customers">
          {isLoadingTemplates ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (<div key={i} className="h-14 bg-gray-100 dark:bg-surface-secondary rounded" />))}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div key={template.type} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg border border-gray-200 dark:border-surface-border">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{template.name}</span>
                      {template.isCustom && <Badge variant="success" size="sm">Customized</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-text-secondary truncate">{template.description}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(template)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Automated Emails */}
        <Card title="Automated Emails" description="Choose which emails are sent automatically">
          <div className="space-y-2">
            {automationOptions.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-2">
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">{desc}</p>
                </div>
                <Switch
                  checked={settings[key]}
                  onChange={(checked) => handleSettingsChange(key, checked)}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Email Branding & Email Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Branding */}
        <Card title="Email Branding" description="Customize your email appearance">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Logo URL</label>
              <div className="flex gap-3 items-center">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-surface-secondary rounded flex items-center justify-center border border-gray-200 dark:border-surface-border overflow-hidden">
                  {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" /> : <Image className="h-5 w-5 text-gray-400" />}
                </div>
                <Input value={settings.logoUrl || ''} onChange={(e) => handleSettingsChange('logoUrl', e.target.value)} placeholder="https://example.com/logo.png" className="flex-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Primary Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.primaryColor} onChange={(e) => handleSettingsChange('primaryColor', e.target.value)} className="h-9 w-12 p-1 rounded border border-gray-300 dark:border-surface-border cursor-pointer" />
                  <Input value={settings.primaryColor} onChange={(e) => handleSettingsChange('primaryColor', e.target.value)} placeholder="#4F46E5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Header Background</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={settings.headerBgColor} onChange={(e) => handleSettingsChange('headerBgColor', e.target.value)} className="h-9 w-12 p-1 rounded border border-gray-300 dark:border-surface-border cursor-pointer" />
                  <Input value={settings.headerBgColor} onChange={(e) => handleSettingsChange('headerBgColor', e.target.value)} placeholder="#1F2937" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Footer Text</label>
              <Input value={settings.footerText || ''} onChange={(e) => handleSettingsChange('footerText', e.target.value)} placeholder="Thank you for choosing us!" />
              <p className="text-xs text-gray-500 dark:text-text-muted mt-1">Appears at the bottom of all emails</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Reply-To Email</label>
              <Input type="email" value={settings.replyToEmail || ''} onChange={(e) => handleSettingsChange('replyToEmail', e.target.value)} placeholder="info@yourbusiness.com" />
              <p className="text-xs text-gray-500 dark:text-text-muted mt-1">Where customer replies will be sent</p>
            </div>
          </div>
        </Card>

        {/* Email Usage */}
        <Card title="Email Usage" description="Monitor your email sending limits">
          {isLoadingUsage ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-100 dark:bg-surface-secondary rounded w-1/2" />
              <div className="h-4 bg-gray-100 dark:bg-surface-secondary rounded w-3/4" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Today</p>
                  <p className="text-xl font-bold">{usage.today.toLocaleString()} <span className="text-sm font-normal text-gray-500">/ {usage.dailyLimit.toLocaleString()}</span></p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-text-secondary">This Month</p>
                  <p className="text-xl font-bold">{usage.thisMonth.toLocaleString()} <span className="text-sm font-normal text-gray-500">/ {usage.monthlyLimit.toLocaleString()}</span></p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-text-secondary">Monthly usage</span>
                  <span className="font-medium">{usagePercent}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-surface-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 75 ? 'bg-yellow-500' : 'bg-primary-600'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-surface-border">
                <div>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Sender Email</p>
                  <p className="text-sm font-medium">{sender.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  {sender.verified ? (
                    <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-xs text-green-600 font-medium">Verified</span></>
                  ) : (
                    <Badge variant="warning" size="sm">Pending</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Test Email (Full Width) */}
      <Card title="Test Email" description="Send a test email to preview how it looks">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <StyledSelect
              label="Template"
              options={templates.map((t) => ({ value: t.type, label: t.name }))}
              value={selectedTestTemplate}
              onChange={(opt) => setSelectedTestTemplate(opt?.value || '')}
              isClearable={false}
              isSearchable
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Send To</label>
            <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <Button onClick={handleSendTestEmail} loading={sendTestEmailMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />Send Test
          </Button>
        </div>
      </Card>

      {/* Save Button */}
      {isDirty && (
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <><Settings className="w-4 h-4 mr-2" />Save Settings</>
            )}
          </Button>
        </div>
      )}

      {/* Template Edit Modal */}
      <Modal isOpen={!!editingTemplate} onClose={() => setEditingTemplate(null)} title={`Edit ${editingTemplate?.name || 'Template'}`} size="xl">
        {editingTemplate && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject Line</label>
              <Input value={templateForm.subject} onChange={(e) => setTemplateForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder="Email subject..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email Body (HTML)</label>
              <textarea value={templateForm.body} onChange={(e) => setTemplateForm((prev) => ({ ...prev, body: e.target.value }))} rows={12} className="w-full rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="<html>...</html>" />
            </div>
            <div className="p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
              <p className="text-sm font-medium mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <code key={v} className="px-2 py-1 bg-gray-200 dark:bg-surface-elevated rounded text-xs cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors" onClick={() => { navigator.clipboard.writeText(`{{${v}}}`); toast.success(`Copied {{${v}}}`); }}>
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-surface-border">
              <Button variant="ghost" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button onClick={handleSaveTemplate} loading={updateTemplateMutation.isPending}>Save Template</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Template Preview Modal */}
      <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={`Preview: ${previewTemplate?.name || 'Template'}`} size="xl">
        {previewTemplate && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
              <p className="text-xs text-gray-500 dark:text-text-secondary">Subject:</p>
              <p className="font-medium">{renderPreview(previewTemplate).subject}</p>
            </div>
            <div className="border border-gray-200 dark:border-surface-border rounded-lg overflow-hidden">
              <iframe srcDoc={renderPreview(previewTemplate).body} title="Email Preview" className="w-full h-96 bg-white" />
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setPreviewTemplate(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Email;
