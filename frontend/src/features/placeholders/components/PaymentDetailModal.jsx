/**
 * PaymentDetailModal - Payment detail inspector using unified Inspector system
 */

import { DollarSign, Edit2 } from 'lucide-react';
import {
  InspectorRoot,
  InspectorHeader,
  InspectorSection,
  InspectorField,
  InspectorFooter,
} from '@/components/ui/inspector';
import Button from '@/components/ui/Button';

const PaymentDetailModal = ({ payment, isOpen, onClose, onRefund }) => {
  if (!isOpen || !payment) return null;

  return (
    <InspectorRoot
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Details"
      subtitle={payment.id ? `Transaction #${payment.id.slice(0, 8)}` : 'Transaction Details'}
      variant="finance"
      size="md"
    >
      <InspectorHeader
        status={payment.status || 'Completed'}
        statusIntent={payment.status === 'refunded' ? 'warning' : 'success'}
        metrics={[
          { label: 'Amount', value: payment.amount ? `$${payment.amount.toFixed(2)}` : '$0.00' },
          { label: 'Method', value: payment.method || 'Card' },
          { label: 'Date', value: payment.date || 'Today' },
        ]}
      />

      <InspectorSection title="Transaction Details" icon={DollarSign}>
        <div className="text-center py-[var(--bb-space-8)]">
          <div className="text-6xl mb-[var(--bb-space-4)]">💳</div>
          <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
            Complete Payment Details
          </h3>
          <p className="text-[var(--bb-color-text-muted)]">
            Transaction breakdown, timeline, and management coming soon...
          </p>
        </div>
      </InspectorSection>

      <InspectorFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {onRefund && (
          <Button variant="destructive" onClick={onRefund}>
            Process Refund
          </Button>
        )}
      </InspectorFooter>
    </InspectorRoot>
  );
};

export default PaymentDetailModal;
