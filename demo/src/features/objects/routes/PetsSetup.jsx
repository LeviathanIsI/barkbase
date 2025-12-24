import { PawPrint } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const PetsSetup = () => {
  return (
    <ObjectSetup
      objectName="pets"
      objectLabel="Pets"
      description="Configure pet records, properties, and lifecycle stages"
      icon={PawPrint}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Pet Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how pet records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize pet properties and fields</li>
                <li>Set up associations with owners and bookings</li>
                <li>Configure lifecycle stages (New, Active, Archived)</li>
                <li>Customize record pages and views</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default PetsSetup;
