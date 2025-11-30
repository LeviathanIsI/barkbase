import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import Modal from '@/components/ui/Modal';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import { 
  Database, Download, Trash2, Search, Shield, Eye, EyeOff,
  Mail, MessageSquare, Bell, AlertTriangle, Clock, Users,
  FileText, Save, RefreshCw, Info, CheckCircle, XCircle
} from 'lucide-react';

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
  marketingEmailsDefault: 'opt-in', // 'opt-in' or 'opt-out'
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
    // Compare with loaded values to detect changes
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
      // Use defaults if settings don't exist yet
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
      
      // Create and download the file
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--bb-color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--bb-color-text-primary)]">
              Privacy & Data Management
            </h2>
            <p className="text-sm text-[var(--bb-color-text-muted)] mt-1">
              Control how customer data is stored, accessed, and managed at your facility.
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            loading={isSaving}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Success/Error Messages */}
      {successMessage && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Section 1: Data Retention */}
      <Card 
        title="Data Retention Policies" 
        description="Configure how long to keep different types of customer data after they stop using your services"
      >
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bb-color-status-info-soft)] border border-[var(--bb-color-status-info-soft)]">
            <Info className="w-5 h-5 text-[var(--bb-color-status-info-text)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--bb-color-status-info-text)]">
                State Requirements May Apply
              </p>
              <p className="text-sm text-[var(--bb-color-status-info-text)] mt-1">
                Some states require minimum retention periods for certain records. For tax purposes, the IRS recommends keeping financial records for at least 7 years. Consult with your accountant or legal advisor for specific requirements in your state.
              </p>
            </div>
          </div>

          {/* Retention Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RetentionSelect
              label="Customer/Owner Records"
              description="Contact info, account details"
              value={retention.customerRecords}
              onChange={(v) => updateRetention('customerRecords', v)}
              icon={Users}
            />
            <RetentionSelect
              label="Pet Records"
              description="Pet profiles, medical notes"
              value={retention.petRecords}
              onChange={(v) => updateRetention('petRecords', v)}
              icon={Database}
            />
            <RetentionSelect
              label="Booking History"
              description="Past reservations and stays"
              value={retention.bookingHistory}
              onChange={(v) => updateRetention('bookingHistory', v)}
              icon={Clock}
            />
            <RetentionSelect
              label="Payment & Invoice Records"
              description="Transactions, receipts (for tax purposes)"
              value={retention.paymentRecords}
              onChange={(v) => updateRetention('paymentRecords', v)}
              icon={FileText}
              recommended="7yr"
            />
            <RetentionSelect
              label="Signed Waivers & Agreements"
              description="Liability waivers, service agreements"
              value={retention.signedWaivers}
              onChange={(v) => updateRetention('signedWaivers', v)}
              icon={Shield}
              recommended="7yr"
            />
            <RetentionSelect
              label="Communication Logs"
              description="Email and SMS history"
              value={retention.communicationLogs}
              onChange={(v) => updateRetention('communicationLogs', v)}
              icon={Mail}
            />
            <RetentionSelect
              label="Vaccination Records"
              description="Vaccine history and certificates"
              value={retention.vaccinationRecords}
              onChange={(v) => updateRetention('vaccinationRecords', v)}
              icon={Shield}
            />
          </div>
        </div>
      </Card>

      {/* Section 2: Customer Data Requests */}
      <Card 
        title="Customer Data Requests" 
        description="Export or delete all data for a specific customer when requested"
      >
        <div className="space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-[var(--bb-color-text-primary)] mb-2">
              Search Customer
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--bb-color-text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name, email, or phone..."
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                />
              </div>
              <Button onClick={handleSearch} loading={isSearching} variant="secondary">
                Search
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-[var(--bb-color-text-muted)]">
                {searchResults.length} customer{searchResults.length !== 1 ? 's' : ''} found
              </p>
              <div className="border border-[var(--bb-color-border-subtle)] rounded-lg divide-y divide-[var(--bb-color-border-subtle)]">
                {searchResults.map((customer) => {
                  const name = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
                  const isSelected = selectedCustomer?.id === customer.id;
                  
                  return (
                    <div
                      key={customer.id}
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[var(--bb-color-accent-soft)]' 
                          : 'hover:bg-[var(--bb-color-bg-elevated)]'
                      }`}
                      onClick={() => setSelectedCustomer(isSelected ? null : customer)}
                    >
                      <div>
                        <p className="font-medium text-[var(--bb-color-text-primary)]">{name}</p>
                        <p className="text-sm text-[var(--bb-color-text-muted)]">
                          {customer.email || 'No email'} • {customer.phone || 'No phone'}
                        </p>
                      </div>
                      {isSelected && (
                        <Badge variant="accent">Selected</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions for Selected Customer */}
          {selectedCustomer && (
            <div className="p-4 rounded-lg border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]">
              <p className="font-medium text-[var(--bb-color-text-primary)] mb-4">
                Actions for: {selectedCustomer.name || `${selectedCustomer.first_name} ${selectedCustomer.last_name}`}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="secondary" 
                  onClick={handleExportData}
                  loading={isExporting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Data
                </Button>
              </div>
              <p className="text-xs text-[var(--bb-color-text-muted)] mt-3">
                Export creates a JSON file with all customer data including pets, bookings, payments, and communications.
              </p>
            </div>
          )}

          {/* No Results Message */}
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-8 text-[var(--bb-color-text-muted)]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No customers found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </Card>

      {/* Section 3: Staff Data Visibility */}
      <Card 
        title="Staff Data Visibility" 
        description="Control what customer information staff members can see"
      >
        <div className="space-y-4">
          <VisibilityToggle
            label="Show customer phone numbers to all staff"
            description="When off, only managers can see phone numbers"
            checked={visibility.showPhoneToAllStaff}
            onChange={(v) => updateVisibility('showPhoneToAllStaff', v)}
            icon={Eye}
          />
          <VisibilityToggle
            label="Show customer email addresses to all staff"
            description="When off, only managers can see email addresses"
            checked={visibility.showEmailToAllStaff}
            onChange={(v) => updateVisibility('showEmailToAllStaff', v)}
            icon={Mail}
          />
          <VisibilityToggle
            label="Show customer addresses to all staff"
            description="When off, only managers can see addresses"
            checked={visibility.showAddressToAllStaff}
            onChange={(v) => updateVisibility('showAddressToAllStaff', v)}
            icon={Users}
          />
          <VisibilityToggle
            label="Show payment details to all staff"
            description="When off, only managers can see payment methods and history"
            checked={visibility.showPaymentDetailsToAllStaff}
            onChange={(v) => updateVisibility('showPaymentDetailsToAllStaff', v)}
            icon={EyeOff}
            recommended={false}
          />
        </div>
      </Card>

      {/* Section 4: Communication Preferences Default */}
      <Card 
        title="Default Communication Preferences" 
        description="Set default opt-in/opt-out settings for new customers"
      >
        <div className="space-y-6">
          {/* Marketing Emails */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--bb-color-border-subtle)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--bb-color-bg-elevated)]">
                <Mail className="w-5 h-5 text-[var(--bb-color-text-muted)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--bb-color-text-primary)]">Marketing Emails</p>
                <p className="text-sm text-[var(--bb-color-text-muted)]">
                  Promotional offers, newsletters, and updates
                </p>
              </div>
            </div>
            <select
              value={communication.marketingEmailsDefault}
              onChange={(e) => updateCommunication('marketingEmailsDefault', e.target.value)}
              className="px-3 py-2 rounded-md border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
            >
              <option value="opt-in">Opt-in required</option>
              <option value="opt-out">Subscribed by default</option>
            </select>
          </div>

          {/* Booking Reminders */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--bb-color-border-subtle)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--bb-color-bg-elevated)]">
                <Bell className="w-5 h-5 text-[var(--bb-color-text-muted)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--bb-color-text-primary)]">Booking Reminders</p>
                <p className="text-sm text-[var(--bb-color-text-muted)]">
                  Upcoming reservation notifications
                </p>
              </div>
            </div>
            <Switch
              checked={communication.bookingRemindersDefault}
              onCheckedChange={(v) => updateCommunication('bookingRemindersDefault', v)}
            />
          </div>

          {/* Vaccination Reminders */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--bb-color-border-subtle)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--bb-color-bg-elevated)]">
                <Shield className="w-5 h-5 text-[var(--bb-color-text-muted)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--bb-color-text-primary)]">Vaccination Reminders</p>
                <p className="text-sm text-[var(--bb-color-text-muted)]">
                  Alerts when vaccinations are expiring
                </p>
              </div>
            </div>
            <Switch
              checked={communication.vaccinationRemindersDefault}
              onCheckedChange={(v) => updateCommunication('vaccinationRemindersDefault', v)}
            />
          </div>

          {/* Promotional SMS */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--bb-color-border-subtle)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--bb-color-bg-elevated)]">
                <MessageSquare className="w-5 h-5 text-[var(--bb-color-text-muted)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--bb-color-text-primary)]">Promotional SMS</p>
                <p className="text-sm text-[var(--bb-color-text-muted)]">
                  Marketing text messages (carrier rates may apply)
                </p>
              </div>
            </div>
            <select
              value={communication.promotionalSmsDefault}
              onChange={(e) => updateCommunication('promotionalSmsDefault', e.target.value)}
              className="px-3 py-2 rounded-md border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
            >
              <option value="opt-in">Opt-in required</option>
              <option value="opt-out">Subscribed by default</option>
            </select>
          </div>
        </div>
      </Card>

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
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                This action cannot be undone
              </p>
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
            <label className="block text-sm font-medium text-[var(--bb-color-text-primary)] mb-2">
              Type the customer's name to confirm:{' '}
              <strong>
                {selectedCustomer?.name || `${selectedCustomer?.first_name} ${selectedCustomer?.last_name}`}
              </strong>
            </label>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Type customer name here..."
              className="w-full px-3 py-2 rounded-md border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmName('');
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteData}
              loading={isDeleting}
              disabled={!deleteConfirmName.trim()}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Permanently Delete All Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Sub-components

const RetentionSelect = ({ label, description, value, onChange, icon: Icon, recommended }) => (
  <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--bb-color-border-subtle)]">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-[var(--bb-color-bg-elevated)]">
        <Icon className="w-5 h-5 text-[var(--bb-color-text-muted)]" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-[var(--bb-color-text-primary)]">{label}</p>
          {recommended && value !== recommended && (
            <Badge variant="warning" size="sm">Recommended: {RETENTION_OPTIONS[recommended]}</Badge>
          )}
        </div>
        <p className="text-sm text-[var(--bb-color-text-muted)]">{description}</p>
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-md border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)] min-w-[140px]"
    >
      {Object.entries(RETENTION_OPTIONS).map(([key, label]) => (
        <option key={key} value={key}>{label}</option>
      ))}
    </select>
  </div>
);

const VisibilityToggle = ({ label, description, checked, onChange, icon: Icon, recommended }) => (
  <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-[var(--bb-color-border-subtle)]">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-[var(--bb-color-bg-elevated)]">
        <Icon className="w-5 h-5 text-[var(--bb-color-text-muted)]" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-[var(--bb-color-text-primary)]">{label}</p>
          {recommended === false && checked && (
            <Badge variant="warning" size="sm">Recommended: Off</Badge>
          )}
        </div>
        <p className="text-sm text-[var(--bb-color-text-muted)]">{description}</p>
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onChange}
    />
  </div>
);

export default Privacy;
