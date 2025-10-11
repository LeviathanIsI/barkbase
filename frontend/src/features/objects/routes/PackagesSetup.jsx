import { Package } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const PackagesSetup = () => {
  return (
    <ObjectSetup
      objectName="packages"
      objectLabel="Packages"
      description="Configure package records, bundled services, and pricing"
      icon={Package}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Package Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how package records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize package properties and bundled services</li>
                <li>Set up associations with services and bookings</li>
                <li>Configure pricing tiers and discount rules</li>
                <li>Customize package validity and redemption settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default PackagesSetup;
