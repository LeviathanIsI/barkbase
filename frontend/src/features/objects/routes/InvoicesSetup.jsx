import { FileText } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const InvoicesSetup = () => {
  return (
    <ObjectSetup
      objectName="invoices"
      objectLabel="Invoices"
      description="Configure invoice records, templates, and payment terms"
      icon={FileText}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Invoice Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how invoice records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize invoice properties and line items</li>
                <li>Set up associations with bookings, owners, and payments</li>
                <li>Configure lifecycle stages (Draft, Sent, Paid, Overdue)</li>
                <li>Customize invoice templates and payment terms</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default InvoicesSetup;
