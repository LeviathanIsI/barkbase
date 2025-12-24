import { Home } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const FacilitiesSetup = () => {
  return (
    <ObjectSetup
      objectName="facilities"
      objectLabel="Facilities & Runs"
      description="Configure facility and run records, properties, and management settings"
      icon={Home}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Facilities & Runs Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how facility and run records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize facility properties and run configurations</li>
                <li>Set up associations with bookings and pets</li>
                <li>Configure capacity and availability settings</li>
                <li>Customize facility layouts and visualization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default FacilitiesSetup;
