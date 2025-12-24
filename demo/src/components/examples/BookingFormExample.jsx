import { useState } from 'react';
import { Calendar, Clock, DollarSign, Settings, FileText, Users } from 'lucide-react';
import ProgressiveFormSection, { ProgressiveFormGroup, ConditionalFormField } from '@/components/ui/ProgressiveFormSection';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

/**
 * BookingFormExample Component
 * Demonstrates progressive disclosure pattern in a booking form
 * Phase 3: Enhancement features
 *
 * This is an example implementation showing best practices for:
 * - Progressive disclosure of advanced options
 * - Conditional field visibility
 * - Grouped optional settings
 */
const BookingFormExample = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    petId: '',
    startDate: '',
    endDate: '',
    service: 'boarding',
    // Advanced options
    specificKennel: '',
    specialInstructions: '',
    medicationSchedule: '',
    // Billing options
    depositAmount: '',
    paymentMethod: 'card',
    invoiceNotes: '',
    // Notifications
    sendOwnerConfirmation: true,
    sendStaffNotification: true,
    // Recurring
    isRecurring: false,
    recurringFrequency: 'weekly',
    recurringEndDate: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Essential Fields - Always Visible */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">
          Basic Information
        </h3>

        <Input
          label="Pet"
          required
          placeholder="Select pet..."
          value={formData.petId}
          onChange={(e) => updateField('petId', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            required
            value={formData.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
          />
        </div>

        <Input
          label="Service Type"
          type="select"
          required
          value={formData.service}
          onChange={(e) => updateField('service', e.target.value)}
        >
          <option value="boarding">Boarding</option>
          <option value="daycare">Daycare</option>
          <option value="grooming">Grooming</option>
        </Input>
      </div>

      {/* Progressive Disclosure Sections */}
      <ProgressiveFormGroup>
        {/* Facility & Care Options */}
        <ProgressiveFormSection
          title="Facility & Care Options"
          description="Optional preferences for kennel assignment and special care"
          icon={Settings}
        >
          <div className="space-y-4">
            <Input
              label="Preferred Kennel"
              placeholder="Leave blank for automatic assignment"
              value={formData.specificKennel}
              onChange={(e) => updateField('specificKennel', e.target.value)}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">
                Special Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md bg-white dark:bg-surface-secondary text-gray-900 dark:text-text-primary"
                rows={3}
                placeholder="Any special care instructions..."
                value={formData.specialInstructions}
                onChange={(e) => updateField('specialInstructions', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">
                Medication Schedule
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md bg-white dark:bg-surface-secondary text-gray-900 dark:text-text-primary"
                rows={2}
                placeholder="Medication times and dosages..."
                value={formData.medicationSchedule}
                onChange={(e) => updateField('medicationSchedule', e.target.value)}
              />
            </div>
          </div>
        </ProgressiveFormSection>

        {/* Billing Options */}
        <ProgressiveFormSection
          title="Billing & Payment"
          description="Customize deposit and payment options"
          icon={DollarSign}
        >
          <div className="space-y-4">
            <Input
              label="Deposit Amount"
              type="number"
              placeholder="0.00"
              value={formData.depositAmount}
              onChange={(e) => updateField('depositAmount', e.target.value)}
            />

            <Input
              label="Payment Method"
              type="select"
              value={formData.paymentMethod}
              onChange={(e) => updateField('paymentMethod', e.target.value)}
            >
              <option value="card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="account">Account Credit</option>
            </Input>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">
                Invoice Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md bg-white dark:bg-surface-secondary text-gray-900 dark:text-text-primary"
                rows={2}
                placeholder="Notes to appear on invoice..."
                value={formData.invoiceNotes}
                onChange={(e) => updateField('invoiceNotes', e.target.value)}
              />
            </div>
          </div>
        </ProgressiveFormSection>

        {/* Notifications */}
        <ProgressiveFormSection
          title="Notifications"
          description="Configure confirmation and notification settings"
          icon={Users}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sendOwnerConfirmation}
                onChange={(e) => updateField('sendOwnerConfirmation', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm text-gray-700 dark:text-text-secondary">
                Send confirmation email to owner
              </span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sendStaffNotification}
                onChange={(e) => updateField('sendStaffNotification', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm text-gray-700 dark:text-text-secondary">
                Notify assigned staff members
              </span>
            </label>
          </div>
        </ProgressiveFormSection>

        {/* Recurring Booking */}
        <ProgressiveFormSection
          title="Recurring Booking"
          description="Set up repeating bookings (e.g., weekly daycare)"
          icon={Calendar}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) => updateField('isRecurring', e.target.checked)}
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">
                Make this a recurring booking
              </span>
            </label>

            {/* Conditional fields - only show when recurring is enabled */}
            <ConditionalFormField condition={formData.isRecurring}>
              <div className="space-y-4 pl-6 border-l-2 border-blue-500 dark:border-blue-400">
                <Input
                  label="Frequency"
                  type="select"
                  value={formData.recurringFrequency}
                  onChange={(e) => updateField('recurringFrequency', e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </Input>

                <Input
                  label="Repeat Until"
                  type="date"
                  value={formData.recurringEndDate}
                  onChange={(e) => updateField('recurringEndDate', e.target.value)}
                />
              </div>
            </ConditionalFormField>
          </div>
        </ProgressiveFormSection>
      </ProgressiveFormGroup>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-surface-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Create Booking
        </Button>
      </div>
    </form>
  );
};

export default BookingFormExample;
