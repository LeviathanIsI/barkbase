import { useState, useEffect } from 'react';
import {
  X, Save, User, Calendar, Users, CreditCard,
  FileText, Settings, MessageSquare, Phone,
  Check, ChevronDown, Clock, DollarSign
} from 'lucide-react';
import Select from 'react-select';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--bb-color-accent)' : state.isFocused ? 'var(--bb-color-bg-muted)' : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    padding: '8px 12px',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  input: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  placeholder: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
};

const PermissionMatrixModal = ({ member, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    permissions: {
      // Operations
      viewSchedule: false,
      modifySchedule: false,
      checkInPets: false,
      checkOutPets: false,
      createBookings: false,
      cancelBookings: false,
      overrideCapacity: false,
      emergencyAccess: false,
      // Clients & Pets
      viewClientInfo: false,
      editClientInfo: false,
      viewPetRecords: false,
      editPetRecords: false,
      viewVaccination: false,
      overrideVaxRequirements: false,
      addNotes: false,
      deleteRecords: false,
      // Financial
      processPayments: false,
      issueRefunds: false,
      viewPricing: false,
      modifyPricing: false,
      viewReports: false,
      exportFinancialData: false,
      // Staff & Settings
      manageTeam: false,
      viewAllStaff: false,
      modifySettings: false,
      accessIntegrations: false,
      // Communication
      sendMessages: false,
      emailClients: false,
      smsNotifications: false,
      massCommunications: false,
    },
    schedule: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: false },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '', end: '', enabled: false },
      sunday: { start: '', end: '', enabled: false },
    },
    hourlyRate: 18,
    primaryLocation: 'Building A'
  });

  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || '',
        permissions: {
          viewSchedule: member.permissions?.viewSchedule || false,
          modifySchedule: member.permissions?.modifySchedule || false,
          checkInPets: member.permissions?.checkInPets || false,
          checkOutPets: member.permissions?.checkOutPets || false,
          createBookings: member.permissions?.createBookings || false,
          cancelBookings: member.permissions?.cancelBookings || false,
          overrideCapacity: member.permissions?.overrideCapacity || false,
          emergencyAccess: member.permissions?.emergencyAccess || false,
          viewClientInfo: member.permissions?.viewClientInfo || false,
          editClientInfo: member.permissions?.editClientInfo || false,
          viewPetRecords: member.permissions?.viewPetRecords || false,
          editPetRecords: member.permissions?.editPetRecords || false,
          viewVaccination: member.permissions?.viewVaccination || false,
          overrideVaxRequirements: member.permissions?.overrideVaxRequirements || false,
          addNotes: member.permissions?.addNotes || false,
          deleteRecords: member.permissions?.deleteRecords || false,
          processPayments: member.permissions?.processPayments || false,
          issueRefunds: member.permissions?.issueRefunds || false,
          viewPricing: member.permissions?.viewPricing || false,
          modifyPricing: member.permissions?.modifyPricing || false,
          viewReports: member.permissions?.viewReports || false,
          exportFinancialData: member.permissions?.exportFinancialData || false,
          manageTeam: member.permissions?.manageTeam || false,
          viewAllStaff: member.permissions?.viewAllStaff || false,
          modifySettings: member.permissions?.modifySettings || false,
          accessIntegrations: member.permissions?.accessIntegrations || false,
          sendMessages: member.permissions?.sendMessages || false,
          emailClients: member.permissions?.emailClients || false,
          smsNotifications: member.permissions?.smsNotifications || false,
          massCommunications: member.permissions?.massCommunications || false,
        },
        schedule: member.schedule || formData.schedule,
        hourlyRate: member.hourlyRate || 18,
        primaryLocation: member.location || 'Building A'
      });
    }
  }, [member]);

  const roleTemplates = {
    owner: {
      name: 'Owner',
      description: 'Full access to all features',
      permissions: {
        viewSchedule: true, modifySchedule: true, checkInPets: true, checkOutPets: true,
        createBookings: true, cancelBookings: true, overrideCapacity: true, emergencyAccess: true,
        viewClientInfo: true, editClientInfo: true, viewPetRecords: true, editPetRecords: true,
        viewVaccination: true, overrideVaxRequirements: true, addNotes: true, deleteRecords: true,
        processPayments: true, issueRefunds: true, viewPricing: true, modifyPricing: true,
        viewReports: true, exportFinancialData: true, manageTeam: true, viewAllStaff: true,
        modifySettings: true, accessIntegrations: true, sendMessages: true, emailClients: true,
        smsNotifications: true, massCommunications: true,
      }
    },
    manager: {
      name: 'Manager',
      description: 'Operations, clients, and some financial access',
      permissions: {
        viewSchedule: true, modifySchedule: true, checkInPets: true, checkOutPets: true,
        createBookings: true, cancelBookings: true, overrideCapacity: false, emergencyAccess: false,
        viewClientInfo: true, editClientInfo: true, viewPetRecords: true, editPetRecords: true,
        viewVaccination: true, overrideVaxRequirements: false, addNotes: true, deleteRecords: false,
        processPayments: true, issueRefunds: false, viewPricing: true, modifyPricing: false,
        viewReports: true, exportFinancialData: false, manageTeam: false, viewAllStaff: true,
        modifySettings: false, accessIntegrations: false, sendMessages: true, emailClients: true,
        smsNotifications: true, massCommunications: false,
      }
    },
    staff: {
      name: 'Staff',
      description: 'Basic operations and client interaction',
      permissions: {
        viewSchedule: true, modifySchedule: false, checkInPets: true, checkOutPets: true,
        createBookings: false, cancelBookings: false, overrideCapacity: false, emergencyAccess: false,
        viewClientInfo: true, editClientInfo: false, viewPetRecords: true, editPetRecords: false,
        viewVaccination: true, overrideVaxRequirements: false, addNotes: true, deleteRecords: false,
        processPayments: true, issueRefunds: false, viewPricing: true, modifyPricing: false,
        viewReports: false, exportFinancialData: false, manageTeam: false, viewAllStaff: false,
        modifySettings: false, accessIntegrations: false, sendMessages: true, emailClients: false,
        smsNotifications: false, massCommunications: false,
      }
    },
    groomer: {
      name: 'Groomer',
      description: 'Pet care and grooming-specific access',
      permissions: {
        viewSchedule: true, modifySchedule: false, checkInPets: true, checkOutPets: true,
        createBookings: false, cancelBookings: false, overrideCapacity: false, emergencyAccess: false,
        viewClientInfo: true, editClientInfo: false, viewPetRecords: true, editPetRecords: false,
        viewVaccination: true, overrideVaxRequirements: false, addNotes: true, deleteRecords: false,
        processPayments: false, issueRefunds: false, viewPricing: true, modifyPricing: false,
        viewReports: false, exportFinancialData: false, manageTeam: false, viewAllStaff: false,
        modifySettings: false, accessIntegrations: false, sendMessages: true, emailClients: false,
        smsNotifications: false, massCommunications: false,
      }
    }
  };

  const applyTemplate = (templateKey) => {
    if (roleTemplates[templateKey]) {
      setFormData(prev => ({
        ...prev,
        role: roleTemplates[templateKey].name,
        permissions: { ...roleTemplates[templateKey].permissions }
      }));
      setSelectedTemplate(templateKey);
      setShowTemplateDropdown(false);
    }
  };

  const updatePermission = (permissionKey, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: value
      }
    }));
  };

  const updateSchedule = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const permissionCategories = [
    {
      title: 'Operations',
      icon: Calendar,
      permissions: [
        { key: 'viewSchedule', label: 'View schedule' },
        { key: 'modifySchedule', label: 'Modify schedule' },
        { key: 'checkInPets', label: 'Check-in pets' },
        { key: 'checkOutPets', label: 'Check-out pets' },
        { key: 'createBookings', label: 'Create bookings' },
        { key: 'cancelBookings', label: 'Cancel bookings' },
        { key: 'overrideCapacity', label: 'Override capacity' },
        { key: 'emergencyAccess', label: 'Emergency access' },
      ]
    },
    {
      title: 'Clients & Pets',
      icon: Users,
      permissions: [
        { key: 'viewClientInfo', label: 'View client info' },
        { key: 'editClientInfo', label: 'Edit client info' },
        { key: 'viewPetRecords', label: 'View pet records' },
        { key: 'editPetRecords', label: 'Edit pet records' },
        { key: 'viewVaccination', label: 'View vaccination' },
        { key: 'overrideVaxRequirements', label: 'Override vax requirements' },
        { key: 'addNotes', label: 'Add notes' },
        { key: 'deleteRecords', label: 'Delete records' },
      ]
    },
    {
      title: 'Financial',
      icon: CreditCard,
      permissions: [
        { key: 'processPayments', label: 'Process payments' },
        { key: 'issueRefunds', label: 'Issue refunds' },
        { key: 'viewPricing', label: 'View pricing' },
        { key: 'modifyPricing', label: 'Modify pricing' },
        { key: 'viewReports', label: 'View reports' },
        { key: 'exportFinancialData', label: 'Export financial data' },
      ]
    },
    {
      title: 'Staff & Settings',
      icon: Settings,
      permissions: [
        { key: 'manageTeam', label: 'Manage team' },
        { key: 'viewAllStaff', label: 'View all staff' },
        { key: 'modifySettings', label: 'Modify settings' },
        { key: 'accessIntegrations', label: 'Access integrations' },
      ]
    },
    {
      title: 'Communication',
      icon: MessageSquare,
      permissions: [
        { key: 'sendMessages', label: 'Send messages' },
        { key: 'emailClients', label: 'Email clients' },
        { key: 'smsNotifications', label: 'SMS notifications' },
        { key: 'massCommunications', label: 'Mass communications' },
      ]
    }
  ];

  const daysOfWeek = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center gap-4">
            <Avatar size="lg" fallback={formData.name} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Edit Team Member</h2>
              <p className="text-gray-600 dark:text-text-secondary">{formData.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Role</label>
                <Select
                  options={[
                    { value: 'Owner', label: 'Owner' },
                    { value: 'Manager', label: 'Manager' },
                    { value: 'Staff', label: 'Staff' },
                    { value: 'Groomer', label: 'Groomer' },
                    { value: 'Trainer', label: 'Trainer' },
                  ]}
                  value={[
                    { value: 'Owner', label: 'Owner' },
                    { value: 'Manager', label: 'Manager' },
                    { value: 'Staff', label: 'Staff' },
                    { value: 'Groomer', label: 'Groomer' },
                    { value: 'Trainer', label: 'Trainer' },
                  ].find(o => o.value === formData.role) || null}
                  onChange={(opt) => setFormData(prev => ({ ...prev, role: opt?.value || '' }))}
                  placeholder="Select Role"
                  isClearable={false}
                  isSearchable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>
          </div>

          {/* Role Templates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Permissions</h3>
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  className="flex items-center gap-2"
                >
                  Use Role Template
                  <ChevronDown className="w-4 h-4" />
                </Button>
                {showTemplateDropdown && (
                  <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-md shadow-lg z-20">
                    {Object.entries(roleTemplates).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => applyTemplate(key)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-600 dark:text-text-secondary">{template.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="space-y-6">
              {permissionCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.title} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {category.title}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.permissions.map((permission) => (
                        <label key={permission.key} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.permissions[permission.key]}
                            onChange={(e) => updatePermission(permission.key, e.target.checked)}
                            className="rounded border-gray-300 dark:border-surface-border"
                          />
                          <span className="text-sm">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule & Availability */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Schedule & Availability
            </h3>
            <div className="space-y-3">
              {daysOfWeek.map((day) => (
                <div key={day.key} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-surface-border rounded-lg">
                  <div className="w-16 text-sm font-medium">{day.label}</div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.schedule[day.key].enabled}
                      onChange={(e) => updateSchedule(day.key, 'enabled', e.target.checked)}
                      className="rounded border-gray-300 dark:border-surface-border"
                    />
                    <span className="text-sm">Available</span>
                  </label>
                  {formData.schedule[day.key].enabled && (
                    <>
                      <input
                        type="time"
                        value={formData.schedule[day.key].start}
                        onChange={(e) => updateSchedule(day.key, 'start', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-surface-border rounded"
                      />
                      <span className="text-sm text-gray-500 dark:text-text-secondary">to</span>
                      <input
                        type="time"
                        value={formData.schedule[day.key].end}
                        onChange={(e) => updateSchedule(day.key, 'end', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-surface-border rounded"
                      />
                    </>
                  )}
                  {!formData.schedule[day.key].enabled && (
                    <span className="text-sm text-gray-500 dark:text-text-secondary italic">Not scheduled</span>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Hourly Rate
                </label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Primary Location</label>
                <Select
                  options={[
                    { value: 'Building A', label: 'Building A' },
                    { value: 'Building B', label: 'Building B' },
                    { value: 'Mobile', label: 'Mobile' },
                  ]}
                  value={[
                    { value: 'Building A', label: 'Building A' },
                    { value: 'Building B', label: 'Building B' },
                    { value: 'Mobile', label: 'Mobile' },
                  ].find(o => o.value === formData.primaryLocation) || null}
                  onChange={(opt) => setFormData(prev => ({ ...prev, primaryLocation: opt?.value || 'Building A' }))}
                  isClearable={false}
                  isSearchable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PermissionMatrixModal;
