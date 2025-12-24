import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SlideoutPanel from '@/components/SlideoutPanel';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import StyledSelect from '@/components/ui/StyledSelect';
import {
  usePackageTemplatesQuery,
  useCreatePackageTemplateMutation,
  useUpdatePackageTemplateMutation,
  useDeletePackageTemplateMutation,
  useAddOnServicesQuery,
  useCreateAddOnServiceMutation,
  useUpdateAddOnServiceMutation,
  useDeleteAddOnServiceMutation,
} from '../api';
import {
  Ticket,
  Plus,
  Pencil,
  Archive,
  Sparkles,
  Bath,
  Bone,
  Pill,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Service type options
const SERVICE_TYPES = [
  { value: '', label: 'All Services' },
  { value: 'daycare', label: 'Daycare' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'training', label: 'Training' },
];

// Price type options for add-ons
const PRICE_TYPES = [
  { value: 'flat', label: 'Flat Rate' },
  { value: 'per_day', label: 'Per Day' },
  { value: 'per_night', label: 'Per Night' },
];

// Format cents to dollars
const formatPrice = (cents) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

// Calculate per-credit price
const getPerCreditPrice = (priceInCents, credits) => {
  if (!credits || credits === 0) return 0;
  return priceInCents / credits;
};

// Get icon for add-on
const getAddOnIcon = (name) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('bath')) return Bath;
  if (lowerName.includes('play') || lowerName.includes('bone')) return Bone;
  if (lowerName.includes('med') || lowerName.includes('pill')) return Pill;
  return Sparkles;
};

// Items per page for pagination
const ITEMS_PER_PAGE = 5;

const ProductsServices = () => {
  // Queries
  const { data: packages = [], isLoading: isLoadingPackages } = usePackageTemplatesQuery();
  const { data: addons = [], isLoading: isLoadingAddons } = useAddOnServicesQuery();

  // Mutations
  const createPackageMutation = useCreatePackageTemplateMutation();
  const updatePackageMutation = useUpdatePackageTemplateMutation();
  const deletePackageMutation = useDeletePackageTemplateMutation();
  const createAddonMutation = useCreateAddOnServiceMutation();
  const updateAddonMutation = useUpdateAddOnServiceMutation();
  const deleteAddonMutation = useDeleteAddOnServiceMutation();

  // Modal state
  const [packageModal, setPackageModal] = useState({ open: false, editing: null });
  const [addonModal, setAddonModal] = useState({ open: false, editing: null });

  // Pagination state
  const [packagePage, setPackagePage] = useState(1);
  const [addonPage, setAddonPage] = useState(1);

  // Paginated data
  const packagesTotalPages = Math.ceil(packages.length / ITEMS_PER_PAGE);
  const paginatedPackages = packages.slice(
    (packagePage - 1) * ITEMS_PER_PAGE,
    packagePage * ITEMS_PER_PAGE
  );

  const addonsTotalPages = Math.ceil(addons.length / ITEMS_PER_PAGE);
  const paginatedAddons = addons.slice(
    (addonPage - 1) * ITEMS_PER_PAGE,
    addonPage * ITEMS_PER_PAGE
  );

  // Package form state
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    totalCredits: '',
    priceInCents: '',
    expiresInDays: '',
    neverExpires: false,
    serviceType: '',
    isActive: true,
  });

  // Add-on form state
  const [addonForm, setAddonForm] = useState({
    name: '',
    description: '',
    priceInCents: '',
    priceType: 'flat',
    appliesTo: [],
    isActive: true,
  });

  // Open package modal for create/edit
  const openPackageModal = (pkg = null) => {
    if (pkg) {
      setPackageForm({
        name: pkg.name || '',
        description: pkg.description || '',
        totalCredits: pkg.total_credits?.toString() || '',
        priceInCents: (pkg.price_in_cents / 100)?.toString() || '',
        expiresInDays: pkg.expires_in_days?.toString() || '',
        neverExpires: !pkg.expires_in_days,
        serviceType: pkg.service_type || '',
        isActive: pkg.is_active !== false,
      });
      setPackageModal({ open: true, editing: pkg });
    } else {
      setPackageForm({
        name: '',
        description: '',
        totalCredits: '',
        priceInCents: '',
        expiresInDays: '90',
        neverExpires: false,
        serviceType: '',
        isActive: true,
      });
      setPackageModal({ open: true, editing: null });
    }
  };

  // Open add-on modal for create/edit
  const openAddonModal = (addon = null) => {
    if (addon) {
      setAddonForm({
        name: addon.name || '',
        description: addon.description || '',
        priceInCents: (addon.price_in_cents / 100)?.toString() || '',
        priceType: addon.price_type || 'flat',
        appliesTo: addon.applies_to || [],
        isActive: addon.is_active !== false,
      });
      setAddonModal({ open: true, editing: addon });
    } else {
      setAddonForm({
        name: '',
        description: '',
        priceInCents: '',
        priceType: 'flat',
        appliesTo: [],
        isActive: true,
      });
      setAddonModal({ open: true, editing: null });
    }
  };

  // Save package
  const handleSavePackage = async () => {
    if (!packageForm.name || !packageForm.totalCredits || !packageForm.priceInCents) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data = {
      name: packageForm.name,
      description: packageForm.description || null,
      totalCredits: parseInt(packageForm.totalCredits, 10),
      priceInCents: Math.round(parseFloat(packageForm.priceInCents) * 100),
      expiresInDays: packageForm.neverExpires ? null : parseInt(packageForm.expiresInDays, 10) || null,
      serviceType: packageForm.serviceType || null,
      isActive: packageForm.isActive,
    };

    try {
      if (packageModal.editing) {
        await updatePackageMutation.mutateAsync({ id: packageModal.editing.id, ...data });
        toast.success('Package updated');
      } else {
        await createPackageMutation.mutateAsync(data);
        toast.success('Package created');
      }
      setPackageModal({ open: false, editing: null });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save package');
    }
  };

  // Save add-on
  const handleSaveAddon = async () => {
    if (!addonForm.name || !addonForm.priceInCents) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data = {
      name: addonForm.name,
      description: addonForm.description || null,
      priceInCents: Math.round(parseFloat(addonForm.priceInCents) * 100),
      priceType: addonForm.priceType,
      appliesTo: addonForm.appliesTo.length > 0 ? addonForm.appliesTo : null,
      isActive: addonForm.isActive,
    };

    try {
      if (addonModal.editing) {
        await updateAddonMutation.mutateAsync({ id: addonModal.editing.id, ...data });
        toast.success('Add-on updated');
      } else {
        await createAddonMutation.mutateAsync(data);
        toast.success('Add-on created');
      }
      setAddonModal({ open: false, editing: null });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save add-on');
    }
  };

  // Archive/restore package
  const handleTogglePackageActive = async (pkg) => {
    try {
      if (pkg.is_active) {
        await deletePackageMutation.mutateAsync(pkg.id);
        toast.success('Package archived');
      } else {
        await updatePackageMutation.mutateAsync({ id: pkg.id, isActive: true });
        toast.success('Package restored');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update package');
    }
  };

  // Archive/restore add-on
  const handleToggleAddonActive = async (addon) => {
    try {
      if (addon.is_active) {
        await deleteAddonMutation.mutateAsync(addon.id);
        toast.success('Add-on archived');
      } else {
        await updateAddonMutation.mutateAsync({ id: addon.id, isActive: true });
        toast.success('Add-on restored');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update add-on');
    }
  };

  // Toggle service type in add-on form
  const toggleServiceType = (serviceType) => {
    setAddonForm((prev) => ({
      ...prev,
      appliesTo: prev.appliesTo.includes(serviceType)
        ? prev.appliesTo.filter((s) => s !== serviceType)
        : [...prev.appliesTo, serviceType],
    }));
  };

  // Calculate per-credit display
  const perCreditPrice = packageForm.totalCredits && packageForm.priceInCents
    ? getPerCreditPrice(parseFloat(packageForm.priceInCents) * 100, parseInt(packageForm.totalCredits, 10))
    : 0;

  return (
    <div className="space-y-6">
      {/* Two-column layout for Packages & Add-Ons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Packages Column */}
        <Card
          title="Packages"
          description="Prepaid service bundles for your customers"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => openPackageModal()}>
              <Plus className="h-4 w-4 mr-1" />New
            </Button>
          }
        >
          {isLoadingPackages ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-surface-secondary rounded-lg" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-surface-border rounded-lg">
              <Ticket className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-text-secondary mb-4">No packages yet</p>
              <Button size="sm" onClick={() => openPackageModal()}>
                <Plus className="h-4 w-4 mr-1" />Create First Package
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      pkg.is_active
                        ? 'bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border'
                        : 'bg-gray-50/50 dark:bg-surface-secondary/50 border-gray-200/50 dark:border-surface-border/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex-shrink-0">
                        <Ticket className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{pkg.name}</span>
                          {!pkg.is_active && <Badge variant="default" size="sm">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-text-secondary">
                          {formatPrice(pkg.price_in_cents)} • {pkg.total_credits} credits
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openPackageModal(pkg)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleTogglePackageActive(pkg)}>
                        {pkg.is_active ? <Archive className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Pagination */}
              {packagesTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-surface-border mt-3">
                  <p className="text-xs text-gray-500 dark:text-text-secondary">
                    {(packagePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(packagePage * ITEMS_PER_PAGE, packages.length)} of {packages.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPackagePage((p) => Math.max(1, p - 1))}
                      disabled={packagePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPackagePage((p) => Math.min(packagesTotalPages, p + 1))}
                      disabled={packagePage === packagesTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Add-On Services Column */}
        <Card
          title="Add-On Services"
          description="Extra services customers can add to bookings"
          headerAction={
            <Button variant="primary" size="sm" onClick={() => openAddonModal()}>
              <Plus className="h-4 w-4 mr-1" />New
            </Button>
          }
        >
          {isLoadingAddons ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-surface-secondary rounded-lg" />
              ))}
            </div>
          ) : addons.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-surface-border rounded-lg">
              <Sparkles className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-text-secondary mb-4">No add-on services yet</p>
              <Button size="sm" onClick={() => openAddonModal()}>
                <Plus className="h-4 w-4 mr-1" />Create First Add-On
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedAddons.map((addon) => {
                  const IconComponent = getAddOnIcon(addon.name);
                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        addon.is_active
                          ? 'bg-gray-50 dark:bg-surface-secondary border-gray-200 dark:border-surface-border'
                          : 'bg-gray-50/50 dark:bg-surface-secondary/50 border-gray-200/50 dark:border-surface-border/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                          <IconComponent className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{addon.name}</span>
                            {!addon.is_active && <Badge variant="default" size="sm">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-text-secondary">
                            {formatPrice(addon.price_in_cents)}
                            {addon.price_type !== 'flat' && ` / ${addon.price_type === 'per_day' ? 'day' : 'night'}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openAddonModal(addon)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleAddonActive(addon)}>
                          {addon.is_active ? <Archive className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Pagination */}
              {addonsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-surface-border mt-3">
                  <p className="text-xs text-gray-500 dark:text-text-secondary">
                    {(addonPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(addonPage * ITEMS_PER_PAGE, addons.length)} of {addons.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddonPage((p) => Math.max(1, p - 1))}
                      disabled={addonPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddonPage((p) => Math.min(addonsTotalPages, p + 1))}
                      disabled={addonPage === addonsTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Package Slideout */}
      <SlideoutPanel
        isOpen={packageModal.open}
        onClose={() => setPackageModal({ open: false, editing: null })}
        title={packageModal.editing ? 'Edit Package' : 'Create Package'}
        description={packageModal.editing ? 'Update package details' : 'Create a new prepaid package for customers'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPackageModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePackage}
              loading={createPackageMutation.isPending || updatePackageMutation.isPending}
            >
              {packageModal.editing ? 'Save Changes' : 'Create Package'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Package Name *</label>
            <Input
              value={packageForm.name}
              onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., 10 Daycare Days"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              value={packageForm.description}
              onChange={(e) => setPackageForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Buy 10 days, save 20%!"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Number of Credits *</label>
              <Input
                type="number"
                min="1"
                value={packageForm.totalCredits}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, totalCredits: e.target.value }))}
                placeholder="10"
              />
              <p className="text-xs text-gray-500 dark:text-text-muted mt-1">Days/visits included</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={packageForm.priceInCents}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, priceInCents: e.target.value }))}
                  placeholder="220.00"
                  className="pl-7"
                />
              </div>
              {perCreditPrice > 0 && (
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  {formatPrice(perCreditPrice)} per credit
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Expiration</label>
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                type="number"
                min="1"
                value={packageForm.expiresInDays}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, expiresInDays: e.target.value }))}
                placeholder="90"
                disabled={packageForm.neverExpires}
                className="w-24"
              />
              <span className="text-sm text-gray-500">days from purchase</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={packageForm.neverExpires}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, neverExpires: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-500">Never expires</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Applies to Service</label>
            <StyledSelect
              options={SERVICE_TYPES}
              value={packageForm.serviceType}
              onChange={(opt) => setPackageForm((prev) => ({ ...prev, serviceType: opt?.value || '' }))}
              isClearable={false}
              isSearchable={false}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium">Active</span>
              <p className="text-sm text-gray-500 dark:text-text-secondary">Available for purchase</p>
            </div>
            <Switch
              checked={packageForm.isActive}
              onChange={(checked) => setPackageForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>
      </SlideoutPanel>

      {/* Add-On Slideout */}
      <SlideoutPanel
        isOpen={addonModal.open}
        onClose={() => setAddonModal({ open: false, editing: null })}
        title={addonModal.editing ? 'Edit Add-On Service' : 'Create Add-On Service'}
        description={addonModal.editing ? 'Update add-on service details' : 'Create a new add-on service for bookings'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddonModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAddon}
              loading={createAddonMutation.isPending || updateAddonMutation.isPending}
            >
              {addonModal.editing ? 'Save Changes' : 'Create Add-On'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <Input
              value={addonForm.name}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Exit Bath"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              value={addonForm.description}
              onChange={(e) => setAddonForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Quick bath before pickup"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addonForm.priceInCents}
                  onChange={(e) => setAddonForm((prev) => ({ ...prev, priceInCents: e.target.value }))}
                  placeholder="15.00"
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Price Type</label>
              <StyledSelect
                options={PRICE_TYPES}
                value={addonForm.priceType}
                onChange={(opt) => setAddonForm((prev) => ({ ...prev, priceType: opt?.value || 'flat' }))}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Applies to Services</label>
            <p className="text-xs text-gray-500 dark:text-text-muted mb-3">Leave empty for all services</p>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.filter(s => s.value).map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleServiceType(type.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    addonForm.appliesTo.includes(type.value)
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 dark:bg-surface-secondary border-gray-200 dark:border-surface-border text-gray-600 dark:text-text-secondary hover:bg-gray-200 dark:hover:bg-surface-elevated'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <div>
              <span className="font-medium">Active</span>
              <p className="text-sm text-gray-500 dark:text-text-secondary">Available to add to bookings</p>
            </div>
            <Switch
              checked={addonForm.isActive}
              onChange={(checked) => setAddonForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>
      </SlideoutPanel>
    </div>
  );
};

export default ProductsServices;
