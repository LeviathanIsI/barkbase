import { CreditCard } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const PaymentsSetup = () => {
  return (
    <ObjectSetup
      objectName="payments"
      objectLabel="Payments"
      description="Configure payment records, methods, and processing settings"
      icon={CreditCard}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Payment Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how payment records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize payment properties and transaction data</li>
                <li>Set up associations with invoices and owners</li>
                <li>Configure payment methods and processing settings</li>
                <li>Customize payment tracking and reconciliation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default PaymentsSetup;
