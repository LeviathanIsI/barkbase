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
import { Card } from '@/components/ui/Card';
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

// Clickable Status Badge with Dropdown
const StatusBadgeDropdown = ({ invoice, effectiveStatus, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const status = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.draft;
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
        className="group/badge"
      >
        <Badge
          variant={status.variant}
          size="sm"
          className={cn(
            'gap-1 cursor-pointer transition-all',
            'hover:ring-2 hover:ring-offset-1 hover:ring-primary/30',
            isOpen && 'ring-2 ring-offset-1 ring-primary/30'
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
          <ChevronDown className={cn(
            'h-3 w-3 ml-0.5 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </Badge>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-44 rounded-lg border shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150 bg-white dark:bg-surface-primary"
          style={{ borderColor: 'var(--bb-color-border-subtle, #e5e7eb)' }}
        >
          <div className="px-3 py-1.5 border-b" style={{ borderColor: 'var(--bb-color-border-subtle, #e5e7eb)' }}>
            <p className="text-xs font-medium text-muted">Quick Actions</p>
          </div>
          {actions.map((item) => {
            const ActionIcon = item.icon;
            return (
              <button
                key={item.action}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction(item.action);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface transition-colors"
              >
                <ActionIcon className={cn(
                  'h-4 w-4',
                  item.action === 'markPaid' && 'text-green-600',
                  item.action === 'void' && 'text-red-500',
                  item.action === 'send' && 'text-blue-500',
                  item.action === 'sendReminder' && 'text-amber-500'
                )} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// KPI Tile Component
const KPITile = ({ icon: Icon, label, value, subtext, variant, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'text-left bg-white dark:bg-surface-primary border rounded-lg p-3 transition-all hover:shadow-sm flex-1 min-w-[140px]',
      variant === 'warning' ? 'border-amber-300 dark:border-amber-800' : 'border-border hover:border-primary/30'
    )}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon className={cn(
        'h-3.5 w-3.5',
        variant === 'warning' ? 'text-amber-600' : 'text-muted'
      )} />
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
    </div>
    <p className={cn(
      'text-xl font-semibold',
      variant === 'warning' ? 'text-amber-600' : 'text-text'
    )}>
      {value}
    </p>
    {subtext && (
      <p className="text-xs text-muted mt-0.5">{subtext}</p>
    )}
  </button>
);

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

// Invoices Sidebar Component
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
      current: 0,      // Not due yet
      days1to30: 0,    // 1-30 days overdue
      days31to60: 0,   // 31-60 days overdue
      days60plus: 0,   // 60+ days overdue
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

  // Recent activity (mock based on invoice data)
  const recentActivity = useMemo(() => {
    const activities = [];

    // Get invoices with recent activity, sorted by most recent
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
          text: `${ownerName} paid ${invNumber}`,
          date: new Date(inv.paidAt),
          icon: CheckCircle,
          iconColor: 'text-green-600',
        });
      } else if (inv.viewedAt) {
        activities.push({
          id: `${inv.id}-viewed`,
          type: 'viewed',
          text: `${ownerName} viewed ${invNumber}`,
          date: new Date(inv.viewedAt),
          icon: Eye,
          iconColor: 'text-amber-600',
        });
      } else if (inv.sentAt) {
        activities.push({
          id: `${inv.id}-sent`,
          type: 'sent',
          text: `${invNumber} sent to ${ownerName}`,
          date: new Date(inv.sentAt),
          icon: Send,
          iconColor: 'text-blue-600',
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
      {/* Revenue Summary Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Revenue Summary</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Total Invoiced</span>
            <span className="text-sm font-semibold text-text">
              ${revenueSummary.totalInvoiced.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Total Collected</span>
            <span className="text-sm font-semibold text-green-600">
              ${revenueSummary.totalCollected.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-xs text-muted flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Collection Rate
            </span>
            <span className={cn(
              'text-sm font-semibold',
              revenueSummary.collectionRate >= 90 ? 'text-green-600' :
              revenueSummary.collectionRate >= 70 ? 'text-amber-600' : 'text-red-600'
            )}>
              {revenueSummary.collectionRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Aging Report Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Aging Report</h3>
        </div>

        <div className="space-y-3">
          {/* Current */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Current (not due)</span>
              <span className="text-text font-medium">${agingReport.current.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(agingReport.current / maxAgingValue) * 100}%` }}
              />
            </div>
          </div>

          {/* 1-30 days */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">1-30 days overdue</span>
              <span className="text-text font-medium">${agingReport.days1to30.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${(agingReport.days1to30 / maxAgingValue) * 100}%` }}
              />
            </div>
          </div>

          {/* 31-60 days */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">31-60 days overdue</span>
              <span className="text-text font-medium">${agingReport.days31to60.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${(agingReport.days31to60 / maxAgingValue) * 100}%` }}
              />
            </div>
          </div>

          {/* 60+ days */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">60+ days overdue</span>
              <span className="text-text font-medium">${agingReport.days60plus.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${(agingReport.days60plus / maxAgingValue) * 100}%` }}
              />
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted">Total Outstanding</span>
            <span className="text-sm font-semibold text-text">${agingReport.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Recent Activity</h3>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map(activity => {
              const ActivityIcon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-2 p-2 bg-surface rounded-lg"
                >
                  <div className={cn('h-5 w-5 flex items-center justify-center flex-shrink-0', activity.iconColor)}>
                    <ActivityIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text truncate">{activity.text}</p>
                    <p className="text-xs text-muted">
                      {format(activity.date, 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Quick Actions</h3>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onCreateInvoice}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            Create Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onSendReminders}
          >
            <Mail className="h-3.5 w-3.5 mr-2" />
            Send Reminders
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Export Report
          </Button>
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
          <h1 className="text-lg font-semibold text-text">Invoices</h1>
          <p className="text-xs text-muted mt-0.5">Billing & invoicing command center</p>
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

      {/* KPI Tiles */}
      <div className="flex gap-3 overflow-x-auto pb-1">
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
          onClick={() => setActiveTab('paid')}
        />
        <KPITile
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          variant={stats.overdue > 0 ? 'warning' : undefined}
          onClick={() => setActiveTab('overdue')}
        />
        <KPITile
          icon={CircleDollarSign}
          label="Outstanding"
          value={`$${stats.outstandingBalance.toLocaleString()}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {[
          { key: 'all', label: 'All' },
          { key: 'draft', label: 'Draft' },
          { key: 'finalized', label: 'Finalized' },
          { key: 'sent', label: 'Sent' },
          { key: 'viewed', label: 'Viewed' },
          { key: 'paid', label: 'Paid' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'void', label: 'Void' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            className={cn(
              'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-primary/10' : 'bg-surface'
              )}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
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
          <div className="p-12 text-center">
            <div className="h-20 w-20 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-muted" />
            </div>
            <h3 className="font-semibold text-text mb-1">
              {invoices.length === 0 ? "You haven't created any invoices yet" : 'No matching invoices'}
            </h3>
            <p className="text-sm text-muted mb-4 max-w-sm mx-auto">
              {invoices.length === 0
                ? 'Create your first invoice to start billing clients. Invoices can be generated from bookings or created manually.'
                : 'Try adjusting your filters or search term'}
            </p>
            {invoices.length === 0 ? (
              <Button onClick={() => setShowCreateDrawer(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Your First Invoice
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
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
