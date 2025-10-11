import { Users } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const OwnersSetup = () => {
  return (
    <ObjectSetup
      objectName="owners"
      objectLabel="Owners"
      description="Configure owner/contact records, properties, and lifecycle stages"
      icon={Users}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Owner Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how owner and contact records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize owner properties and contact fields</li>
                <li>Set up associations with pets and bookings</li>
                <li>Configure lifecycle stages (Lead, Customer, Inactive)</li>
                <li>Customize record pages and communication preferences</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default OwnersSetup;
