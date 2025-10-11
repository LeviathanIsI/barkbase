import PlaceholderPage from "@/components/shared/PlaceholderPage";
import { Settings } from "lucide-react";

const Properties = () => {
  return (
    <PlaceholderPage
      title="Properties"
      breadcrumbs={[
        { label: "Data Management", to: null },
        { label: "Properties", to: "/settings/properties" },
      ]}
      description="Manage custom properties and fields for all your BarkBase objects"
      illustration={Settings}
      primaryCTA={{
        label: "Create Property",
        onClick: () => console.log("Create property clicked"),
      }}
      pageName="properties"
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-lg font-semibold text-text mb-3">
            What are Properties?
          </h3>
          <p className="text-sm text-muted mb-4">
            Properties are custom fields that store information about your
            records. You can create properties for pets, owners, bookings, and
            all other objects in BarkBase.
          </p>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-text mb-1">
                Common Use Cases
              </h4>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Track pet breed, weight, and medical information</li>
                <li>Store owner preferences and emergency contacts</li>
                <li>Capture booking-specific notes and special requirements</li>
                <li>Manage facility capacity and amenities</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text mb-1">
                Property Types
              </h4>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Text (single-line and multi-line)</li>
                <li>Number and Currency</li>
                <li>Date and DateTime</li>
                <li>Dropdown and Checkbox</li>
                <li>File and Image uploads</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-lg font-semibold text-text mb-3">
            Getting Started
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                1
              </div>
              <div>
                <h4 className="text-sm font-medium text-text">
                  Choose an Object
                </h4>
                <p className="text-xs text-muted">
                  Select which object type you want to add properties to (Pets,
                  Owners, Bookings, etc.)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                2
              </div>
              <div>
                <h4 className="text-sm font-medium text-text">
                  Create Properties
                </h4>
                <p className="text-xs text-muted">
                  Define your custom fields with names, types, and validation
                  rules
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                3
              </div>
              <div>
                <h4 className="text-sm font-medium text-text">
                  Use in Records
                </h4>
                <p className="text-xs text-muted">
                  Your custom properties will appear when creating or editing
                  records
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlaceholderPage>
  );
};

export default Properties;
