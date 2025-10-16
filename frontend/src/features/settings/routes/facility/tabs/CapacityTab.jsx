import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';

export default function CapacityTab() {
  const tenant = useTenantStore((state) => state.tenant);
  const [overallCapacity, setOverallCapacity] = useState({
    boarding: tenant?.settings?.facility?.capacity?.boarding || 50,
    daycare: tenant?.settings?.facility?.capacity?.daycare || 30,
    grooming: tenant?.settings?.facility?.capacity?.grooming || 12,
  });

  const [sizeBasedCapacity, setSizeBasedCapacity] = useState({
    enabled: tenant?.settings?.facility?.capacity?.sizeBasedEnabled ?? false,
    small: tenant?.settings?.facility?.capacity?.sizeBased?.small || 20,
    medium: tenant?.settings?.facility?.capacity?.sizeBased?.medium || 20,
    large: tenant?.settings?.facility?.capacity?.sizeBased?.large || 15,
    cats: tenant?.settings?.facility?.capacity?.sizeBased?.cats || 10,
  });

  const [alertSettings, setAlertSettings] = useState({
    warningThreshold: tenant?.settings?.facility?.capacity?.warningThreshold || 90,
    blockBookings: tenant?.settings?.facility?.capacity?.blockBookings ?? true,
    overbookingBuffer: tenant?.settings?.facility?.capacity?.overbookingBuffer || 5,
    emailAlertThreshold: tenant?.settings?.facility?.capacity?.emailAlertThreshold || 95,
  });

  const [staffRatios, setStaffRatios] = useState({
    boardingRatio: tenant?.settings?.facility?.capacity?.staffRatios?.boarding || 10,
    daycareRatio: tenant?.settings?.facility?.capacity?.staffRatios?.daycare || 15,
    alertUnderstaffed: tenant?.settings?.facility?.capacity?.staffRatios?.alertUnderstaffed ?? true,
  });

  return (
    <div className="space-y-6">
      <Card
        title="Overall Capacity Limits"
        description="Set the total capacity for each service type."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Total Boarding Capacity"
            type="number"
            value={overallCapacity.boarding}
            onChange={(e) => setOverallCapacity(prev => ({ ...prev, boarding: parseInt(e.target.value) || 0 }))}
            helpText="Maximum pets for boarding"
            min="1"
          />
          <Input
            label="Total Daycare Capacity"
            type="number"
            value={overallCapacity.daycare}
            onChange={(e) => setOverallCapacity(prev => ({ ...prev, daycare: parseInt(e.target.value) || 0 }))}
            helpText="Maximum pets for daycare"
            min="1"
          />
          <Input
            label="Grooming Appointments Per Day"
            type="number"
            value={overallCapacity.grooming}
            onChange={(e) => setOverallCapacity(prev => ({ ...prev, grooming: parseInt(e.target.value) || 0 }))}
            helpText="Maximum grooming appointments"
            min="1"
          />
        </div>
      </Card>

      <Card
        title="Size-Based Capacity Management"
        description="Optionally enable size-based capacity tracking for more precise management."
      >
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={sizeBasedCapacity.enabled}
              onChange={(e) => setSizeBasedCapacity(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-sm font-medium">Enable Size-Based Capacity Management</span>
          </label>

          {sizeBasedCapacity.enabled && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Small Dogs (0-25 lbs)"
                type="number"
                value={sizeBasedCapacity.small}
                onChange={(e) => setSizeBasedCapacity(prev => ({ ...prev, small: parseInt(e.target.value) || 0 }))}
                helpText="Maximum spots for small dogs"
                min="0"
              />
              <Input
                label="Medium Dogs (26-50 lbs)"
                type="number"
                value={sizeBasedCapacity.medium}
                onChange={(e) => setSizeBasedCapacity(prev => ({ ...prev, medium: parseInt(e.target.value) || 0 }))}
                helpText="Maximum spots for medium dogs"
                min="0"
              />
              <Input
                label="Large Dogs (51+ lbs)"
                type="number"
                value={sizeBasedCapacity.large}
                onChange={(e) => setSizeBasedCapacity(prev => ({ ...prev, large: parseInt(e.target.value) || 0 }))}
                helpText="Maximum spots for large dogs"
                min="0"
              />
              <Input
                label="Cats"
                type="number"
                value={sizeBasedCapacity.cats}
                onChange={(e) => setSizeBasedCapacity(prev => ({ ...prev, cats: parseInt(e.target.value) || 0 }))}
                helpText="Maximum spots for cats"
                min="0"
              />
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Alert Settings"
        description="Configure when to notify staff about capacity issues."
      >
        <div className="space-y-4">
          <Input
            label="Capacity Warning Threshold"
            type="number"
            value={alertSettings.warningThreshold}
            onChange={(e) => setAlertSettings(prev => ({ ...prev, warningThreshold: parseInt(e.target.value) || 0 }))}
            helpText="Warn staff when capacity reaches this percentage"
            min="1"
            max="100"
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={alertSettings.blockBookings}
              onChange={(e) => setAlertSettings(prev => ({ ...prev, blockBookings: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-sm">Block new bookings when at capacity</span>
          </label>

          <Input
            label="Overbooking Buffer"
            type="number"
            value={alertSettings.overbookingBuffer}
            onChange={(e) => setAlertSettings(prev => ({ ...prev, overbookingBuffer: parseInt(e.target.value) || 0 }))}
            helpText="Allow overbooking up to this percentage (0-10%)"
            min="0"
            max="10"
          />

          <Input
            label="Email Alert Threshold"
            type="number"
            value={alertSettings.emailAlertThreshold}
            onChange={(e) => setAlertSettings(prev => ({ ...prev, emailAlertThreshold: parseInt(e.target.value) || 0 }))}
            helpText="Send email alert when capacity reaches this percentage"
            min="1"
            max="100"
          />
        </div>
      </Card>

      <Card
        title="Staff Ratios"
        description="Set minimum staff-to-pet ratios for safety and care quality."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Minimum Staff Ratio - Boarding"
              type="number"
              value={staffRatios.boardingRatio}
              onChange={(e) => setStaffRatios(prev => ({ ...prev, boardingRatio: parseInt(e.target.value) || 1 }))}
              helpText="1 staff member per X dogs (boarding)"
              min="1"
            />
            <Input
              label="Minimum Staff Ratio - Daycare"
              type="number"
              value={staffRatios.daycareRatio}
              onChange={(e) => setStaffRatios(prev => ({ ...prev, daycareRatio: parseInt(e.target.value) || 1 }))}
              helpText="1 staff member per X dogs (daycare)"
              min="1"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={staffRatios.alertUnderstaffed}
              onChange={(e) => setStaffRatios(prev => ({ ...prev, alertUnderstaffed: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-sm">Alert when understaffed for current capacity</span>
          </label>
        </div>
      </Card>
    </div>
  );
}
