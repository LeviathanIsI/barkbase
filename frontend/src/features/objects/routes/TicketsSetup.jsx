import { Ticket } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const TicketsSetup = () => {
  return (
    <ObjectSetup
      objectName="tickets"
      objectLabel="Tickets"
      description="Configure ticket records, workflows, and support settings"
      icon={Ticket}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Ticket Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how ticket records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize ticket properties and priority levels</li>
                <li>Set up associations with owners, pets, and bookings</li>
                <li>Configure lifecycle stages (New, In Progress, Resolved, Closed)</li>
                <li>Customize ticket workflows and SLA settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default TicketsSetup;
