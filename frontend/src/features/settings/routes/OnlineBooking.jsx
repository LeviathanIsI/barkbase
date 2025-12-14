import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import StyledSelect from '@/components/ui/StyledSelect';
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
  Settings,
  Loader2,
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load online booking settings. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Two Column Layout - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portal Status & Link */}
        <Card title="Online Booking Portal" description="Your customer booking portal status">
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
                {settings.portalEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Your booking link:</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-text-secondary truncate">
                  https://book.barkbase.com/{slugInput || 'your-kennel'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={previewPortal}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowQRModal(true)}>
                  <QrCode className="w-4 h-4 mr-1" />
                  QR
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Custom URL Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">book.barkbase.com/</span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={slugInput}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="your-kennel"
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
            </div>
          </div>
        </Card>

        {/* Services Available Online */}
        <Card title="Services Available Online" description="Choose which services customers can book">
          <div className="space-y-4">
            {/* Boarding */}
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
              <div className="ml-6 flex items-center gap-4 text-sm">
                <span className="text-gray-600 dark:text-text-secondary">Min: {settings.boardingMinNights}</span>
                <span className="text-gray-600 dark:text-text-secondary">Max: {settings.boardingMaxNights} nights</span>
              </div>
            )}

            {/* Daycare */}
            <div className="flex items-center justify-between border-t pt-4">
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
              <div className="ml-6 flex items-center gap-2">
                <Switch
                  checked={settings.daycareSameDay}
                  onChange={(checked) => updateSetting('daycareSameDay', checked)}
                />
                <span className="text-sm text-gray-600 dark:text-text-secondary">Allow same-day</span>
              </div>
            )}

            {/* Grooming */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-500" />
                <span className="font-medium">Grooming</span>
              </div>
              <Switch
                checked={settings.groomingEnabled}
                onChange={(checked) => updateSetting('groomingEnabled', checked)}
              />
            </div>

            {/* Training */}
            <div className="flex items-center justify-between border-t pt-4">
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
        </Card>
      </div>

      {/* Two Column Layout - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Customers */}
        <Card title="New Customers" description="Configure how new customers can book">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Allow new customers to book</span>
              <Switch
                checked={settings.allowNewCustomers}
                onChange={(checked) => updateSetting('allowNewCustomers', checked)}
              />
            </div>

            {settings.allowNewCustomers && (
              <>
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Booking requires:</label>
                  <div className="space-y-2">
                    {[
                      { value: 'instant', label: 'No approval (instant)' },
                      { value: 'manual', label: 'Manual approval' },
                      { value: 'phone', label: 'Phone consultation first' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="newCustomerApproval"
                          value={option.value}
                          checked={settings.newCustomerApproval === option.value}
                          onChange={(e) => updateSetting('newCustomerApproval', e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <label className="block text-sm font-medium">Required info:</label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vaccination records</span>
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
              </>
            )}
          </div>
        </Card>

        {/* Booking Requirements */}
        <Card title="Booking Requirements" description="Set requirements for online bookings">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Require signed waiver</span>
              <Switch
                checked={settings.requireWaiver}
                onChange={(checked) => updateSetting('requireWaiver', checked)}
              />
            </div>
            {settings.requireWaiver && (
              <div className="ml-6">
                <StyledSelect
                  options={[
                    { value: '', label: 'Select a waiver...' },
                    ...policies.map((policy) => ({
                      value: policy.id,
                      label: policy.name || policy.title,
                    })),
                  ]}
                  value={settings.waiverId || ''}
                  onChange={(opt) => updateSetting('waiverId', opt?.value || null)}
                  isClearable
                  isSearchable
                  placeholder="Select a waiver..."
                />
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <span className="font-medium">Require deposit</span>
              <Switch
                checked={settings.requireDeposit}
                onChange={(checked) => updateSetting('requireDeposit', checked)}
              />
            </div>
            {settings.requireDeposit && (
              <div className="ml-6 flex items-center gap-2">
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
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <span className="font-medium">Require card on file</span>
              <Switch
                checked={settings.requireCardOnFile}
                onChange={(checked) => updateSetting('requireCardOnFile', checked)}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout - Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confirmation */}
        <Card title="Booking Confirmation" description="Configure confirmation messages">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Send confirmation email</span>
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
              <label className="block text-sm font-medium mb-2">Confirmation message:</label>
              <textarea
                value={settings.confirmationMessage}
                onChange={(e) => updateSetting('confirmationMessage', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-sm resize-none"
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Include cancellation policy</span>
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
                <span className="text-sm">Include what to bring</span>
                <Switch
                  checked={settings.includeChecklist}
                  onChange={(checked) => updateSetting('includeChecklist', checked)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Portal Appearance */}
        <Card title="Portal Appearance" description="Customize how your portal looks">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Welcome Message</label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-sm resize-none"
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
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending || (slugAvailable === false)}>
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Settings className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQRModal(false)}>
          <div className="bg-white dark:bg-surface-primary rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center">Booking Portal QR Code</h3>
            <div className="flex justify-center mb-4">
              {qrData?.qrCodeUrl ? (
                <img src={qrData.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 bg-gray-100 dark:bg-surface-secondary flex items-center justify-center rounded">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-text-secondary mb-4">
              book.barkbase.com/{slugInput}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowQRModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineBooking;
