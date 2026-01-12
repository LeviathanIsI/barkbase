/**
 * Invoices - Full-featured invoicing command center
 * Modeled after QuickBooks Online, Stripe Invoicing, and enterprise billing
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isPast, differenceInDays } from 'date-fns';
import {
  FileText,
  Mail,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  Edit3,
  Send,
  Trash2,
  Ban,
  Loader2,
  User,
  PawPrint,
  Calendar,
  RefreshCw,
  Printer,
  Receipt,
  X,
  CreditCard,
  Activity,
  FileCheck,
  FileClock,
  AlertCircle,
  CircleDollarSign,
  Wallet,
  TrendingUp,
  BarChart3,
  Zap,
  History,
  Percent,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import SlidePanel from '@/components/ui/SlidePanel';
import SlideOutDrawer from '@/components/ui/SlideOutDrawer';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StyledSelect from '@/components/ui/StyledSelect';
import Textarea from '@/components/ui/Textarea';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
// Premium sidebar components
import {
  SummaryPanel,
  SummaryPanelHeader,
  SummaryPanelBody,
  SummaryStatRow,
  SummaryStatStack,
  SummaryProgressBar,
  SummaryDivider,
  SummaryActivityItem,
  SummaryActivityList,
  SummaryQuickAction,
  SummaryQuickActions,
  SummaryHighlight,
} from '@/components/ui/SummaryPanel';
// Business invoices = tenant billing pet owners (NOT platform billing)
import { useBusinessInvoicesQuery, useSendInvoiceEmailMutation, useMarkInvoicePaidMutation, useCreateInvoiceMutation, useVoidInvoiceMutation } from '../api';
import { useOwnersQuery } from '@/features/owners/api';
import { usePetsQuery } from '@/features/pets/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import PetQuickActionsDrawer from '@/features/owners/components/PetQuickActionsDrawer';

// Status configurations
const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'neutral', icon: FileText },
  finalized: { label: 'Finalized', variant: 'info', icon: FileCheck },
  sent: { label: 'Sent', variant: 'accent', icon: Send },
  viewed: { label: 'Viewed', variant: 'warning', icon: Eye },
  paid: { label: 'Paid', variant: 'success', icon: CheckCircle },
  overdue: { label: 'Overdue', variant: 'danger', icon: AlertTriangle },
  void: { label: 'Void', variant: 'neutral', icon: Ban },
};

// Status actions based on current status
const getStatusActions = (status) => {
  switch (status) {
    case 'draft':
      return [
        { action: 'send', label: 'Send to Customer', icon: Send },
        { action: 'edit', label: 'Edit Invoice', icon: Edit3 },
        { action: 'void', label: 'Delete Draft', icon: Trash2 },
      ];
    case 'sent':
    case 'viewed':
    case 'overdue':
      return [
        { action: 'markPaid', label: 'Mark as Paid', icon: CheckCircle },
        { action: 'sendReminder', label: 'Send Reminder', icon: Mail },
        { action: 'view', label: 'View Invoice', icon: Eye },
        { action: 'void', label: 'Void Invoice', icon: Ban },
      ];
    case 'paid':
      return [
        { action: 'sendReceipt', label: 'Send Receipt', icon: Receipt },
        { action: 'view', label: 'View Invoice', icon: Eye },
        { action: 'refund', label: 'Process Refund', icon: RefreshCw },
      ];
    case 'void':
      return [
        { action: 'view', label: 'View Invoice', icon: Eye },
      ];
    default:
      return [{ action: 'view', label: 'View Invoice', icon: Eye }];
  }
};

// Status colors for consistent styling
const STATUS_COLORS = {
  draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: '#6B7280' },
  finalized: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: '#3B82F6' },
  sent: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: '#8B5CF6' },
  viewed: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: '#F59E0B' },
  paid: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: '#10B981' },
  overdue: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: '#EF4444' },
  void: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: '#9CA3AF' },
};

// Clickable Status Badge with Dropdown - Enhanced Design
const StatusBadgeDropdown = ({ invoice, effectiveStatus, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const status = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.draft;
  const colors = STATUS_COLORS[effectiveStatus] || STATUS_COLORS.draft;
  const StatusIcon = status.icon;
  const actions = getStatusActions(effectiveStatus);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleAction = (action) => {
    setIsOpen(false);
    onAction(action, invoice);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
          colors.bg,
          colors.text,
          'hover:shadow-sm hover:ring-2 hover:ring-offset-1 hover:ring-[var(--bb-color-accent)]/20',
          isOpen && 'ring-2 ring-offset-1 ring-[var(--bb-color-accent)]/30 shadow-sm'
        )}
        title="Click for actions"
      >
        {/* Status dot indicator */}
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            effectiveStatus === 'paid' && 'animate-none',
            (effectiveStatus === 'overdue' || effectiveStatus === 'viewed') && 'animate-pulse'
          )}
          style={{ backgroundColor: colors.dot }}
        />
        {status.label}
        {/* Dropdown indicator */}
        <ChevronDown className={cn(
          'h-3 w-3 opacity-60 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 w-48 rounded-xl border shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 bg-[var(--bb-color-bg-elevated)]"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <div className="px-3 py-2 border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)]">
            <p className="text-xs font-semibold text-[var(--bb-color-text-muted)] uppercase tracking-wide">Actions</p>
          </div>
          <div className="py-1">
            {actions.map((item) => {
              const ActionIcon = item.icon;
              const isPrimary = item.action === 'markPaid';
              const isDanger = item.action === 'void';

              return (
                <button
                  key={item.action}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(item.action);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                    isPrimary && 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
                    isDanger && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
                    !isPrimary && !isDanger && 'text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]'
                  )}
                >
                  <ActionIcon className={cn(
                    'h-4 w-4',
                    isPrimary && 'text-emerald-600',
                    isDanger && 'text-red-500',
                    item.action === 'send' && 'text-blue-500',
                    item.action === 'sendReminder' && 'text-amber-500',
                    item.action === 'sendReceipt' && 'text-purple-500',
                    item.action === 'view' && 'text-[var(--bb-color-text-muted)]',
                    item.action === 'edit' && 'text-[var(--bb-color-text-muted)]'
                  )} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// KPI Tile Component with enhanced visual hierarchy
const KPITile = ({ icon: Icon, label, value, subtext, variant = 'default', onClick, urgent = false }) => {
  // Variant-based styling for visual hierarchy
  const variantStyles = {
    primary: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800/50',
    success: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-800/50',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200 dark:border-amber-800/50',
    danger: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-800/50',
    default: 'bg-white dark:bg-surface-primary border-[var(--bb-color-border-subtle)]',
  };

  const iconStyles = {
    primary: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
    success: 'bg-gradient-to-br from-green-500 to-green-600 text-white',
    warning: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
    danger: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
    default: 'bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-muted)]',
  };

  const valueStyles = {
    primary: 'text-emerald-700 dark:text-emerald-300',
    success: 'text-green-700 dark:text-green-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
    default: 'text-[var(--bb-color-text-primary)]',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative text-left border rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5 flex-1 min-w-[140px]',
        variantStyles[variant],
        urgent && 'ring-2 ring-red-400/50 dark:ring-red-500/30'
      )}
    >
      {/* Urgency pulse indicator */}
      {urgent && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Enhanced icon container */}
        <div className={cn(
          'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm',
          iconStyles[variant]
        )}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <span className="text-xs text-[var(--bb-color-text-muted)] uppercase tracking-wide font-medium">
            {label}
          </span>
          <p className={cn(
            'text-xl font-bold mt-0.5',
            valueStyles[variant]
          )}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-[var(--bb-color-text-muted)] mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </button>
  );
};

// Invoice Row Component
const InvoiceRow = ({ invoice, isSelected, onSelect, onClick, onStatusAction }) => {
  // Determine effective status (check for overdue) - status is already normalized to lowercase
  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'void' && invoice.dueDate && isPast(new Date(invoice.dueDate));
  const effectiveStatus = isOverdue ? 'overdue' : invoice.status;

  // Backend returns 'customer' object, frontend may also use 'owner'
  const ownerData = invoice.customer || invoice.owner;
  const ownerName = ownerData
    ? `${ownerData.firstName || ''} ${ownerData.lastName || ''}`.trim() || 'Unknown'
    : 'Unknown';
  const ownerEmail = ownerData?.email;
  const ownerId = invoice.ownerId || invoice.owner_id;

  const totalAmount = (invoice.totalCents || 0) / 100;
  const paidAmount = (invoice.paidCents || 0) / 100;
  const balanceDue = totalAmount - paidAmount;

  // Get pets from line items
  const pets = useMemo(() => {
    try {
      const items = typeof invoice.lineItems === 'string' 
        ? JSON.parse(invoice.lineItems) 
        : invoice.lineItems || [];
      return [...new Set(items.map(i => i.petName).filter(Boolean))];
    } catch {
      return [];
    }
  }, [invoice.lineItems]);

  return (
    <tr
      className={cn(
        'group hover:bg-surface/50 transition-colors cursor-pointer border-b border-border',
        isSelected && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(invoice.id || invoice.recordId)}
          className="rounded border-border"
        />
      </td>
      <td className="px-3 py-3">
        <button className="text-sm font-mono font-medium text-primary hover:underline">
          {invoice.invoiceNumber || `INV-${(invoice.id || invoice.recordId)?.slice(0, 6)}`}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            {ownerId ? (
              <a
                href={`/owners/${ownerId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-primary hover:underline truncate block"
              >
                {ownerName}
              </a>
            ) : (
              <p className="text-sm font-medium text-text truncate">{ownerName}</p>
            )}
            {ownerEmail && (
              <p className="text-xs text-muted truncate">{ownerEmail}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {pets.length > 0 ? (
          <div className="flex items-center gap-1">
            <PawPrint className="h-3.5 w-3.5 text-muted flex-shrink-0" />
            <span className="text-sm text-muted truncate max-w-[120px]">
              {pets.join(', ')}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <span className="text-sm font-semibold text-text">${totalAmount.toFixed(2)}</span>
      </td>
      <td className="px-3 py-3 text-right">
        <span className={cn(
          'text-sm',
          paidAmount > 0 ? 'text-green-600 font-medium' : 'text-muted'
        )}>
          ${paidAmount.toFixed(2)}
        </span>
      </td>
      <td className="px-3 py-3">
        <StatusBadgeDropdown
          invoice={invoice}
          effectiveStatus={effectiveStatus}
          onAction={onStatusAction}
        />
      </td>
      <td className="px-3 py-3">
        {invoice.dueDate ? (
          <span className={cn(
            'text-sm',
            isOverdue ? 'text-red-600 font-medium' : 'text-muted'
          )}>
            {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </td>
    </tr>
  );
};

// Create Invoice Drawer
const CreateInvoiceDrawer = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    ownerId: '',
    dueDate: '',
    notes: '',
    lineItems: [{ description: '', quantity: 1, unitPriceCents: 0 }],
  });
  const [lineItemErrors, setLineItemErrors] = useState([]);

  const { data: ownersData } = useOwnersQuery();
  const owners = ownersData?.owners ?? ownersData ?? [];
  const createMutation = useCreateInvoiceMutation();

  const handleAddLineItem = () => {
    setForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', quantity: 1, unitPriceCents: 0 }],
    }));
  };

  const handleRemoveLineItem = (idx) => {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }));
  };

  const handleLineItemChange = (idx, field, value) => {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      ),
    }));
  };

  const subtotalCents = form.lineItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPriceCents || 0),
    0
  );

  // Validate line items and return errors array
  const validateLineItems = () => {
    const errors = [];
    let hasValidItem = false;

    form.lineItems.forEach((item, idx) => {
      const itemErrors = {};
      const quantity = parseInt(item.quantity, 10);
      const price = item.unitPriceCents;

      // Check if this item has any content (description or price)
      const hasContent = item.description?.trim() || price > 0;

      if (hasContent) {
        // Validate quantity - must be > 0
        if (isNaN(quantity) || quantity <= 0) {
          itemErrors.quantity = 'Quantity must be greater than 0';
        }

        // Validate price - must be >= 0 and a valid number
        if (isNaN(price) || price < 0) {
          itemErrors.price = 'Price must be a valid number >= 0';
        }

        // Description required if price > 0
        if (price > 0 && !item.description?.trim()) {
          itemErrors.description = 'Description required when price is set';
        }

        hasValidItem = true;
      }

      errors[idx] = itemErrors;
    });

    return { errors, hasValidItem };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setLineItemErrors([]);

    // Validate owner
    if (!form.ownerId) {
      toast.error('Please select a customer');
      return;
    }

    // Validate line items
    const { errors, hasValidItem } = validateLineItems();
    const hasErrors = errors.some(e => Object.keys(e).length > 0);

    if (hasErrors) {
      setLineItemErrors(errors);
      toast.error('Please fix the errors in line items');
      return;
    }

    if (!hasValidItem) {
      toast.error('Please add at least one line item with a description');
      return;
    }

    // Filter to only valid items (with description)
    const validLineItems = form.lineItems.filter(i => i.description?.trim());

    try {
      await createMutation.mutateAsync({
        ownerId: form.ownerId,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        lineItems: validLineItems,
        subtotalCents,
        totalCents: subtotalCents,
        status: 'DRAFT',
      });
      toast.success('Invoice created');
      onSuccess?.();
      onClose();
      // Reset form
      setForm({
        ownerId: '',
        dueDate: '',
        notes: '',
        lineItems: [{ description: '', quantity: 1, unitPriceCents: 0 }],
      });
      setLineItemErrors([]);
    } catch (error) {
      toast.error(error?.message || 'Failed to create invoice');
    }
  };

  return (
    <SlideOutDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Invoice"
      subtitle="Create a new invoice for a customer"
      size="lg"
      footerContent={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            form="create-invoice-form"
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      }
    >
      <form id="create-invoice-form" onSubmit={handleSubmit} className="p-[var(--bb-space-6)] space-y-6">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Customer *</label>
          <Select
            value={form.ownerId}
            onChange={(e) => setForm(prev => ({ ...prev, ownerId: e.target.value }))}
            required
            options={[
              { value: '', label: 'Select a customer...' },
              ...owners.map((owner) => ({
                value: owner.recordId || owner.id,
                label: `${owner.firstName} ${owner.lastName}${owner.email ? ` (${owner.email})` : ''}`,
              })),
            ]}
            menuPortalTarget={document.body}
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Due Date</label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-text">Line Items</label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Item
            </Button>
          </div>
          <div className="space-y-3">
            {form.lineItems.map((item, idx) => {
              const itemErrors = lineItemErrors[idx] || {};
              const hasItemErrors = Object.keys(itemErrors).length > 0;

              return (
                <div key={idx} className={cn(
                  'flex flex-col gap-2 p-3 bg-surface rounded-lg',
                  hasItemErrors && 'ring-1 ring-red-500'
                )}>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                        className={itemErrors.description ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className={itemErrors.quantity ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="w-28">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          className={cn('pl-7', itemErrors.price ? 'border-red-500' : '')}
                          value={(item.unitPriceCents / 100).toFixed(2)}
                          onChange={(e) => handleLineItemChange(idx, 'unitPriceCents', Math.round(parseFloat(e.target.value || 0) * 100))}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right pt-2">
                      <span className="text-sm font-medium text-text">
                        ${((item.quantity || 0) * (item.unitPriceCents || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    {form.lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {/* Field-level error messages */}
                  {hasItemErrors && (
                    <div className="flex flex-wrap gap-2 text-xs text-red-600">
                      {itemErrors.description && <span>{itemErrors.description}</span>}
                      {itemErrors.quantity && <span>{itemErrors.quantity}</span>}
                      {itemErrors.price && <span>{itemErrors.price}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${(subtotalCents / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">Notes (optional)</label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any notes for this invoice..."
            rows={3}
          />
        </div>
      </form>
    </SlideOutDrawer>
  );
};

// Invoice Detail Drawer
const InvoiceDrawer = ({ invoice, isOpen, onClose, onSendEmail, onMarkPaid }) => {
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Parse line items - must be called before any early return to maintain hook order
  const lineItems = useMemo(() => {
    if (!invoice) return [];
    try {
      return typeof invoice.lineItems === 'string'
        ? JSON.parse(invoice.lineItems)
        : invoice.lineItems || [];
    } catch {
      return [];
    }
  }, [invoice]);

  // Early return AFTER all hooks
  if (!invoice) return null;

  const totalAmount = (invoice.totalCents || 0) / 100;
  const paidAmount = (invoice.paidCents || 0) / 100;
  const balanceDue = totalAmount - paidAmount;

  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'void' && invoice.dueDate && isPast(new Date(invoice.dueDate));
  const effectiveStatus = isOverdue ? 'overdue' : invoice.status;
  const status = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  const handleApplyPayment = () => {
    const cents = Math.round(parseFloat(paymentAmount) * 100);
    if (cents > 0 && cents <= balanceDue * 100) {
      onMarkPaid(invoice.id || invoice.recordId, cents);
      setShowPaymentInput(false);
      setPaymentAmount('');
    } else {
      toast.error('Invalid payment amount');
    }
  };

  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber || `#${(invoice.id || invoice.recordId)?.slice(0, 8)}`}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Amount & Status Header */}
        <div className="text-center py-4 border-b border-border">
          <p className="text-3xl font-bold text-text">${totalAmount.toFixed(2)}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant={status.variant} size="sm" className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            {invoice.dueDate && (
              <span className={cn(
                'text-xs',
                isOverdue ? 'text-red-600' : 'text-muted'
              )}>
                Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-surface/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text">
                {invoice.owner?.firstName} {invoice.owner?.lastName}
              </p>
              <p className="text-sm text-muted">{invoice.owner?.email}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Line Items</h4>
          <div className="space-y-2">
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-text">{item.description}</p>
                  {item.petName && (
                    <p className="text-xs text-muted flex items-center gap-1">
                      <PawPrint className="h-3 w-3" />
                      {item.petName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-text">
                    {formatCurrency(item.totalCents || (item.unitPriceCents || item.priceCents) * (item.quantity || 1))}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-muted">
                      {item.quantity} × {formatCurrency(item.unitPriceCents || item.priceCents)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-medium text-text">{formatCurrency(invoice.subtotalCents)}</span>
          </div>
          {invoice.discountCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Discount</span>
              <span className="text-green-600">-{formatCurrency(invoice.discountCents)}</span>
            </div>
          )}
          {invoice.taxCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Tax</span>
              <span className="font-medium text-text">{formatCurrency(invoice.taxCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
            <span className="text-text">Total</span>
            <span className="text-text">${totalAmount.toFixed(2)}</span>
          </div>
          {paidAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Paid</span>
              <span>-${paidAmount.toFixed(2)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div className="flex justify-between text-lg font-bold text-red-600 pt-2">
              <span>Balance Due</span>
              <span>${balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Activity</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted">Created</span>
              <span className="text-sm text-text ml-auto">
                {invoice.createdAt ? format(new Date(invoice.createdAt), 'MMM d, h:mm a') : '—'}
              </span>
            </div>
            {invoice.sentAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm text-muted">Sent</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(invoice.sentAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
            {invoice.viewedAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm text-muted">Viewed</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(invoice.viewedAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
            {invoice.paidAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted">Paid</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(invoice.paidAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Apply Payment */}
        {showPaymentInput && balanceDue > 0 && (
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Apply Payment</h4>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  max={balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={balanceDue.toFixed(2)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button size="sm" onClick={handleApplyPayment}>Apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPaymentInput(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-center" onClick={() => onSendEmail(invoice)}>
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
            <Button variant="outline" className="justify-center">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-center">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Invoice
            </Button>
            {balanceDue > 0 && (
              <Button 
                variant="outline" 
                className="justify-center"
                onClick={() => setShowPaymentInput(true)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Apply Payment
              </Button>
            )}
          </div>
          {balanceDue > 0 && invoice.status !== 'void' && (
            <Button 
              className="w-full justify-center"
              onClick={() => onMarkPaid(invoice.id || invoice.recordId, balanceDue * 100)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <Button variant="ghost" className="w-full justify-center text-red-600 hover:text-red-700">
              <Ban className="h-4 w-4 mr-2" />
              Void Invoice
            </Button>
          )}
        </div>

        {/* Integration Note */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-xs text-muted">
            Invoices sync with: Payments, Bookings, Owner Profiles
          </p>
        </div>
      </div>
    </SlidePanel>
  );
};

// Invoices Sidebar Component - Premium Version
const InvoicesSidebar = ({ invoices, stats, onCreateInvoice, onExport, onSendReminders }) => {
  // Calculate revenue summary
  const revenueSummary = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, i) => sum + (i.totalCents || 0), 0) / 100;
    const totalCollected = invoices.reduce((sum, i) => sum + (i.paidCents || 0), 0) / 100;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    return {
      totalInvoiced,
      totalCollected,
      collectionRate,
    };
  }, [invoices]);

  // Calculate aging report
  const agingReport = useMemo(() => {
    const now = new Date();
    const unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void');

    const aging = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days60plus: 0,
    };

    unpaidInvoices.forEach(inv => {
      const balance = ((inv.totalCents || 0) - (inv.paidCents || 0)) / 100;
      if (!inv.dueDate) {
        aging.current += balance;
        return;
      }

      const dueDate = new Date(inv.dueDate);
      const daysOverdue = differenceInDays(now, dueDate);

      if (daysOverdue <= 0) {
        aging.current += balance;
      } else if (daysOverdue <= 30) {
        aging.days1to30 += balance;
      } else if (daysOverdue <= 60) {
        aging.days31to60 += balance;
      } else {
        aging.days60plus += balance;
      }
    });

    const total = aging.current + aging.days1to30 + aging.days31to60 + aging.days60plus;

    return { ...aging, total };
  }, [invoices]);

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities = [];

    const sortedInvoices = [...invoices]
      .filter(i => i.paidAt || i.viewedAt || i.sentAt)
      .sort((a, b) => {
        const aDate = new Date(a.paidAt || a.viewedAt || a.sentAt || 0);
        const bDate = new Date(b.paidAt || b.viewedAt || b.sentAt || 0);
        return bDate - aDate;
      })
      .slice(0, 5);

    sortedInvoices.forEach(inv => {
      const ownerName = inv.customer
        ? `${inv.customer.firstName || ''} ${inv.customer.lastName || ''}`.trim()
        : inv.owner
          ? `${inv.owner.firstName || ''} ${inv.owner.lastName || ''}`.trim()
          : 'Customer';
      const invNumber = inv.invoiceNumber || `INV-${(inv.id || inv.recordId)?.slice(0, 6)}`;

      if (inv.paidAt) {
        activities.push({
          id: `${inv.id}-paid`,
          type: 'paid',
          title: `${ownerName} paid ${invNumber}`,
          date: new Date(inv.paidAt),
          icon: CheckCircle,
          iconColor: 'rgb(5, 150, 105)',
          iconBg: 'rgb(209, 250, 229)',
        });
      } else if (inv.viewedAt) {
        activities.push({
          id: `${inv.id}-viewed`,
          type: 'viewed',
          title: `${ownerName} viewed ${invNumber}`,
          date: new Date(inv.viewedAt),
          icon: Eye,
          iconColor: 'rgb(217, 119, 6)',
          iconBg: 'rgb(254, 243, 199)',
        });
      } else if (inv.sentAt) {
        activities.push({
          id: `${inv.id}-sent`,
          type: 'sent',
          title: `${invNumber} sent to ${ownerName}`,
          date: new Date(inv.sentAt),
          icon: Send,
          iconColor: 'rgb(37, 99, 235)',
          iconBg: 'rgb(219, 234, 254)',
        });
      }
    });

    return activities.sort((a, b) => b.date - a.date).slice(0, 5);
  }, [invoices]);

  const maxAgingValue = Math.max(
    agingReport.current,
    agingReport.days1to30,
    agingReport.days31to60,
    agingReport.days60plus,
    1
  );

  return (
    <div className="space-y-4">
      {/* Enhanced Outstanding Balance Callout */}
      {agingReport.total > 0 && (
        <div className={cn(
          'relative overflow-hidden rounded-xl border p-4',
          stats.overdue > 0
            ? 'bg-gradient-to-br from-red-50 via-red-50/80 to-orange-50 dark:from-red-900/20 dark:via-red-900/15 dark:to-orange-900/10 border-red-200 dark:border-red-800/50'
            : 'bg-gradient-to-br from-amber-50 via-amber-50/80 to-yellow-50 dark:from-amber-900/20 dark:via-amber-900/15 dark:to-yellow-900/10 border-amber-200 dark:border-amber-800/50'
        )}>
          {/* Urgency pulse indicator for overdue */}
          {stats.overdue > 2 && (
            <div className="absolute top-3 right-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className={cn(
              'h-11 w-11 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0',
              stats.overdue > 0
                ? 'bg-gradient-to-br from-red-500 to-orange-600'
                : 'bg-gradient-to-br from-amber-500 to-yellow-600'
            )}>
              <Wallet className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--bb-color-text-muted)] uppercase tracking-wide">
                Total Outstanding
              </p>
              <p className={cn(
                'text-2xl font-bold mt-0.5',
                stats.overdue > 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
              )}>
                ${agingReport.total.toLocaleString()}
              </p>
              <p className={cn(
                'text-xs mt-1',
                stats.overdue > 0 ? 'text-red-600/80 dark:text-red-400/80' : 'text-amber-600/80 dark:text-amber-400/80'
              )}>
                {stats.overdue > 0
                  ? `${stats.overdue} overdue invoice${stats.overdue !== 1 ? 's' : ''} need attention`
                  : 'All invoices within terms'
                }
              </p>
            </div>
          </div>

          {/* Send Reminders CTA for overdue invoices */}
          {stats.overdue > 0 && (
            <button
              onClick={onSendReminders}
              className="w-full mt-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Mail className="h-4 w-4" />
              Send {stats.overdue} Reminder{stats.overdue !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Revenue Summary Panel - Enhanced */}
      <div className="bg-white dark:bg-surface-primary border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Revenue Summary</h3>
        </div>

        {/* Collection Rate - Prominent */}
        <div className={cn(
          'mb-4 p-3 rounded-lg',
          revenueSummary.collectionRate >= 90
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10'
            : revenueSummary.collectionRate >= 70
              ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10'
              : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--bb-color-text-muted)] mb-0.5">Collection Rate</p>
              <p className={cn(
                'text-2xl font-bold',
                revenueSummary.collectionRate >= 90 ? 'text-emerald-700 dark:text-emerald-400' :
                revenueSummary.collectionRate >= 70 ? 'text-amber-700 dark:text-amber-400' :
                'text-red-700 dark:text-red-400'
              )}>
                {revenueSummary.collectionRate.toFixed(1)}%
              </p>
            </div>
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              revenueSummary.collectionRate >= 90 ? 'bg-emerald-100 dark:bg-emerald-900/30' :
              revenueSummary.collectionRate >= 70 ? 'bg-amber-100 dark:bg-amber-900/30' :
              'bg-red-100 dark:bg-red-900/30'
            )}>
              <Percent className={cn(
                'h-5 w-5',
                revenueSummary.collectionRate >= 90 ? 'text-emerald-600' :
                revenueSummary.collectionRate >= 70 ? 'text-amber-600' :
                'text-red-600'
              )} />
            </div>
          </div>
        </div>

        {/* Secondary metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--bb-color-text-muted)]">Total Invoiced</span>
            <span className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
              ${revenueSummary.totalInvoiced.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--bb-color-text-muted)]">Total Collected</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ${revenueSummary.totalCollected.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Aging Report Panel - Enhanced */}
      <div className="bg-white dark:bg-surface-primary border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Aging Report</h3>
        </div>

        <div className="space-y-3">
          {/* Current */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[var(--bb-color-text-muted)]">Current (not due)</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ${agingReport.current.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-[var(--bb-color-bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${maxAgingValue > 0 ? (agingReport.current / maxAgingValue) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 1-30 days */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[var(--bb-color-text-muted)]">1-30 days overdue</span>
              <span className={cn(
                'font-semibold',
                agingReport.days1to30 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--bb-color-text-muted)]'
              )}>
                ${agingReport.days1to30.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-[var(--bb-color-bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${maxAgingValue > 0 ? (agingReport.days1to30 / maxAgingValue) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 31-60 days */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[var(--bb-color-text-muted)]">31-60 days overdue</span>
              <span className={cn(
                'font-semibold',
                agingReport.days31to60 > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-[var(--bb-color-text-muted)]'
              )}>
                ${agingReport.days31to60.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-[var(--bb-color-bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${maxAgingValue > 0 ? (agingReport.days31to60 / maxAgingValue) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 60+ days */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[var(--bb-color-text-muted)]">60+ days overdue</span>
              <span className={cn(
                'font-semibold',
                agingReport.days60plus > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--bb-color-text-muted)]'
              )}>
                ${agingReport.days60plus.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-[var(--bb-color-bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${maxAgingValue > 0 ? (agingReport.days60plus / maxAgingValue) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Panel - Enhanced */}
      <div className="bg-white dark:bg-surface-primary border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <History className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Recent Activity</h3>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-sm text-[var(--bb-color-text-muted)] text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((activity, index) => {
              const ActivityIcon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
                    'bg-[var(--bb-color-bg-surface)] hover:bg-[var(--bb-color-bg-elevated)]',
                    index === 0 && activity.type === 'paid' && 'ring-1 ring-emerald-200 dark:ring-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10'
                  )}
                >
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: activity.iconBg }}
                  >
                    <ActivityIcon className="h-3.5 w-3.5" style={{ color: activity.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--bb-color-text-primary)] truncate">
                      {activity.title}
                    </p>
                    <p className="text-[10px] text-[var(--bb-color-text-muted)]">
                      {format(activity.date, 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions Panel - Enhanced Grid */}
      <div className="bg-white dark:bg-surface-primary border border-[var(--bb-color-border-subtle)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onCreateInvoice}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[var(--bb-color-bg-surface)] hover:bg-[var(--bb-color-bg-elevated)] transition-colors group"
          >
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-[10px] font-medium text-[var(--bb-color-text-secondary)]">Create</span>
          </button>

          <button
            onClick={onSendReminders}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[var(--bb-color-bg-surface)] hover:bg-[var(--bb-color-bg-elevated)] transition-colors group"
          >
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-[10px] font-medium text-[var(--bb-color-text-secondary)]">Remind</span>
          </button>

          <button
            onClick={onExport}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[var(--bb-color-bg-surface)] hover:bg-[var(--bb-color-bg-elevated)] transition-colors group"
          >
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Download className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-medium text-[var(--bb-color-text-secondary)]">Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Invoices = () => {
  const navigate = useNavigate();
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Data fetching - Business invoices (tenant billing pet owners)
  const { data: invoicesData, isLoading, error, refetch } = useBusinessInvoicesQuery();
  const sendEmailMutation = useSendInvoiceEmailMutation();
  const markPaidMutation = useMarkInvoicePaidMutation();

  // Process invoices data from normalized response { invoices, total }
  // Normalize status to lowercase for consistent comparison (DB may return UPPERCASE)
  const invoices = useMemo(() => {
    const rawInvoices = invoicesData?.invoices ?? [];
    return rawInvoices.map(inv => ({
      ...inv,
      status: (inv.status || 'draft').toLowerCase(),
    }));
  }, [invoicesData]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    
    const draft = invoices.filter(i => i.status === 'draft');
    const finalized = invoices.filter(i => i.status === 'finalized');
    const sent = invoices.filter(i => i.status === 'sent');
    const viewed = invoices.filter(i => i.status === 'viewed');
    const paid = invoices.filter(i => i.status === 'paid');
    const voided = invoices.filter(i => i.status === 'void');
    const overdue = invoices.filter(i => 
      i.status !== 'paid' && 
      i.status !== 'void' && 
      i.dueDate && 
      isPast(new Date(i.dueDate))
    );

    const outstandingBalance = invoices
      .filter(i => i.status !== 'paid' && i.status !== 'void')
      .reduce((sum, i) => sum + (i.totalCents || 0) - (i.paidCents || 0), 0) / 100;

    return {
      draft: draft.length,
      finalized: finalized.length,
      sent: sent.length,
      viewed: viewed.length,
      paid: paid.length,
      void: voided.length,
      overdue: overdue.length,
      outstandingBalance,
      total: invoices.length,
    };
  }, [invoices]);

  // Tab counts
  const tabCounts = {
    all: invoices.length,
    draft: stats.draft,
    finalized: stats.finalized,
    sent: stats.sent,
    viewed: stats.viewed,
    paid: stats.paid,
    overdue: stats.overdue,
    void: stats.void,
  };

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Tab filter
    if (activeTab !== 'all') {
      if (activeTab === 'overdue') {
        result = result.filter(i =>
          i.status !== 'paid' &&
          i.status !== 'void' &&
          i.dueDate &&
          isPast(new Date(i.dueDate))
        );
      } else {
        result = result.filter(i => i.status === activeTab);
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(i =>
        (i.invoiceNumber || '').toLowerCase().includes(term) ||
        (i.owner?.firstName || '').toLowerCase().includes(term) ||
        (i.owner?.lastName || '').toLowerCase().includes(term) ||
        (i.owner?.email || '').toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'totalCents' || sortConfig.key === 'paidCents') {
        aVal = a[sortConfig.key] || 0;
        bVal = b[sortConfig.key] || 0;
      } else if (sortConfig.key === 'dueDate' || sortConfig.key === 'createdAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (sortConfig.key === 'owner') {
        aVal = `${a.owner?.firstName || ''} ${a.owner?.lastName || ''}`.toLowerCase();
        bVal = `${b.owner?.firstName || ''} ${b.owner?.lastName || ''}`.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, activeTab, searchTerm, sortConfig]);

  // Pagination
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectInvoice = (id) => {
    setSelectedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === paginatedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(paginatedInvoices.map(i => i.id || i.recordId)));
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDrawer(true);
  };

  const handleSendEmail = async (invoice) => {
    try {
      await sendEmailMutation.mutateAsync(invoice.id || invoice.recordId);
      toast.success(`Invoice sent to ${invoice.owner?.email}`);
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  const handleMarkPaid = async (invoiceId, paymentCents) => {
    try {
      await markPaidMutation.mutateAsync({ invoiceId, paymentCents });
      toast.success('Payment applied');
      setShowDrawer(false);
      refetch();
    } catch (error) {
      toast.error('Failed to apply payment');
    }
  };

  // Handler for sending bulk reminders (overdue invoices)
  const handleSendReminders = async () => {
    const overdueInvoices = invoices.filter(i =>
      i.status !== 'paid' &&
      i.status !== 'void' &&
      i.dueDate &&
      isPast(new Date(i.dueDate))
    );

    if (overdueInvoices.length === 0) {
      toast.info('No overdue invoices to send reminders for');
      return;
    }

    toast.info(`Sending reminders to ${overdueInvoices.length} overdue invoices...`);

    let sent = 0;
    for (const inv of overdueInvoices) {
      try {
        await sendEmailMutation.mutateAsync(inv.id || inv.recordId);
        sent++;
      } catch (e) {
        // Continue with others
      }
    }

    if (sent > 0) {
      toast.success(`${sent} reminder${sent > 1 ? 's' : ''} sent`);
      refetch();
    } else {
      toast.error('Failed to send reminders');
    }
  };

  // Add the void mutation
  const voidMutation = useVoidInvoiceMutation();

  // Handler for status badge dropdown actions
  const handleStatusAction = async (action, invoice) => {
    const invoiceId = invoice.id || invoice.recordId;
    const balanceDue = ((invoice.totalCents || 0) - (invoice.paidCents || 0));

    switch (action) {
      case 'send':
      case 'sendReminder':
        try {
          await sendEmailMutation.mutateAsync(invoiceId);
          toast.success(`Invoice ${action === 'sendReminder' ? 'reminder ' : ''}sent to ${invoice.owner?.email || invoice.customer?.email || 'customer'}`);
          refetch();
        } catch (error) {
          toast.error(`Failed to send ${action === 'sendReminder' ? 'reminder' : 'invoice'}`);
        }
        break;

      case 'markPaid':
        try {
          await markPaidMutation.mutateAsync({ invoiceId, paymentCents: balanceDue });
          toast.success('Invoice marked as paid');
          refetch();
        } catch (error) {
          toast.error('Failed to mark invoice as paid');
        }
        break;

      case 'void':
        try {
          await voidMutation.mutateAsync(invoiceId);
          toast.success('Invoice voided');
          refetch();
        } catch (error) {
          toast.error('Failed to void invoice');
        }
        break;

      case 'edit':
        // Open the invoice drawer for editing
        setSelectedInvoice(invoice);
        setShowDrawer(true);
        break;

      case 'view':
        setSelectedInvoice(invoice);
        setShowDrawer(true);
        break;

      case 'sendReceipt':
        try {
          await sendEmailMutation.mutateAsync(invoiceId);
          toast.success('Receipt sent');
        } catch (error) {
          toast.error('Failed to send receipt');
        }
        break;

      case 'refund':
        // For now, just open the invoice drawer - full refund flow would be more complex
        toast.info('Refund processing - open invoice for details');
        setSelectedInvoice(invoice);
        setShowDrawer(true);
        break;

      default:
        console.warn('Unknown action:', action);
    }
  };

  const handleExport = () => {
    const toExport = selectedInvoices.size > 0
      ? invoices.filter(i => selectedInvoices.has(i.id || i.recordId))
      : filteredInvoices;

    const csv = toExport.map(i =>
      `${i.invoiceNumber || i.id || i.recordId},${i.owner?.firstName || ''} ${i.owner?.lastName || ''},${((i.totalCents || 0) / 100).toFixed(2)},${((i.paidCents || 0) / 100).toFixed(2)},${i.status},${i.dueDate || ''}`
    ).join('\n');

    const blob = new Blob([`Invoice #,Owner,Amount,Paid,Status,Due Date\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Invoices exported');
  };

  const hasActiveFilters = searchTerm || dateRange !== 'all' || ownerFilter;

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange('all');
    setOwnerFilter('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><span>Finance</span></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Invoices</li>
            </ol>
          </nav>
          <h1 className="text-[var(--bb-heading-page-size)] font-[var(--bb-heading-page-weight)] leading-[var(--bb-heading-page-leading)] tracking-[var(--bb-heading-page-tracking)] text-[color:var(--bb-color-text-primary)]">Invoices</h1>
          <p className="text-[var(--bb-body-size)] leading-[var(--bb-body-leading)] text-[color:var(--bb-color-text-muted)] mt-1">Billing & invoicing command center</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => setShowCreateDrawer(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* KPI Tiles - Invoice Status Overview */}
      <div className="flex gap-4 overflow-x-auto pb-1">
        <KPITile
          icon={FileText}
          label="Draft"
          value={stats.draft}
          onClick={() => setActiveTab('draft')}
        />
        <KPITile
          icon={FileCheck}
          label="Finalized"
          value={stats.finalized}
          onClick={() => setActiveTab('finalized')}
        />
        <KPITile
          icon={CheckCircle}
          label="Paid"
          value={stats.paid}
          subtext={`of ${stats.total} total`}
          variant="success"
          onClick={() => setActiveTab('paid')}
        />
        <KPITile
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          variant={stats.overdue > 0 ? 'danger' : 'default'}
          urgent={stats.overdue > 2}
          onClick={() => setActiveTab('overdue')}
        />
        <KPITile
          icon={CircleDollarSign}
          label="Outstanding"
          value={`$${stats.outstandingBalance.toLocaleString()}`}
          variant={stats.outstandingBalance > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Status Tabs - Invoice Lifecycle */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-3 px-1 bg-[var(--bb-color-bg-surface)]/50 rounded-lg border border-[var(--bb-color-border-subtle)]">
        {[
          { key: 'all', label: 'All', color: null },
          { key: 'draft', label: 'Draft', color: '#6B7280' },
          { key: 'finalized', label: 'Ready', color: '#3B82F6' },
          { key: 'sent', label: 'Sent', color: '#8B5CF6' },
          { key: 'viewed', label: 'Viewed', color: '#F59E0B' },
          { key: 'paid', label: 'Paid', color: '#10B981' },
          { key: 'overdue', label: 'Overdue', color: '#EF4444' },
          { key: 'void', label: 'Void', color: '#9CA3AF' },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key];
          const hasItems = count > 0;

          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
              className={cn(
                'relative px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150',
                isActive
                  ? 'bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)] shadow-sm'
                  : 'text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]'
              )}
            >
              <span className="flex items-center gap-2">
                {/* Status indicator dot */}
                {tab.color && (
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full transition-opacity',
                      !hasItems && 'opacity-30'
                    )}
                    style={{ backgroundColor: tab.color }}
                  />
                )}

                {tab.label}

                {/* Count badge */}
                {typeof count === 'number' && count > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-md text-xs font-semibold min-w-[20px] text-center',
                    isActive
                      ? 'bg-[var(--bb-color-accent)] text-white'
                      : 'bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-secondary)]'
                  )}>
                    {count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Two Column Layout: Filters/Table + Sidebar */}
      <div className="flex gap-5">
        {/* Left Column: Filters & Invoice Table (70%) */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filters Toolbar */}
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Date Range */}
              <div className="min-w-[130px]">
                <StyledSelect
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                    { value: 'quarter', label: 'This Quarter' },
                  ]}
                  value={dateRange}
                  onChange={(opt) => setDateRange(opt?.value || 'all')}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                <span className="text-sm text-muted">{selectedInvoices.size} selected</span>
                <Button variant="outline" size="sm">
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Ban className="h-3.5 w-3.5 mr-1.5" />
                  Void
                </Button>
              </div>
            )}
          </div>

          {/* Invoice Table */}
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingState label="Loading invoices…" variant="spinner" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="font-medium text-text mb-1">Error loading invoices</p>
            <p className="text-sm text-muted">{error.message}</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-16 text-center">
            {/* Animated empty state icon */}
            <div className="relative h-24 w-24 mx-auto mb-6">
              {/* Animated rings */}
              <div className="absolute inset-[-8px] rounded-full border-2 border-dashed border-blue-300/30 dark:border-blue-600/20 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-[-16px] rounded-full border-2 border-dashed border-blue-300/20 dark:border-blue-600/10 animate-[spin_30s_linear_infinite_reverse]" />

              {/* Main icon */}
              <div className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 flex items-center justify-center shadow-lg">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <FileText className="h-7 w-7 text-white" />
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-[var(--bb-color-text-primary)] mb-2">
              {invoices.length === 0 ? 'Ready to Start Invoicing' : 'No Matching Invoices'}
            </h3>
            <p className="text-sm text-[var(--bb-color-text-muted)] mb-6 max-w-md mx-auto">
              {invoices.length === 0
                ? 'Create professional invoices to bill your clients. Invoices can be generated from bookings or created manually, then sent via email.'
                : 'No invoices match your current filters. Try adjusting your search criteria or selecting a different status tab.'}
            </p>

            {invoices.length === 0 ? (
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => setShowCreateDrawer(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Invoice
                </Button>
                <Button variant="outline" onClick={() => navigate('/bookings')}>
                  <Calendar className="h-4 w-4 mr-1.5" />
                  From Booking
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1.5" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-surface border-b border-border sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.size === paginatedInvoices.length && paginatedInvoices.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('invoiceNumber')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Invoice #
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('owner')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Owner
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Pets
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('totalCents')}
                        className="flex items-center gap-1 hover:text-text ml-auto"
                      >
                        Amount
                        {sortConfig.key === 'totalCents' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                      Paid
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('dueDate')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Due Date
                        {sortConfig.key === 'dueDate' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map(invoice => (
                    <InvoiceRow
                      key={invoice.id || invoice.recordId}
                      invoice={invoice}
                      isSelected={selectedInvoices.has(invoice.id || invoice.recordId)}
                      onSelect={handleSelectInvoice}
                      onClick={() => handleViewInvoice(invoice)}
                      onStatusAction={handleStatusAction}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted">
                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24">
                  <StyledSelect
                    options={[
                      { value: 25, label: '25' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' },
                    ]}
                    value={pageSize}
                    onChange={(opt) => { setPageSize(opt?.value || 25); setCurrentPage(1); }}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
          </div>
        </div>

        {/* Right Column: Contextual Sidebar (30%) */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <InvoicesSidebar
            invoices={invoices}
            stats={stats}
            onCreateInvoice={() => setShowCreateDrawer(true)}
            onExport={handleExport}
            onSendReminders={handleSendReminders}
          />
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      <InvoiceDrawer
        invoice={selectedInvoice}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onSendEmail={handleSendEmail}
        onMarkPaid={handleMarkPaid}
      />

      {/* Create Invoice Drawer */}
      <CreateInvoiceDrawer
        isOpen={showCreateDrawer}
        onClose={() => setShowCreateDrawer(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default Invoices;
