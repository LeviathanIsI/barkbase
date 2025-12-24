import { CalendarCheck2 } from 'lucide-react';
import ObjectSetup from '@/components/shared/ObjectSetup';

const BookingsSetup = () => {
  return (
    <ObjectSetup
      objectName="bookings"
      objectLabel="Bookings"
      description="Configure booking records, properties, and lifecycle stages"
      icon={CalendarCheck2}
    >
      {/* Setup tab content - will be implemented later */}
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text mb-2">Booking Object Setup</h2>
          <p className="text-sm text-muted mb-4">
            Configure how booking records are created, managed, and displayed throughout BarkBase.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">Quick Setup</h3>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Customize booking properties and fields</li>
                <li>Set up associations with pets, owners, and services</li>
                <li>Configure lifecycle stages (Draft, Confirmed, Completed, Cancelled)</li>
                <li>Customize booking workflow and automation rules</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ObjectSetup>
  );
};

export default BookingsSetup;
