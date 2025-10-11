import { useState } from 'react';
import { Mail, MessageSquare, Clock, Timer, GitBranch, CheckSquare, DollarSign, Star } from 'lucide-react';
import Button from '@/components/ui/Button';

// Email action configuration
const EmailConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Email Template</label>
        <select
          defaultValue={nodeData?.emailTemplate || ''}
          onChange={(e) => onChange({ emailTemplate: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select template...</option>
          <option value="booking-confirmation">Booking Confirmation</option>
          <option value="check-in-reminder">Check-in Reminder</option>
          <option value="check-out-summary">Check-out Summary</option>
          <option value="payment-receipt">Payment Receipt</option>
          <option value="review-request">Review Request</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Subject Line</label>
        <input
          type="text"
          defaultValue={nodeData?.emailSubject || ''}
          onChange={(e) => onChange({ emailSubject: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="e.g., Your booking is confirmed!"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Send to</label>
        <select
          defaultValue={nodeData?.emailRecipient || 'owner'}
          onChange={(e) => onChange({ emailRecipient: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="owner">Pet Owner</option>
          <option value="emergency_contact">Emergency Contact</option>
          <option value="custom">Custom Email Address</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 flex items-center gap-1">
          <input type="checkbox" defaultChecked={nodeData?.includeAttachment || false} />
          <span>Include booking summary PDF</span>
        </label>
      </div>
    </div>
  );
};

// SMS action configuration
const SmsConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">SMS Template</label>
        <select
          defaultValue={nodeData?.smsTemplate || ''}
          onChange={(e) => onChange({ smsTemplate: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select template...</option>
          <option value="reminder-24h">24-Hour Reminder</option>
          <option value="check-in-ready">Check-in Ready</option>
          <option value="update-notification">Update Notification</option>
          <option value="payment-reminder">Payment Reminder</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Message</label>
        <textarea
          defaultValue={nodeData?.smsMessage || ''}
          onChange={(e) => onChange({ smsMessage: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
          placeholder="Hi {{owner.firstName}}, this is a reminder about {{pet.name}}'s stay..."
          rows={4}
        />
        <div className="text-xs text-muted mt-1">
          Character count: {(nodeData?.smsMessage || '').length} / 160
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Send to</label>
        <select
          defaultValue={nodeData?.smsRecipient || 'owner_mobile'}
          onChange={(e) => onChange({ smsRecipient: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="owner_mobile">Owner Mobile</option>
          <option value="owner_home">Owner Home Phone</option>
          <option value="emergency_contact">Emergency Contact</option>
        </select>
      </div>
    </div>
  );
};

// Delay duration configuration
const DelayDurationConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Wait for</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            defaultValue={nodeData?.delayValue || 1}
            onChange={(e) => onChange({ delayValue: parseInt(e.target.value) })}
            className="w-20 px-3 py-2 text-sm border border-border rounded bg-background text-text"
          />
          <select
            defaultValue={nodeData?.delayUnit || 'hours'}
            onChange={(e) => onChange({ delayUnit: e.target.value })}
            className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background text-text"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-text">
        <strong>Example:</strong> Wait 24 hours after booking is created before sending reminder email.
      </div>
    </div>
  );
};

// Delay until configuration
const DelayUntilConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Wait until</label>
        <select
          defaultValue={nodeData?.delayUntilType || 'time'}
          onChange={(e) => onChange({ delayUntilType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="time">Specific time of day</option>
          <option value="date_field">Date/time from field</option>
          <option value="business_hours">Next business hours</option>
        </select>
      </div>

      {nodeData?.delayUntilType === 'time' && (
        <div>
          <label className="text-xs font-medium text-text mb-1 block">Time</label>
          <input
            type="time"
            defaultValue={nodeData?.delayTime || '09:00'}
            onChange={(e) => onChange({ delayTime: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          />
        </div>
      )}

      {nodeData?.delayUntilType === 'date_field' && (
        <div>
          <label className="text-xs font-medium text-text mb-1 block">Date field</label>
          <select
            defaultValue={nodeData?.dateField || ''}
            onChange={(e) => onChange({ dateField: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          >
            <option value="">Select field...</option>
            <option value="booking.checkInDate">Check-in Date</option>
            <option value="booking.checkOutDate">Check-out Date</option>
            <option value="invoice.dueDate">Invoice Due Date</option>
            <option value="pet.vaccinationExpiry">Vaccination Expiry</option>
          </select>
        </div>
      )}

      {nodeData?.delayUntilType === 'business_hours' && (
        <div className="p-3 bg-background border border-border rounded">
          <div className="text-xs font-medium text-text mb-2">Business hours</div>
          <div className="text-xs text-muted">Monday - Friday, 9:00 AM - 5:00 PM</div>
          <Button variant="ghost" size="sm" className="mt-2 text-xs">
            Configure hours
          </Button>
        </div>
      )}
    </div>
  );
};

// If/Then condition configuration
const ConditionConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Check if</label>
        <select
          defaultValue={nodeData?.conditionField || ''}
          onChange={(e) => onChange({ conditionField: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select field...</option>
          <optgroup label="Booking">
            <option value="booking.status">Booking Status</option>
            <option value="booking.totalAmount">Total Amount</option>
            <option value="booking.accommodationType">Accommodation Type</option>
            <option value="booking.numberOfPets">Number of Pets</option>
          </optgroup>
          <optgroup label="Pet">
            <option value="pet.species">Species</option>
            <option value="pet.breed">Breed</option>
            <option value="pet.size">Size</option>
            <option value="pet.age">Age</option>
            <option value="pet.vaccinationStatus">Vaccination Status</option>
          </optgroup>
          <optgroup label="Owner">
            <option value="owner.tier">Customer Tier</option>
            <option value="owner.totalBookings">Total Bookings</option>
            <option value="owner.accountBalance">Account Balance</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Condition</label>
        <select
          defaultValue={nodeData?.conditionOperator || 'equals'}
          onChange={(e) => onChange({ conditionOperator: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="equals">Equals</option>
          <option value="not_equals">Does not equal</option>
          <option value="greater_than">Greater than</option>
          <option value="less_than">Less than</option>
          <option value="contains">Contains</option>
          <option value="is_empty">Is empty</option>
          <option value="is_not_empty">Is not empty</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Value</label>
        <input
          type="text"
          defaultValue={nodeData?.conditionValue || ''}
          onChange={(e) => onChange({ conditionValue: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="Enter value to compare"
        />
      </div>

      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
        <div className="text-xs font-medium text-text mb-1">Branch behavior</div>
        <div className="text-xs text-muted">
          If condition is TRUE, continue with actions below. If FALSE, skip to next step after this branch.
        </div>
      </div>
    </div>
  );
};

// Task creation configuration
const TaskConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Task Title</label>
        <input
          type="text"
          defaultValue={nodeData?.taskTitle || ''}
          onChange={(e) => onChange({ taskTitle: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="e.g., Prepare special meal for {{pet.name}}"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Assign to</label>
        <select
          defaultValue={nodeData?.taskAssignee || ''}
          onChange={(e) => onChange({ taskAssignee: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select team member...</option>
          <option value="role:groomer">Any Groomer</option>
          <option value="role:handler">Any Handler</option>
          <option value="role:manager">Manager</option>
          <option value="user:1">Sarah Johnson</option>
          <option value="user:2">Mike Chen</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Due</label>
        <select
          defaultValue={nodeData?.taskDue || 'same_day'}
          onChange={(e) => onChange({ taskDue: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="immediately">Immediately</option>
          <option value="same_day">Same day (end of day)</option>
          <option value="check_in">On check-in day</option>
          <option value="check_out">On check-out day</option>
          <option value="custom">Custom date</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Priority</label>
        <select
          defaultValue={nodeData?.taskPriority || 'normal'}
          onChange={(e) => onChange({ taskPriority: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
  );
};

// Set field configuration
const SetFieldConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Select field to update</label>
        <select
          defaultValue={nodeData?.targetField || ''}
          onChange={(e) => onChange({ targetField: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select field...</option>
          <optgroup label="Booking">
            <option value="booking.status">Status</option>
            <option value="booking.notes">Notes</option>
            <option value="booking.specialRequests">Special Requests</option>
          </optgroup>
          <optgroup label="Pet">
            <option value="pet.notes">Pet Notes</option>
            <option value="pet.dietaryRestrictions">Dietary Restrictions</option>
            <option value="pet.medicalNotes">Medical Notes</option>
          </optgroup>
          <optgroup label="Owner">
            <option value="owner.tier">Customer Tier</option>
            <option value="owner.preferredContact">Preferred Contact Method</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Set to</label>
        <input
          type="text"
          defaultValue={nodeData?.fieldValue || ''}
          onChange={(e) => onChange({ fieldValue: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="Enter new value or {{variable}}"
        />
      </div>

      <div className="p-3 bg-background border border-border rounded">
        <div className="text-xs font-medium text-text mb-1">Available variables</div>
        <div className="text-xs text-muted font-mono space-y-1">
          <div>{'{{pet.name}}'}</div>
          <div>{'{{owner.firstName}}'}</div>
          <div>{'{{booking.checkInDate}}'}</div>
          <div>{'{{today}}'}</div>
        </div>
      </div>
    </div>
  );
};

// Invoice/Fee configuration
const FeeDiscountConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Type</label>
        <select
          defaultValue={nodeData?.feeType || 'fee'}
          onChange={(e) => onChange({ feeType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="fee">Add Fee</option>
          <option value="discount">Apply Discount</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Description</label>
        <input
          type="text"
          defaultValue={nodeData?.feeDescription || ''}
          onChange={(e) => onChange({ feeDescription: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="e.g., Late check-in fee, Multi-pet discount"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Amount</label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            defaultValue={nodeData?.feeAmount || ''}
            onChange={(e) => onChange({ feeAmount: parseFloat(e.target.value) })}
            className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background text-text"
            placeholder="0.00"
          />
          <select
            defaultValue={nodeData?.feeAmountType || 'fixed'}
            onChange={(e) => onChange({ feeAmountType: e.target.value })}
            className="w-24 px-3 py-2 text-sm border border-border rounded bg-background text-text"
          >
            <option value="fixed">$</option>
            <option value="percent">%</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// Review request configuration
const ReviewRequestConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Review Platform</label>
        <select
          defaultValue={nodeData?.reviewPlatform || 'google'}
          onChange={(e) => onChange({ reviewPlatform: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="google">Google Reviews</option>
          <option value="yelp">Yelp</option>
          <option value="facebook">Facebook</option>
          <option value="custom">Custom Review Link</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Send after</label>
        <select
          defaultValue={nodeData?.reviewTiming || 'checkout'}
          onChange={(e) => onChange({ reviewTiming: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="checkout">Immediately after check-out</option>
          <option value="1day">1 day after check-out</option>
          <option value="3days">3 days after check-out</option>
          <option value="1week">1 week after check-out</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 flex items-center gap-1">
          <input type="checkbox" defaultChecked={nodeData?.onlyPositive || false} />
          <span>Only send to satisfied customers (4+ star ratings)</span>
        </label>
      </div>
    </div>
  );
};

// Internal notification configuration
const NotificationConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Notification Type</label>
        <select
          defaultValue={nodeData?.notificationType || 'in-app'}
          onChange={(e) => onChange({ notificationType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="in-app">In-App Notification</option>
          <option value="email">Email to Team</option>
          <option value="slack">Slack Message</option>
          <option value="all">All of the above</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Send to</label>
        <select
          defaultValue={nodeData?.notifyWho || ''}
          onChange={(e) => onChange({ notifyWho: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select recipient...</option>
          <option value="role:manager">All Managers</option>
          <option value="role:groomer">All Groomers</option>
          <option value="role:handler">All Handlers</option>
          <option value="assigned">Assigned Staff Member</option>
          <option value="custom">Specific Person</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Message</label>
        <textarea
          defaultValue={nodeData?.notificationMessage || ''}
          onChange={(e) => onChange({ notificationMessage: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="{{pet.name}} has special dietary requirements for their stay starting {{booking.checkInDate}}"
          rows={3}
        />
      </div>
    </div>
  );
};

// Print document configuration
const PrintDocumentConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Document Type</label>
        <select
          defaultValue={nodeData?.documentType || ''}
          onChange={(e) => onChange({ documentType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select document...</option>
          <option value="run-card">Run Card / Kennel Card</option>
          <option value="meal-plan">Meal Plan</option>
          <option value="medication-schedule">Medication Schedule</option>
          <option value="invoice">Invoice</option>
          <option value="receipt">Receipt</option>
          <option value="check-in-form">Check-in Form</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Print to</label>
        <select
          defaultValue={nodeData?.printer || 'default'}
          onChange={(e) => onChange({ printer: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="default">Default Printer</option>
          <option value="reception">Reception Desk</option>
          <option value="kennel">Kennel Area</option>
          <option value="grooming">Grooming Station</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Number of Copies</label>
        <input
          type="number"
          min="1"
          max="10"
          defaultValue={nodeData?.copies || 1}
          onChange={(e) => onChange({ copies: parseInt(e.target.value) })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        />
      </div>
    </div>
  );
};

// Create record configuration
const CreateRecordConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Record Type</label>
        <select
          defaultValue={nodeData?.recordType || ''}
          onChange={(e) => onChange({ recordType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select type...</option>
          <option value="booking">Booking</option>
          <option value="invoice">Invoice</option>
          <option value="note">Note</option>
          <option value="log-entry">Log Entry</option>
          <option value="activity">Activity Record</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Associate with</label>
        <select
          defaultValue={nodeData?.associateWith || 'current'}
          onChange={(e) => onChange({ associateWith: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="current">Current Record</option>
          <option value="pet">Associated Pet</option>
          <option value="owner">Pet Owner</option>
          <option value="booking">Associated Booking</option>
        </select>
      </div>

      <div className="p-3 bg-background border border-border rounded">
        <div className="text-xs font-medium text-text mb-2">Template Fields</div>
        <div className="text-xs text-muted">
          Configure default values for the new record in the advanced settings
        </div>
      </div>
    </div>
  );
};

// Create note configuration
const CreateNoteConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Note Title</label>
        <input
          type="text"
          defaultValue={nodeData?.noteTitle || ''}
          onChange={(e) => onChange({ noteTitle: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="e.g., Special care instructions"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Note Content</label>
        <textarea
          defaultValue={nodeData?.noteContent || ''}
          onChange={(e) => onChange({ noteContent: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="{{pet.name}} requires..."
          rows={4}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Attach to</label>
        <select
          defaultValue={nodeData?.noteAttachTo || 'pet'}
          onChange={(e) => onChange({ noteAttachTo: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="pet">Pet Profile</option>
          <option value="owner">Owner Profile</option>
          <option value="booking">Current Booking</option>
        </select>
      </div>
    </div>
  );
};

// Update status configuration
const UpdateStatusConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Record Type</label>
        <select
          defaultValue={nodeData?.statusRecordType || 'booking'}
          onChange={(e) => onChange({ statusRecordType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="booking">Booking</option>
          <option value="invoice">Invoice</option>
          <option value="ticket">Support Ticket</option>
          <option value="task">Task</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">New Status</label>
        <select
          defaultValue={nodeData?.newStatus || ''}
          onChange={(e) => onChange({ newStatus: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select status...</option>
          {nodeData?.statusRecordType === 'booking' && (
            <>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked In</option>
              <option value="checked-out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
            </>
          )}
          {nodeData?.statusRecordType === 'invoice' && (
            <>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </>
          )}
        </select>
      </div>
    </div>
  );
};

// Schedule service configuration
const ScheduleServiceConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Service Type</label>
        <select
          defaultValue={nodeData?.serviceType || ''}
          onChange={(e) => onChange({ serviceType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select service...</option>
          <option value="grooming">Grooming</option>
          <option value="bath">Bath</option>
          <option value="nail-trim">Nail Trim</option>
          <option value="training">Training Session</option>
          <option value="playtime">Extra Playtime</option>
          <option value="medication">Medication Administration</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Schedule for</label>
        <select
          defaultValue={nodeData?.serviceSchedule || 'check-in'}
          onChange={(e) => onChange({ serviceSchedule: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="check-in">On check-in day</option>
          <option value="mid-stay">Mid-stay</option>
          <option value="check-out">Before check-out</option>
          <option value="specific">Specific date/time</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Price</label>
        <input
          type="number"
          step="0.01"
          defaultValue={nodeData?.servicePrice || ''}
          onChange={(e) => onChange({ servicePrice: parseFloat(e.target.value) })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 flex items-center gap-1">
          <input type="checkbox" defaultChecked={nodeData?.addToInvoice || true} />
          <span>Automatically add to invoice</span>
        </label>
      </div>
    </div>
  );
};

// Vaccination status configuration
const VaccinationConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Vaccination Type</label>
        <select
          defaultValue={nodeData?.vaccinationType || ''}
          onChange={(e) => onChange({ vaccinationType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select vaccination...</option>
          <option value="rabies">Rabies</option>
          <option value="dhpp">DHPP</option>
          <option value="bordetella">Bordetella</option>
          <option value="influenza">Canine Influenza</option>
          <option value="fvrcp">FVRCP (Cats)</option>
          <option value="felv">FeLV (Cats)</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Status</label>
        <select
          defaultValue={nodeData?.vaccinationStatus || ''}
          onChange={(e) => onChange({ vaccinationStatus: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="current">Current</option>
          <option value="expiring-soon">Expiring Soon</option>
          <option value="expired">Expired</option>
          <option value="not-required">Not Required</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Expiry Date</label>
        <input
          type="date"
          defaultValue={nodeData?.expiryDate || ''}
          onChange={(e) => onChange({ expiryDate: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        />
      </div>
    </div>
  );
};

// Webhook configuration
const WebhookConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Webhook URL</label>
        <input
          type="url"
          defaultValue={nodeData?.webhookUrl || ''}
          onChange={(e) => onChange({ webhookUrl: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
          placeholder="https://api.example.com/webhook"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Method</label>
        <select
          defaultValue={nodeData?.webhookMethod || 'POST'}
          onChange={(e) => onChange({ webhookMethod: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Headers (JSON)</label>
        <textarea
          defaultValue={nodeData?.webhookHeaders || '{}'}
          onChange={(e) => onChange({ webhookHeaders: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
          rows={3}
          placeholder={'{\n  "Authorization": "Bearer token"\n}'}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-text mb-1 block">Body Template (JSON)</label>
        <textarea
          defaultValue={nodeData?.webhookBody || ''}
          onChange={(e) => onChange({ webhookBody: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
          rows={4}
          placeholder={'{\n  "petName": "{{pet.name}}",\n  "ownerId": "{{owner.id}}"\n}'}
        />
      </div>
    </div>
  );
};

// Segment management configuration
const SegmentConfig = ({ nodeData, onChange }) => {
  const isAdd = nodeData?.actionType === 'add-segment';

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Segment/List</label>
        <select
          defaultValue={nodeData?.segmentId || ''}
          onChange={(e) => onChange({ segmentId: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
        >
          <option value="">Select segment...</option>
          <option value="vip">VIP Customers</option>
          <option value="frequent">Frequent Visitors</option>
          <option value="new">New Customers</option>
          <option value="inactive">Inactive Customers</option>
          <option value="vaccination-expiring">Vaccination Expiring Soon</option>
        </select>
      </div>

      <div className="p-3 bg-background border border-border rounded">
        <div className="text-xs text-muted">
          {isAdd ? 'Pet owner will be added to' : 'Pet owner will be removed from'} the selected segment
        </div>
      </div>
    </div>
  );
};

// Generic configuration (fallback)
const GenericConfig = ({ nodeData, onChange }) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Label</label>
        <input
          type="text"
          defaultValue={nodeData?.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="Enter action label"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-text mb-1 block">Description</label>
        <textarea
          defaultValue={nodeData?.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
          placeholder="Enter action description"
          rows={3}
        />
      </div>
      <div className="p-3 rounded-lg border border-border bg-background">
        <p className="text-xs text-muted">
          Additional configuration options for this action type are coming soon.
        </p>
      </div>
    </div>
  );
};

// Main ActionConfigurator component
const ActionConfigurator = ({ node, onUpdate }) => {
  const [localData, setLocalData] = useState(node?.data || {});

  const handleChange = (updates) => {
    const newData = { ...localData, ...updates };
    setLocalData(newData);
    if (onUpdate) {
      onUpdate(node.id, newData);
    }
  };

  const actionType = node?.data?.actionType;
  const nodeType = node?.type;

  // Map action types to configuration components
  const getConfigComponent = () => {
    // Delay actions
    if (actionType === 'delay-duration' || nodeType === 'delay') {
      return <DelayDurationConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'delay-until') {
      return <DelayUntilConfig nodeData={localData} onChange={handleChange} />;
    }

    // Communication actions
    if (actionType === 'email') {
      return <EmailConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'sms') {
      return <SmsConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'review') {
      return <ReviewRequestConfig nodeData={localData} onChange={handleChange} />;
    }

    // Staff actions
    if (actionType === 'task') {
      return <TaskConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'notification') {
      return <NotificationConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'print') {
      return <PrintDocumentConfig nodeData={localData} onChange={handleChange} />;
    }

    // Record actions
    if (actionType === 'set-field') {
      return <SetFieldConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'create-record') {
      return <CreateRecordConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'note') {
      return <CreateNoteConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'update-status') {
      return <UpdateStatusConfig nodeData={localData} onChange={handleChange} />;
    }

    // Billing actions
    if (actionType === 'fee-discount') {
      return <FeeDiscountConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'invoice' || actionType === 'payment-reminder') {
      return <FeeDiscountConfig nodeData={localData} onChange={handleChange} />;
    }

    // Pet service actions
    if (actionType === 'schedule-service') {
      return <ScheduleServiceConfig nodeData={localData} onChange={handleChange} />;
    }
    if (actionType === 'vaccination') {
      return <VaccinationConfig nodeData={localData} onChange={handleChange} />;
    }

    // Segment actions
    if (actionType === 'add-segment' || actionType === 'remove-segment') {
      return <SegmentConfig nodeData={localData} onChange={handleChange} />;
    }

    // Advanced actions
    if (actionType === 'webhook') {
      return <WebhookConfig nodeData={localData} onChange={handleChange} />;
    }

    // Condition/logic actions
    if (actionType === 'if-then' || nodeType === 'condition') {
      return <ConditionConfig nodeData={localData} onChange={handleChange} />;
    }

    // Fallback to generic config
    return <GenericConfig nodeData={localData} onChange={handleChange} />;
  };

  return (
    <div className="space-y-4">
      {/* Action header */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-2">Action Details</h3>
        <div className="p-3 rounded-lg border border-border bg-background">
          <div className="text-sm font-medium text-text mb-1">
            {node?.data?.label || 'Untitled Action'}
          </div>
          <div className="text-xs text-muted">
            Type: {nodeType} {actionType ? `(${actionType})` : ''}
          </div>
        </div>
      </div>

      {/* Configuration form */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-2">Configuration</h3>
        {getConfigComponent()}
      </div>

      {/* Save button */}
      <div className="pt-2 border-t border-border">
        <Button variant="primary" size="sm" className="w-full">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default ActionConfigurator;
