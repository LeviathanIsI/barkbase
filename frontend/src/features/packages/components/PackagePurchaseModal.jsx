import { useState, useMemo } from 'react';
import SlidePanel from '@/components/ui/SlidePanel';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useCreatePackageMutation } from '../api';
import { formatCurrency } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import {
  CreditCard,
  Package,
  RefreshCw,
  Calendar,
  Check,
  Plus,
  Minus,
} from 'lucide-react';

const PACKAGE_TYPES = [
  { value: 'credit', label: 'Credit/Visit', icon: CreditCard, description: 'Buy X visits at a discount' },
  { value: 'bundle', label: 'Bundle', icon: Package, description: 'Combine services at a discount' },
  { value: 'subscription', label: 'Subscription', icon: RefreshCw, description: 'Recurring package' },
  { value: 'time_based', label: 'Time-Based', icon: Calendar, description: 'Valid for a period' },
];

const BILLING_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

// Mock services - in real app, fetch from API
const AVAILABLE_SERVICES = [
  { id: '1', name: 'Daycare (Full Day)', priceCents: 4500 },
  { id: '2', name: 'Daycare (Half Day)', priceCents: 2500 },
  { id: '3', name: 'Boarding (Per Night)', priceCents: 6500 },
  { id: '4', name: 'Grooming - Basic', priceCents: 5000 },
  { id: '5', name: 'Grooming - Full', priceCents: 8500 },
  { id: '6', name: 'Training Session', priceCents: 7500 },
  { id: '7', name: 'Nail Trim', priceCents: 1500 },
  { id: '8', name: 'Bath', priceCents: 3000 },
];

const PackagePurchaseModal = ({ open, onClose, ownerId, ownerName }) => {
  const tz = useTimezoneUtils();

  // Form state
  const [packageType, setPackageType] = useState('credit');
  const [name, setName] = useState('');

  // Credit package fields
  const [credits, setCredits] = useState(10);
  const [price, setPrice] = useState(100); // Store in dollars

  // Bundle/Subscription/Time-based fields
  const [selectedServices, setSelectedServices] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(10);

  // Subscription fields
  const [billingFrequency, setBillingFrequency] = useState('monthly');

  // Date fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const createMutation = useCreatePackageMutation();

  // Calculate totals for bundle packages
  const bundleCalculations = useMemo(() => {
    const subtotal = selectedServices.reduce((sum, svc) => {
      return sum + (svc.priceCents * svc.quantity);
    }, 0);
    const discount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }, [selectedServices, discountPercent]);

  // Credit package savings calculation
  const creditSavings = useMemo(() => {
    if (credits <= 0) return 0;
    const pricePerCredit = Math.round((price * 100) / credits);
    // Assume $100 per credit is the baseline
    return Math.round((10000 - pricePerCredit) / 100);
  }, [credits, price]);

  const handleServiceToggle = (service) => {
    setSelectedServices(prev => {
      const existing = prev.find(s => s.id === service.id);
      if (existing) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const handleServiceQuantity = (serviceId, delta) => {
    setSelectedServices(prev =>
      prev.map(s => {
        if (s.id === serviceId) {
          const newQty = Math.max(1, s.quantity + delta);
          return { ...s, quantity: newQty };
        }
        return s;
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const baseData = {
      ownerId,
      packageType,
      name: name || getDefaultName(),
    };

    let submitData = { ...baseData };

    switch (packageType) {
      case 'credit':
        submitData = {
          ...submitData,
          creditsPurchased: credits,
          priceInCents: Math.round(price * 100),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        };
        break;

      case 'bundle':
        submitData = {
          ...submitData,
          services: selectedServices.map(s => ({ serviceId: s.id, quantity: s.quantity })),
          priceInCents: bundleCalculations.total,
          discountPercent,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        };
        break;

      case 'subscription':
        submitData = {
          ...submitData,
          services: selectedServices.map(s => ({ serviceId: s.id, quantity: s.quantity })),
          priceInCents: bundleCalculations.total,
          discountPercent,
          billingFrequency,
          startDate: startDate ? new Date(startDate).toISOString() : null,
        };
        break;

      case 'time_based':
        submitData = {
          ...submitData,
          services: selectedServices.map(s => ({ serviceId: s.id, quantity: s.quantity })),
          priceInCents: bundleCalculations.total,
          discountPercent,
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
        };
        break;
    }

    try {
      await createMutation.mutateAsync(submitData);
      toast.success('Package created successfully');
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to create package');
    }
  };

  const getDefaultName = () => {
    switch (packageType) {
      case 'credit':
        return `${credits}-Visit Package`;
      case 'bundle':
        return 'Custom Bundle';
      case 'subscription':
        return `${billingFrequency.charAt(0).toUpperCase() + billingFrequency.slice(1)} Subscription`;
      case 'time_based':
        return 'Seasonal Package';
      default:
        return 'Package';
    }
  };

  const resetForm = () => {
    setPackageType('credit');
    setName('');
    setCredits(10);
    setPrice(100);
    setSelectedServices([]);
    setDiscountPercent(10);
    setBillingFrequency('monthly');
    setStartDate('');
    setEndDate('');
    setExpiresAt('');
  };

  const isValid = () => {
    switch (packageType) {
      case 'credit':
        return credits > 0 && price > 0;
      case 'bundle':
        return selectedServices.length > 0;
      case 'subscription':
        return selectedServices.length > 0 && billingFrequency && startDate;
      case 'time_based':
        return selectedServices.length > 0 && startDate && endDate;
      default:
        return false;
    }
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title={ownerName ? `Create Package for ${ownerName}` : 'Create Package'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Package Type Selector */}
        <div>
          <label className="block text-sm font-medium text-text mb-3">Package Type</label>
          <div className="grid grid-cols-2 gap-2">
            {PACKAGE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = packageType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setPackageType(type.value);
                    setSelectedServices([]);
                  }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-surface'
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary text-white' : 'bg-surface text-muted'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-text')}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted">{type.description}</p>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Package Name */}
        <Input
          label="Package Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={getDefaultName()}
        />

        {/* CREDIT PACKAGE FIELDS */}
        {packageType === 'credit' && (
          <>
            <Input
              label="Number of Credits"
              type="number"
              min="1"
              max="100"
              value={credits}
              onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
              helper="1 credit = 1 daycare/boarding visit"
              required
            />

            <Input
              label="Total Package Price ($)"
              type="number"
              min="0"
              step="100"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              helper={`$${price.toFixed(2)} ($${(price / credits).toFixed(2)} per credit)`}
              required
            />

            {creditSavings > 0 && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <p className="text-sm text-success font-medium">
                  Saves ${creditSavings} per credit vs. regular pricing
                </p>
              </div>
            )}

            <Input
              label="Expiration Date (Optional)"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              helper="Leave blank for no expiration"
            />
          </>
        )}

        {/* BUNDLE PACKAGE FIELDS */}
        {packageType === 'bundle' && (
          <>
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Select Services <span className="text-danger">*</span>
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
                {AVAILABLE_SERVICES.map((service) => {
                  const selected = selectedServices.find(s => s.id === service.id);
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg transition-colors',
                        selected ? 'bg-primary/10' : 'hover:bg-surface'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleServiceToggle(service)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center',
                          selected ? 'bg-primary border-primary' : 'border-border'
                        )}>
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm text-text">{service.name}</span>
                        <span className="text-xs text-muted">{formatCurrency(service.priceCents)}</span>
                      </button>
                      {selected && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleServiceQuantity(service.id, -1)}
                            className="h-6 w-6 rounded bg-surface flex items-center justify-center hover:bg-surface-hover"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm">{selected.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleServiceQuantity(service.id, 1)}
                            className="h-6 w-6 rounded bg-surface flex items-center justify-center hover:bg-surface-hover"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Input
              label="Discount Percentage"
              type="number"
              min="0"
              max="50"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
              helper="Discount applied to bundle total"
            />

            {selectedServices.length > 0 && (
              <div className="bg-surface rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatCurrency(bundleCalculations.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-success">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatCurrency(bundleCalculations.discount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(bundleCalculations.total)}</span>
                </div>
              </div>
            )}

            <Input
              label="Expiration Date (Optional)"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </>
        )}

        {/* SUBSCRIPTION PACKAGE FIELDS */}
        {packageType === 'subscription' && (
          <>
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Select Services <span className="text-danger">*</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {AVAILABLE_SERVICES.map((service) => {
                  const selected = selectedServices.find(s => s.id === service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleServiceToggle(service)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                        selected ? 'bg-primary/10' : 'hover:bg-surface'
                      )}
                    >
                      <div className={cn(
                        'h-5 w-5 rounded border flex items-center justify-center',
                        selected ? 'bg-primary border-primary' : 'border-border'
                      )}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm text-text flex-1">{service.name}</span>
                      <span className="text-xs text-muted">{formatCurrency(service.priceCents)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Billing Frequency <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {BILLING_FREQUENCIES.map((freq) => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() => setBillingFrequency(freq.value)}
                    className={cn(
                      'py-2 px-3 rounded-lg border text-sm transition-colors',
                      billingFrequency === freq.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Discount Percentage"
              type="number"
              min="0"
              max="50"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
            />

            {selectedServices.length > 0 && (
              <div className="bg-surface rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatCurrency(bundleCalculations.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-success">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatCurrency(bundleCalculations.discount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
                  <span>Total (charged {billingFrequency})</span>
                  <span>{formatCurrency(bundleCalculations.total)}</span>
                </div>
              </div>
            )}

            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </>
        )}

        {/* TIME-BASED PACKAGE FIELDS */}
        {packageType === 'time_based' && (
          <>
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Select Services <span className="text-danger">*</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {AVAILABLE_SERVICES.map((service) => {
                  const selected = selectedServices.find(s => s.id === service.id);
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg transition-colors',
                        selected ? 'bg-primary/10' : 'hover:bg-surface'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleServiceToggle(service)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center',
                          selected ? 'bg-primary border-primary' : 'border-border'
                        )}>
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className="text-sm text-text">{service.name}</span>
                      </button>
                      {selected && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleServiceQuantity(service.id, -1)}
                            className="h-6 w-6 rounded bg-surface flex items-center justify-center hover:bg-surface-hover"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm">{selected.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleServiceQuantity(service.id, 1)}
                            className="h-6 w-6 rounded bg-surface flex items-center justify-center hover:bg-surface-hover"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <Input
              label="Discount Percentage"
              type="number"
              min="0"
              max="50"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
            />

            {selectedServices.length > 0 && (
              <div className="bg-surface rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatCurrency(bundleCalculations.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-success">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatCurrency(bundleCalculations.discount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(bundleCalculations.total)}</span>
                </div>
              </div>
            )}

            {startDate && endDate && (
              <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                <p className="text-sm text-info">
                  Package valid from {tz.formatShortDate(startDate)} to {tz.formatShortDate(endDate)}
                </p>
              </div>
            )}
          </>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={createMutation.isPending || !isValid()}
            className="flex-1"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Package'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </SlidePanel>
  );
};

export default PackagePurchaseModal;
