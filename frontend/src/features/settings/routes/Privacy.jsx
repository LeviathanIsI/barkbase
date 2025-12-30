import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import StyledSelect from '@/components/ui/StyledSelect';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/apiClient';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Database, Download,
  FileText,
  Info,
  Loader2,
  Mail, MessageSquare,
  Save,
  Search, Shield,
  Trash2,
  Users,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Retention period options
const RETENTION_OPTIONS = {
  '6mo': '6 months',
  '1yr': '1 year',
  '2yr': '2 years',
  '3yr': '3 years',
  '5yr': '5 years',
  '7yr': '7 years',
  '10yr': '10 years',
  'forever': 'Keep forever',
};

// Default retention settings
const DEFAULT_RETENTION = {
  customerRecords: '3yr',
  petRecords: '3yr',
  bookingHistory: '5yr',
  paymentRecords: '7yr',
  signedWaivers: '7yr',
  communicationLogs: '1yr',
  vaccinationRecords: '3yr',
};

// Default visibility settings
const DEFAULT_VISIBILITY = {
  showPhoneToAllStaff: true,
  showEmailToAllStaff: true,
  showAddressToAllStaff: false,
  showPaymentDetailsToAllStaff: false,
};

// Default communication preferences
const DEFAULT_COMMUNICATION = {
  marketingEmailsDefault: 'opt-in',
  bookingRemindersDefault: true,
  vaccinationRemindersDefault: true,
  promotionalSmsDefault: 'opt-in',
};

const Privacy = () => {
  // State for all settings
  const [retention, setRetention] = useState(DEFAULT_RETENTION);
  const [visibility, setVisibility] = useState(DEFAULT_VISIBILITY);
  const [communication, setCommunication] = useState(DEFAULT_COMMUNICATION);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Customer data request state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadPrivacySettings();
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [retention, visibility, communication]);

  const loadPrivacySettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await apiClient.get('/api/v1/config/privacy');

      if (data) {
        if (data.retention) setRetention({ ...DEFAULT_RETENTION, ...data.retention });
        if (data.visibility) setVisibility({ ...DEFAULT_VISIBILITY, ...data.visibility });
        if (data.communication) setCommunication({ ...DEFAULT_COMMUNICATION, ...data.communication });
      }
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      await apiClient.put('/api/v1/config/privacy', {
        retention,
        visibility,
        communication,
      });

      setSuccessMessage('Privacy settings saved successfully');
      setHasChanges(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
      setError(err.message || 'Failed to save privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setError(null);
      const { data } = await apiClient.get('/api/v1/owners', {
        params: { search: searchQuery.trim(), limit: 10 }
      });
      setSearchResults(data?.owners || data || []);
    } catch (err) {
      console.error('Failed to search customers:', err);
      setError(err.message || 'Failed to search customers');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExportData = async () => {
    if (!selectedCustomer) return;

    try {
      setIsExporting(true);
      setError(null);

      const { data } = await apiClient.get(`/api/v1/owners/${selectedCustomer.id}/export`);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-data-${selectedCustomer.name?.replace(/\s+/g, '-') || selectedCustomer.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Data exported for ${selectedCustomer.name || 'customer'}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export customer data:', err);
      setError(err.message || 'Failed to export customer data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!selectedCustomer) return;

    const customerName = selectedCustomer.name || selectedCustomer.first_name + ' ' + selectedCustomer.last_name;
    if (deleteConfirmName.toLowerCase() !== customerName.toLowerCase()) {
      setError('Customer name does not match. Please type the exact name to confirm deletion.');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);

      await apiClient.delete(`/api/v1/owners/${selectedCustomer.id}/data`);

      setSuccessMessage(`All data for ${customerName} has been deleted`);
      setShowDeleteConfirm(false);
      setSelectedCustomer(null);
      setDeleteConfirmName('');
      setSearchResults(searchResults.filter(c => c.id !== selectedCustomer.id));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete customer data:', err);
      setError(err.message || 'Failed to delete customer data');
    } finally {
      setIsDeleting(false);
    }
  };

  const updateRetention = (key, value) => {
    setRetention(prev => ({ ...prev, [key]: value }));
  };

  const updateVisibility = (key, value) => {
    setVisibility(prev => ({ ...prev, [key]: value }));
  };

  const updateCommunication = (key, value) => {
    setCommunication(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500 dark:text-text-secondary">Loading privacy settings...</span>
      </div>
    );
  }

  const retentionItems = [
    { key: 'customerRecords', label: 'Customer/Owner Records', desc: 'Contact info, account details', icon: Users },
    { key: 'petRecords', label: 'Pet Records', desc: 'Pet profiles, medical notes', icon: Database },
    { key: 'bookingHistory', label: 'Booking History', desc: 'Past bookings and stays', icon: Clock },
    { key: 'paymentRecords', label: 'Payment & Invoice Records', desc: 'Transactions, receipts', icon: FileText, recommended: '7yr' },
    { key: 'signedWaivers', label: 'Signed Waivers & Agreements', desc: 'Liability waivers, service agreements', icon: Shield, recommended: '7yr' },
    { key: 'communicationLogs', label: 'Communication Logs', desc: 'Email and SMS history', icon: Mail },
    { key: 'vaccinationRecords', label: 'Vaccination Records', desc: 'Vaccine history and certificates', icon: Shield },
  ];

  const visibilityItems = [
    { key: 'showPhoneToAllStaff', label: 'Show customer phone numbers to all staff', desc: 'When off, only managers can see' },
    { key: 'showEmailToAllStaff', label: 'Show customer email addresses to all staff', desc: 'When off, only managers can see' },
    { key: 'showAddressToAllStaff', label: 'Show customer addresses to all staff', desc: 'When off, only managers can see' },
    { key: 'showPaymentDetailsToAllStaff', label: 'Show payment details to all staff', desc: 'When off, only managers can see' },
  ];

  const communicationItems = [
    { key: 'marketingEmailsDefault', label: 'Marketing Emails', desc: 'Promotional offers, newsletters', icon: Mail, type: 'select' },
    { key: 'bookingRemindersDefault', label: 'Booking Reminders', desc: 'Upcoming reservation notifications', icon: Bell, type: 'toggle' },
    { key: 'vaccinationRemindersDefault', label: 'Vaccination Reminders', desc: 'Alerts when vaccinations expiring', icon: Shield, type: 'toggle' },
    { key: 'promotionalSmsDefault', label: 'Promotional SMS', desc: 'Marketing text messages', icon: MessageSquare, type: 'select' },
  ];

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Row 1: Data Retention | Staff Data Visibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Retention Policies */}
        <Card title="Data Retention Policies" description="Configure how long to keep different types of customer data">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">State Requirements May Apply</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                Some states require minimum retention periods. IRS recommends keeping financial records for at least 7 years.
              </p>
            </div>
          </div>

          {/* Retention Settings Grid */}
          <div className="grid grid-cols-2 gap-3">
            {retentionItems.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <StyledSelect
                  label={
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-text-secondary" />
                      {label}
                    </span>
                  }
                  options={Object.entries(RETENTION_OPTIONS).map(([val, lbl]) => ({
                    value: val,
                    label: lbl,
                  }))}
                  value={retention[key]}
                  onChange={(opt) => updateRetention(key, opt?.value || '3yr')}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Staff Data Visibility */}
        <Card title="Staff Data Visibility" description="Control what customer information staff members can see">
          <div className="space-y-2">
            {visibilityItems.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-2">
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">{desc}</p>
                </div>
                <Switch
                  checked={visibility[key]}
                  onChange={(v) => updateVisibility(key, v)}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Customer Data Requests | Default Communication Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Data Requests */}
        <Card title="Customer Data Requests" description="Export or delete all data for a specific customer when requested">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium mb-1">Search Customer</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by name, email..."
                    className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <Button onClick={handleSearch} variant="outline" disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-text-secondary">
                  {searchResults.length} customer{searchResults.length !== 1 ? 's' : ''} found
                </p>
                <div className="border border-gray-200 dark:border-surface-border rounded-lg divide-y divide-gray-200 dark:divide-surface-border max-h-48 overflow-y-auto">
                  {searchResults.map((customer) => {
                    const name = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
                    const isSelected = selectedCustomer?.id === customer.id;

                    return (
                      <div
                        key={customer.id}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-surface-secondary'
                        }`}
                        onClick={() => setSelectedCustomer(isSelected ? null : customer)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{name}</p>
                          <p className="text-xs text-gray-500 dark:text-text-secondary truncate">
                            {customer.email || 'No email'}
                          </p>
                        </div>
                        {isSelected && <Badge variant="primary" size="sm">Selected</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions for Selected Customer */}
            {selectedCustomer && (
              <div className="p-3 rounded-lg border border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary">
                <p className="text-sm font-medium mb-3">
                  Actions for: {selectedCustomer.name || `${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportData} disabled={isExporting}>
                    {isExporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete Data
                  </Button>
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-6 text-gray-500 dark:text-text-secondary">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No customers found</p>
              </div>
            )}
          </div>
        </Card>

        {/* Default Communication Preferences */}
        <Card title="Default Communication Preferences" description="Set default opt-in/opt-out settings for new customers">
          <div className="space-y-2">
            {communicationItems.map(({ key, label, desc, icon: Icon, type }) => (
              <div key={key} className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-500 dark:text-text-secondary flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium">{label}</span>
                    <p className="text-xs text-gray-500 dark:text-text-secondary">{desc}</p>
                  </div>
                </div>
                {type === 'select' ? (
                  <div className="min-w-[120px]">
                    <StyledSelect
                      options={[
                        { value: 'opt-in', label: 'Opt-in req' },
                        { value: 'opt-out', label: 'Default on' },
                      ]}
                      value={communication[key]}
                      onChange={(opt) => updateCommunication(key, opt?.value || 'opt-in')}
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                ) : (
                  <Switch
                    checked={communication[key]}
                    onChange={(v) => updateCommunication(key, v)}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save Changes</>
          )}
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmName('');
        }}
        title="Delete All Customer Data"
        size="default"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">This action cannot be undone</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                All data for this customer will be permanently deleted, including:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 mt-2 list-disc list-inside space-y-1">
                <li>Customer account and contact information</li>
                <li>All pet records</li>
                <li>Booking history</li>
                <li>Payment and invoice records</li>
                <li>Signed waivers and agreements</li>
                <li>Communication history</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Type the customer's name to confirm:{' '}
              <strong>{selectedCustomer?.name || `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}</strong>
            </label>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Type customer name here..."
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteData}
              disabled={isDeleting || !deleteConfirmName.trim()}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Permanently Delete All Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Privacy;
