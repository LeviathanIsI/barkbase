import { useState } from 'react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import StyledSelect from '@/components/ui/StyledSelect';
import { useTenantStore } from '@/stores/tenant';

export default function RulesTab() {
  const tenant = useTenantStore((state) => state.tenant);

  const [bookingRequirements, setBookingRequirements] = useState({
    minStay: tenant?.settings?.facility?.rules?.bookingRequirements?.minStay || 1,
    weekendMinStay: tenant?.settings?.facility?.rules?.bookingRequirements?.weekendMinStay || 2,
    holidayMinStay: tenant?.settings?.facility?.rules?.bookingRequirements?.holidayMinStay || 3,
    differentDaycareMin: tenant?.settings?.facility?.rules?.bookingRequirements?.differentDaycareMin ?? false,
    minDaycareDays: tenant?.settings?.facility?.rules?.bookingRequirements?.minDaycareDays || 1,
  });

  const [advanceBooking, setAdvanceBooking] = useState({
    maxAdvanceBooking: tenant?.settings?.facility?.rules?.advanceBooking?.maxAdvanceBooking || 90,
    allowSameDay: tenant?.settings?.facility?.rules?.advanceBooking?.allowSameDay ?? true,
    sameDayCutoff: tenant?.settings?.facility?.rules?.advanceBooking?.sameDayCutoff || '14:00',
  });

  const [petRequirements, setPetRequirements] = useState({
    minAgeBoarding: tenant?.settings?.facility?.rules?.petRequirements?.minAgeBoarding || 4,
    minAgeDaycare: tenant?.settings?.facility?.rules?.petRequirements?.minAgeDaycare || 4,
    requireSpayNeuter: tenant?.settings?.facility?.rules?.petRequirements?.requireSpayNeuter ?? false,
    spayNeuterMinAge: tenant?.settings?.facility?.rules?.petRequirements?.spayNeuterMinAge || 6,
    behavioralReqs: tenant?.settings?.facility?.rules?.petRequirements?.behavioralReqs || [
      { id: 'non_aggressive_dogs', label: 'Must be non-aggressive with dogs', checked: true },
      { id: 'non_aggressive_staff', label: 'Must be non-aggressive with staff', checked: true },
      { id: 'crate_trained', label: 'Must be crate-trained (for boarding)', checked: false },
      { id: 'temperament_test', label: 'Must pass temperament test (for daycare)', checked: false },
    ],
  });

  const [restrictions, setRestrictions] = useState({
    maxWeight: tenant?.settings?.facility?.rules?.restrictions?.maxWeight || '',
    restrictedBreeds: tenant?.settings?.facility?.rules?.restrictions?.restrictedBreeds || [],
  });

  const [checkInOut, setCheckInOut] = useState({
    checkInTime: tenant?.settings?.facility?.rules?.checkInOut?.checkInTime || '12:00',
    checkOutTime: tenant?.settings?.facility?.rules?.checkInOut?.checkOutTime || '11:00',
    allowEarlyCheckIn: tenant?.settings?.facility?.rules?.checkInOut?.allowEarlyCheckIn ?? true,
    earliestCheckIn: tenant?.settings?.facility?.rules?.checkInOut?.earliestCheckIn || '08:00',
    earlyCheckInFee: tenant?.settings?.facility?.rules?.checkInOut?.earlyCheckInFee || 15,
    allowLateCheckOut: tenant?.settings?.facility?.rules?.checkInOut?.allowLateCheckOut ?? true,
    latestCheckOut: tenant?.settings?.facility?.rules?.checkInOut?.latestCheckOut || '18:00',
    lateCheckOutFee: tenant?.settings?.facility?.rules?.checkInOut?.lateCheckOutFee || 25,
    gracePeriod: tenant?.settings?.facility?.rules?.checkInOut?.gracePeriod || 30,
    latePickupFee: tenant?.settings?.facility?.rules?.checkInOut?.latePickupFee || 10,
    latePickupFeeUnit: tenant?.settings?.facility?.rules?.checkInOut?.latePickupFeeUnit || 'hour',
  });

  const handleBehavioralReqToggle = (id) => {
    setPetRequirements(prev => ({
      ...prev,
      behavioralReqs: prev.behavioralReqs.map(req =>
        req.id === id ? { ...req, checked: !req.checked } : req
      )
    }));
  };

  return (
    <div className="space-y-6">
      <Card
        title="Booking Requirements"
        description="Set minimum stay requirements and booking rules."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Standard Minimum Stay"
              type="number"
              value={bookingRequirements.minStay}
              onChange={(e) => setBookingRequirements(prev => ({ ...prev, minStay: parseInt(e.target.value) || 1 }))}
              helpText="Minimum nights for boarding"
              min="1"
            />
            <Input
              label="Weekend Minimum Stay"
              type="number"
              value={bookingRequirements.weekendMinStay}
              onChange={(e) => setBookingRequirements(prev => ({ ...prev, weekendMinStay: parseInt(e.target.value) || 1 }))}
              helpText="Fri-Sun minimum nights"
              min="1"
            />
            <Input
              label="Holiday Minimum Stay"
              type="number"
              value={bookingRequirements.holidayMinStay}
              onChange={(e) => setBookingRequirements(prev => ({ ...prev, holidayMinStay: parseInt(e.target.value) || 1 }))}
              helpText="Holiday period minimum nights"
              min="1"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={bookingRequirements.differentDaycareMin}
              onChange={(e) => setBookingRequirements(prev => ({ ...prev, differentDaycareMin: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-sm font-medium">Different minimums for daycare</span>
          </label>

          {bookingRequirements.differentDaycareMin && (
            <Input
              label="Minimum Daycare Days"
              type="number"
              value={bookingRequirements.minDaycareDays}
              onChange={(e) => setBookingRequirements(prev => ({ ...prev, minDaycareDays: parseInt(e.target.value) || 1 }))}
              helpText="Minimum days for daycare"
              min="1"
            />
          )}
        </div>
      </Card>

      <Card
        title="Advance Booking"
        description="Control how far in advance customers can book."
      >
        <div className="space-y-4">
          <Input
            label="Maximum Advance Booking"
            type="number"
            value={advanceBooking.maxAdvanceBooking}
            onChange={(e) => setAdvanceBooking(prev => ({ ...prev, maxAdvanceBooking: parseInt(e.target.value) || 0 }))}
            helpText="Days in advance (0 = unlimited)"
            min="0"
          />

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={advanceBooking.allowSameDay}
              onChange={(e) => setAdvanceBooking(prev => ({ ...prev, allowSameDay: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-sm">Allow same-day bookings</span>
          </label>

          {advanceBooking.allowSameDay && (
            <Input
              label="Same-Day Cutoff Time"
              type="time"
              value={advanceBooking.sameDayCutoff}
              onChange={(e) => setAdvanceBooking(prev => ({ ...prev, sameDayCutoff: e.target.value }))}
              helpText="Latest time for same-day bookings"
            />
          )}
        </div>
      </Card>

      <Card
        title="Pet Requirements"
        description="Set age and health requirements for pets."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Minimum Age for Boarding"
              type="number"
              value={petRequirements.minAgeBoarding}
              onChange={(e) => setPetRequirements(prev => ({ ...prev, minAgeBoarding: parseInt(e.target.value) || 0 }))}
              helpText="Months"
              min="0"
            />
            <Input
              label="Minimum Age for Daycare"
              type="number"
              value={petRequirements.minAgeDaycare}
              onChange={(e) => setPetRequirements(prev => ({ ...prev, minAgeDaycare: parseInt(e.target.value) || 0 }))}
              helpText="Months"
              min="0"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={petRequirements.requireSpayNeuter}
              onChange={(e) => setPetRequirements(prev => ({ ...prev, requireSpayNeuter: e.target.checked }))}
              className="rounded border-border"
            />
            <span className="text-sm font-medium">Require spay/neuter</span>
          </label>

          {petRequirements.requireSpayNeuter && (
            <Input
              label="Spay/Neuter Minimum Age"
              type="number"
              value={petRequirements.spayNeuterMinAge}
              onChange={(e) => setPetRequirements(prev => ({ ...prev, spayNeuterMinAge: parseInt(e.target.value) || 0 }))}
              helpText="Months"
              min="0"
            />
          )}

          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Behavioral Requirements</h4>
            <div className="space-y-3">
              {petRequirements.behavioralReqs.map((req) => (
                <label key={req.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={req.checked}
                    onChange={() => handleBehavioralReqToggle(req.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{req.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Breed & Size Restrictions"
        description="Set any restrictions on pet types or sizes."
      >
        <div className="space-y-4">
          <Input
            label="Maximum Weight Limit (optional)"
            type="number"
            value={restrictions.maxWeight}
            onChange={(e) => setRestrictions(prev => ({ ...prev, maxWeight: e.target.value }))}
            placeholder="e.g., 150"
            helpText="Maximum weight in lbs (leave empty for no limit)"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
              Restricted Breeds (optional)
            </label>
            <textarea
              value={restrictions.restrictedBreeds.join('\n')}
              onChange={(e) => setRestrictions(prev => ({
                ...prev,
                restrictedBreeds: e.target.value.split('\n').filter(breed => breed.trim())
              }))}
              placeholder="Enter one breed per line"
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-text-secondary">
            Any restrictions will be clearly communicated to customers during booking.
          </p>
        </div>
      </Card>

      <Card
        title="Check-In/Check-Out Times"
        description="Set standard times and fees for check-in and check-out."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Check-In Time"
              type="time"
              value={checkInOut.checkInTime}
              onChange={(e) => setCheckInOut(prev => ({ ...prev, checkInTime: e.target.value }))}
            />
            <Input
              label="Check-Out Time"
              type="time"
              value={checkInOut.checkOutTime}
              onChange={(e) => setCheckInOut(prev => ({ ...prev, checkOutTime: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={checkInOut.allowEarlyCheckIn}
                onChange={(e) => setCheckInOut(prev => ({ ...prev, allowEarlyCheckIn: e.target.checked }))}
                className="rounded border-border"
              />
              <span className="text-sm font-medium">Allow early check-in</span>
            </label>

            {checkInOut.allowEarlyCheckIn && (
              <div className="grid gap-4 md:grid-cols-2 ml-6">
                <Input
                  label="Earliest Check-In Time"
                  type="time"
                  value={checkInOut.earliestCheckIn}
                  onChange={(e) => setCheckInOut(prev => ({ ...prev, earliestCheckIn: e.target.value }))}
                />
                <Input
                  label="Early Check-In Fee"
                  type="number"
                  value={checkInOut.earlyCheckInFee}
                  onChange={(e) => setCheckInOut(prev => ({ ...prev, earlyCheckInFee: parseInt(e.target.value) || 0 }))}
                  helpText="$"
                  min="0"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={checkInOut.allowLateCheckOut}
                onChange={(e) => setCheckInOut(prev => ({ ...prev, allowLateCheckOut: e.target.checked }))}
                className="rounded border-border"
              />
              <span className="text-sm font-medium">Allow late check-out</span>
            </label>

            {checkInOut.allowLateCheckOut && (
              <div className="grid gap-4 md:grid-cols-2 ml-6">
                <Input
                  label="Latest Check-Out Time"
                  type="time"
                  value={checkInOut.latestCheckOut}
                  onChange={(e) => setCheckInOut(prev => ({ ...prev, latestCheckOut: e.target.value }))}
                />
                <Input
                  label="Late Check-Out Fee"
                  type="number"
                  value={checkInOut.lateCheckOutFee}
                  onChange={(e) => setCheckInOut(prev => ({ ...prev, lateCheckOutFee: parseInt(e.target.value) || 0 }))}
                  helpText="$"
                  min="0"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Grace Period"
              type="number"
              value={checkInOut.gracePeriod}
              onChange={(e) => setCheckInOut(prev => ({ ...prev, gracePeriod: parseInt(e.target.value) || 0 }))}
              helpText="Minutes (no fee)"
              min="0"
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary">Late Pickup Fee</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-text-secondary">$</span>
                <Input
                  type="number"
                  value={checkInOut.latePickupFee}
                  onChange={(e) => setCheckInOut(prev => ({ ...prev, latePickupFee: parseInt(e.target.value) || 0 }))}
                  className="flex-1"
                  min="0"
                />
                <span className="text-sm text-gray-500 dark:text-text-secondary">per</span>
                <div className="min-w-[100px]">
                  <StyledSelect
                    options={[
                      { value: 'hour', label: 'hour' },
                      { value: '15min', label: '15 min' },
                      { value: '30min', label: '30 min' },
                    ]}
                    value={checkInOut.latePickupFeeUnit}
                    onChange={(opt) => setCheckInOut(prev => ({ ...prev, latePickupFeeUnit: opt?.value || 'hour' }))}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
