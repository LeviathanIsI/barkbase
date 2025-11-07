import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SettingsPage from '../../components/SettingsPage';
import { useTenantStore } from '@/stores/tenant';

const Accommodations = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const [terminology, setTerminology] = useState({
    kennel: tenant?.settings?.facility?.terminology?.kennel || 'Kennel',
    suite: tenant?.settings?.facility?.terminology?.suite || 'Suite',
    cabin: tenant?.settings?.facility?.terminology?.cabin || 'Cabin',
    daycare: tenant?.settings?.facility?.terminology?.daycare || 'Daycare',
    medical: tenant?.settings?.facility?.terminology?.medical || 'Medical Room',
  });

  const [kennelNaming, setKennelNaming] = useState({
    useNumbers: tenant?.settings?.facility?.kennelNaming?.useNumbers ?? true,
    useNames: tenant?.settings?.facility?.kennelNaming?.useNames ?? false,
    prefix: tenant?.settings?.facility?.kennelNaming?.prefix || '',
    startNumber: tenant?.settings?.facility?.kennelNaming?.startNumber || 1,
  });

  const handleSave = async () => {
    // TODO: Implement API call to save facility settings
  };

  return (
    <SettingsPage 
      title="Accommodations" 
      description="Customize how your accommodation types are displayed throughout the system"
      actions={<Button onClick={handleSave}>Save Changes</Button>}
    >
      <Card 
        title="Accommodation Terminology" 
        description="Customize the names used for different types of accommodations in your facility."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Standard Accommodation"
            value={terminology.kennel}
            onChange={(e) => setTerminology(prev => ({ ...prev, kennel: e.target.value }))}
            placeholder="e.g., Kennel, Room, Run"
            helpText="What you call your standard accommodations"
          />
          <Input
            label="Premium Accommodation"
            value={terminology.suite}
            onChange={(e) => setTerminology(prev => ({ ...prev, suite: e.target.value }))}
            placeholder="e.g., Suite, Luxury Room, VIP Suite"
            helpText="What you call your premium accommodations"
          />
          <Input
            label="Cabin-Style Accommodation"
            value={terminology.cabin}
            onChange={(e) => setTerminology(prev => ({ ...prev, cabin: e.target.value }))}
            placeholder="e.g., Cabin, Cottage, Villa"
            helpText="What you call your cabin-style accommodations"
          />
          <Input
            label="Daycare Area"
            value={terminology.daycare}
            onChange={(e) => setTerminology(prev => ({ ...prev, daycare: e.target.value }))}
            placeholder="e.g., Daycare, Play Area, Social Room"
            helpText="What you call your daycare areas"
          />
          <Input
            label="Medical/Isolation Room"
            value={terminology.medical}
            onChange={(e) => setTerminology(prev => ({ ...prev, medical: e.target.value }))}
            placeholder="e.g., Medical Room, Isolation, Quarantine"
            helpText="What you call your medical/isolation areas"
          />
        </div>
      </Card>

      <Card 
        title="Naming & Numbering System" 
        description="Configure how individual accommodations are identified and displayed."
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-text">Identification Method</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={kennelNaming.useNumbers}
                  onChange={(e) => setKennelNaming(prev => ({ ...prev, useNumbers: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm">Use numbers (e.g., Room 1, Suite 2)</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={kennelNaming.useNames}
                  onChange={(e) => setKennelNaming(prev => ({ ...prev, useNames: e.target.checked }))}
                  className="rounded border-border"
                />
                <span className="text-sm">Use custom names (e.g., Bella's Suite, Sunny Room)</span>
              </label>
            </div>
          </div>

          {kennelNaming.useNumbers && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Number Prefix"
                value={kennelNaming.prefix}
                onChange={(e) => setKennelNaming(prev => ({ ...prev, prefix: e.target.value }))}
                placeholder="e.g., R, K, S"
                helpText="Optional prefix for numbers (R1, K1, S1)"
              />
              <Input
                label="Starting Number"
                type="number"
                value={kennelNaming.startNumber}
                onChange={(e) => setKennelNaming(prev => ({ ...prev, startNumber: parseInt(e.target.value) || 1 }))}
                helpText="What number to start counting from"
                min="1"
              />
            </div>
          )}
        </div>
      </Card>

      <Card 
        title="Preview" 
        description="See how your accommodation names will appear throughout the system."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-surface/30 p-4">
            <h5 className="mb-3 font-medium text-text">Booking Form Preview</h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted">Available {terminology.kennel.toLowerCase()}s:</span>
                <Badge variant="outline">
                  {kennelNaming.useNumbers 
                    ? `${terminology.kennel} ${kennelNaming.prefix}${kennelNaming.startNumber}`
                    : `${terminology.kennel} A`
                  }
                </Badge>
                <Badge variant="outline">
                  {kennelNaming.useNumbers 
                    ? `${terminology.suite} ${kennelNaming.prefix}${kennelNaming.startNumber + 1}`
                    : `${terminology.suite} B`
                  }
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted">Daycare areas:</span>
                <Badge variant="outline">{terminology.daycare} Main</Badge>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-muted">
            These terms will be used throughout booking forms, calendars, reports, and customer communications.
          </div>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Accommodations;

