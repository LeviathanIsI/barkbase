import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import SettingsPage from '../components/SettingsPage';
import {
  Globe,
  Link2,
  Copy,
  ExternalLink,
  QrCode,
  Check,
  X,
  Home,
  Sun,
  Scissors,
  GraduationCap,
  UserPlus,
  Shield,
  Mail,
  MessageSquare,
  Palette,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useOnlineBookingSettingsQuery,
  useUpdateOnlineBookingSettingsMutation,
  useCheckSlugAvailabilityMutation,
  usePortalQRCodeQuery,
  usePoliciesQuery,
} from '../api';

const OnlineBooking = () => {
  const { data, isLoading, error } = useOnlineBookingSettingsQuery();
  const { data: policiesData } = usePoliciesQuery();
  const { data: qrData } = usePortalQRCodeQuery();
  const updateMutation = useUpdateOnlineBookingSettingsMutation();
  const checkSlugMutation = useCheckSlugAvailabilityMutation();

  const [settings, setSettings] = useState({
    // Portal
    portalEnabled: true,
    urlSlug: '',
    // Services
    boardingEnabled: true,
    boardingMinNights: 1,
    boardingMaxNights: 30,
    daycareEnabled: true,
    daycareSameDay: true,
    groomingEnabled: false,
    trainingEnabled: false,
    // New Customers
    allowNewCustomers: true,
    newCustomerApproval: 'manual',
    requireVaxUpload: true,
    requireEmergencyContact: true,
    requireVetInfo: true,
    requirePetPhoto: false,
    // Requirements
    requireWaiver: true,
    waiverId: null,
    requireDeposit: true,
    depositPercent: 25,
    depositMinimumCents: null,
    requireCardOnFile: true,
    // Confirmation
    sendConfirmationEmail: true,
    sendConfirmationSms: false,
    confirmationMessage: "Thank you for booking with us! We look forward to seeing you and your pet.",
    includeCancellationPolicy: true,
    includeDirections: true,
    includeChecklist: true,
    // Appearance
    welcomeMessage: "Welcome! Book your pet's stay online in just a few clicks.",
    showLogo: true,
    showPhotos: true,
    showPricing: true,
    showReviews: true,
  });

  const [slugInput, setSlugInput] = useState('');
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
      setSlugInput(data.settings.urlSlug || '');
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ ...settings, urlSlug: slugInput });
      toast.success('Online booking settings saved successfully!');
    } catch (error) {
      console.error('Error saving online booking settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSlugChange = async (value) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setSlugInput(slug);
    setSlugAvailable(null);

    if (slug && slug !== data?.settings?.urlSlug) {
      setSlugChecking(true);
      try {
        const result = await checkSlugMutation.mutateAsync(slug);
        setSlugAvailable(result.available);
      } catch (error) {
        console.error('Error checking slug:', error);
      } finally {
        setSlugChecking(false);
      }
    } else if (slug === data?.settings?.urlSlug) {
      setSlugAvailable(true);
    }
  };

  const copyLink = () => {
    const url = `https://book.barkbase.com/${slugInput}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const previewPortal = () => {
    const url = `https://book.barkbase.com/${slugInput}`;
    window.open(url, '_blank');
  };

  const policies = policiesData?.policies?.filter(p => p.type === 'liability' || p.type === 'waiver') || [];

  if (isLoading) {
    return (
      <SettingsPage title="Online Booking" description="Configure your customer-facing booking portal">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </SettingsPage>
    );
  }

  if (error) {
    return (
      <SettingsPage title="Online Booking" description="Configure your customer-facing booking portal">
        <Card>
          <div className="text-center py-8 text-red-500">
            Failed to load online booking settings. Please try again.
          </div>
        </Card>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage
      title="Online Booking"
      description="Configure your customer-facing booking portal"
    >
      {/* Portal Status & Link */}
      <Card
        title="Online Booking Portal"
        description="Your customer booking portal status and link"
        icon={<Globe className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Portal Status:</span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
                settings.portalEnabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${settings.portalEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                {settings.portalEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <Button
              variant={settings.portalEnabled ? 'outline' : 'primary'}
              size="sm"
              onClick={() => updateSetting('portalEnabled', !settings.portalEnabled)}
            >
              {settings.portalEnabled ? 'Disable Portal' : 'Enable Portal'}
            </Button>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">Your booking link:</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
              <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                https://book.barkbase.com/
              </span>
              <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                {slugInput || 'your-kennel'}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="w-4 h-4 mr-1" />
                Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={previewPortal}>
                <ExternalLink className="w-4 h-4 mr-1" />
                Preview Portal
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowQRModal(true)}>
                <QrCode className="w-4 h-4 mr-1" />
                QR Code
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">Custom URL Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">book.barkbase.com/</span>
              <div className="relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="your-kennel-name"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
                {slugChecking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
                {!slugChecking && slugAvailable === true && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {!slugChecking && slugAvailable === false && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            {slugAvailable === false && (
              <p className="text-sm text-red-500 mt-1">This URL is already taken</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>
        </div>
      </Card>

      {/* Available Services */}
      <Card
        title="Services Available Online"
        description="Choose which services customers can book online"
        icon={<Home className="w-5 h-5" />}
      >
        <div className="space-y-4">
          {/* Boarding */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Boarding</span>
              </div>
              <Switch
                checked={settings.boardingEnabled}
                onChange={(checked) => updateSetting('boardingEnabled', checked)}
              />
            </div>
            {settings.boardingEnabled && (
              <div className="ml-6 mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-text-secondary">Min nights:</label>
                  <input
                    type="number"
                    value={settings.boardingMinNights}
                    onChange={(e) => updateSetting('boardingMinNights', parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-text-secondary">Max nights:</label>
                  <input
                    type="number"
                    value={settings.boardingMaxNights}
                    onChange={(e) => updateSetting('boardingMaxNights', parseInt(e.target.value) || 30)}
                    min="1"
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Daycare */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-yellow-500" />
                <span className="font-medium">Daycare</span>
              </div>
              <Switch
                checked={settings.daycareEnabled}
                onChange={(checked) => updateSetting('daycareEnabled', checked)}
              />
            </div>
            {settings.daycareEnabled && (
              <div className="ml-6 mt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.daycareSameDay}
                    onChange={(checked) => updateSetting('daycareSameDay', checked)}
                  />
                  <label className="text-sm text-gray-600 dark:text-text-secondary">Allow same-day booking</label>
                </div>
              </div>
            )}
          </div>

          {/* Grooming */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Grooming</span>
              </div>
              <Switch
                checked={settings.groomingEnabled}
                onChange={(checked) => updateSetting('groomingEnabled', checked)}
              />
            </div>
            {!settings.groomingEnabled && (
              <p className="ml-6 mt-2 text-sm text-gray-500 italic">Disabled - requires phone booking</p>
            )}
          </div>

          {/* Training */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-green-500" />
                <span className="font-medium">Training</span>
              </div>
              <Switch
                checked={settings.trainingEnabled}
                onChange={(checked) => updateSetting('trainingEnabled', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* New Customer Settings */}
      <Card
        title="New Customers"
        description="Configure how new customers can book online"
        icon={<UserPlus className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Allow new customers to book online</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Let first-time customers make reservations</p>
            </div>
            <Switch
              checked={settings.allowNewCustomers}
              onChange={(checked) => updateSetting('allowNewCustomers', checked)}
            />
          </div>

          {settings.allowNewCustomers && (
            <>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-3">New customer booking requires:</label>
                <div className="space-y-2">
                  {[
                    { value: 'instant', label: 'No approval (instant confirmation)' },
                    { value: 'manual', label: 'Manual approval before confirming' },
                    { value: 'phone', label: 'Phone consultation first' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="newCustomerApproval"
                        value={option.value}
                        checked={settings.newCustomerApproval === option.value}
                        onChange={(e) => updateSetting('newCustomerApproval', e.target.value)}
                        className="w-4 h-4 text-brand-600"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-3">Required info for new customers:</label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pet vaccination records (upload)</span>
                    <Switch
                      checked={settings.requireVaxUpload}
                      onChange={(checked) => updateSetting('requireVaxUpload', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Emergency contact</span>
                    <Switch
                      checked={settings.requireEmergencyContact}
                      onChange={(checked) => updateSetting('requireEmergencyContact', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vet information</span>
                    <Switch
                      checked={settings.requireVetInfo}
                      onChange={(checked) => updateSetting('requireVetInfo', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pet photo</span>
                    <Switch
                      checked={settings.requirePetPhoto}
                      onChange={(checked) => updateSetting('requirePetPhoto', checked)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Booking Requirements */}
      <Card
        title="Booking Requirements"
        description="Set requirements for online bookings"
        icon={<Shield className="w-5 h-5" />}
      >
        <div className="space-y-4">
          {/* Waiver */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Require signed waiver before booking</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Customer must accept terms</p>
              </div>
              <Switch
                checked={settings.requireWaiver}
                onChange={(checked) => updateSetting('requireWaiver', checked)}
              />
            </div>
            {settings.requireWaiver && (
              <div className="ml-6 mt-3">
                <label className="block text-sm text-gray-600 dark:text-text-secondary mb-1">Waiver:</label>
                <select
                  value={settings.waiverId || ''}
                  onChange={(e) => updateSetting('waiverId', e.target.value || null)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-sm"
                >
                  <option value="">Select a waiver...</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name || policy.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Deposit */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Require deposit for online bookings</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Collect payment upfront</p>
              </div>
              <Switch
                checked={settings.requireDeposit}
                onChange={(checked) => updateSetting('requireDeposit', checked)}
              />
            </div>
            {settings.requireDeposit && (
              <div className="ml-6 mt-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-text-secondary">Deposit:</label>
                  <input
                    type="number"
                    value={settings.depositPercent}
                    onChange={(e) => updateSetting('depositPercent', parseInt(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded text-sm"
                  />
                  <span className="text-sm text-gray-600 dark:text-text-secondary">%</span>
                </div>
                <span className="text-sm text-gray-400">or</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-text-secondary">$</span>
                  <input
                    type="number"
                    value={settings.depositMinimumCents ? (settings.depositMinimumCents / 100).toFixed(2) : ''}
                    onChange={(e) => updateSetting('depositMinimumCents', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-20 px-2 py-1 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded text-sm"
                  />
                  <span className="text-sm text-gray-600 dark:text-text-secondary">minimum</span>
                </div>
              </div>
            )}
          </div>

          {/* Card on file */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Require card on file</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Customer must save payment method</p>
              </div>
              <Switch
                checked={settings.requireCardOnFile}
                onChange={(checked) => updateSetting('requireCardOnFile', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation & Communication */}
      <Card
        title="Booking Confirmation"
        description="Configure confirmation messages and emails"
        icon={<Mail className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Send confirmation email immediately</span>
            <Switch
              checked={settings.sendConfirmationEmail}
              onChange={(checked) => updateSetting('sendConfirmationEmail', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Send confirmation SMS</span>
            <Switch
              checked={settings.sendConfirmationSms}
              onChange={(checked) => updateSetting('sendConfirmationSms', checked)}
            />
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">Confirmation message (shown after booking):</label>
            <textarea
              value={settings.confirmationMessage}
              onChange={(e) => updateSetting('confirmationMessage', e.target.value)}
              rows={3}
              placeholder="Thank you for booking with us!"
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {'{{pet_name}}'}, {'{{date}}'}, {'{{service}}'}
            </p>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Include cancellation policy in confirmation</span>
              <Switch
                checked={settings.includeCancellationPolicy}
                onChange={(checked) => updateSetting('includeCancellationPolicy', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Include directions/address</span>
              <Switch
                checked={settings.includeDirections}
                onChange={(checked) => updateSetting('includeDirections', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Include what to bring checklist</span>
              <Switch
                checked={settings.includeChecklist}
                onChange={(checked) => updateSetting('includeChecklist', checked)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Portal Appearance */}
      <Card
        title="Portal Appearance"
        description="Customize how your booking portal looks"
        icon={<Palette className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Welcome Message</label>
            <textarea
              value={settings.welcomeMessage}
              onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
              rows={2}
              placeholder="Welcome to our kennel! Book your pet's stay online."
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary resize-none"
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Show business logo</span>
              <Switch
                checked={settings.showLogo}
                onChange={(checked) => updateSetting('showLogo', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Show business photos</span>
              <Switch
                checked={settings.showPhotos}
                onChange={(checked) => updateSetting('showPhotos', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Show services & pricing</span>
              <Switch
                checked={settings.showPricing}
                onChange={(checked) => updateSetting('showPricing', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Show reviews/testimonials</span>
              <Switch
                checked={settings.showReviews}
                onChange={(checked) => updateSetting('showReviews', checked)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <Button variant="outline" onClick={previewPortal}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Preview Portal
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button onClick={handleSave} disabled={updateMutation.isPending || (slugAvailable === false)}>
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Settings className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </Card>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQRModal(false)}>
          <div className="bg-white dark:bg-surface-primary rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center">Booking Portal QR Code</h3>
            <div className="flex justify-center mb-4">
              {qrData?.qrCodeUrl ? (
                <img src={qrData.qrCodeUrl} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 bg-gray-100 dark:bg-surface-secondary flex items-center justify-center rounded">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-text-secondary mb-4">
              Scan to visit: book.barkbase.com/{slugInput}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (qrData?.qrCodeUrl) {
                    const link = document.createElement('a');
                    link.href = qrData.qrCodeUrl;
                    link.download = `booking-qr-${slugInput}.png`;
                    link.click();
                  }
                }}
              >
                Download
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowQRModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </SettingsPage>
  );
};

export default OnlineBooking;
