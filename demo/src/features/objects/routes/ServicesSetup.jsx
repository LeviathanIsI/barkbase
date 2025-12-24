import { Sparkles } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const ServicesSetup = () => {
  return (
    <ObjectSetup
      objectName="services"
      objectLabel="Services & Add-ons"
      description="Configure service and add-on records, pricing, and availability"
      icon={Sparkles}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Services & Add-ons Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how service and add-on records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize service properties and pricing tiers</li>
                <li>Set up associations with bookings and packages</li>
                <li>Configure service categories and add-on options</li>
                <li>Customize pricing rules and availability schedules</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default ServicesSetup;
