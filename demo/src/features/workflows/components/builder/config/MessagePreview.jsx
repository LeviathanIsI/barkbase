/**
 * MessagePreview - SMS and Email preview component
 * Shows a mockup of how the message will appear with sample data
 */
import { useState } from 'react';
import { Eye, EyeOff, Smartphone, Mail } from 'lucide-react';
import { cn } from '@/lib/cn';

// Sample data for different object types
const SAMPLE_DATA = {
  pet: {
    'pet.name': 'Buddy',
    'pet.species': 'Dog',
    'pet.breed': 'Golden Retriever',
    'pet.age': '3',
    'pet.weight': '65 lbs',
    'owner.first_name': 'John',
    'owner.last_name': 'Smith',
    'owner.full_name': 'John Smith',
    'owner.email': 'john@example.com',
    'owner.phone': '(555) 123-4567',
    'facility.name': 'Happy Paws Kennel',
    'facility.phone': '(555) 987-6543',
  },
  booking: {
    'booking.check_in_date': 'January 15, 2025',
    'booking.check_out_date': 'January 20, 2025',
    'booking.total': '$250.00',
    'booking.status': 'Confirmed',
    'booking.confirmation_number': 'BK-12345',
    'pet.name': 'Buddy',
    'owner.first_name': 'John',
    'owner.last_name': 'Smith',
    'owner.full_name': 'John Smith',
    'facility.name': 'Happy Paws Kennel',
  },
  owner: {
    'owner.first_name': 'John',
    'owner.last_name': 'Smith',
    'owner.full_name': 'John Smith',
    'owner.email': 'john@example.com',
    'owner.phone': '(555) 123-4567',
    'facility.name': 'Happy Paws Kennel',
    'facility.phone': '(555) 987-6543',
  },
  payment: {
    'payment.amount': '$125.00',
    'payment.status': 'Completed',
    'payment.date': 'January 10, 2025',
    'owner.first_name': 'John',
    'owner.last_name': 'Smith',
    'facility.name': 'Happy Paws Kennel',
  },
  invoice: {
    'invoice.number': 'INV-2025-001',
    'invoice.total': '$350.00',
    'invoice.due_date': 'January 25, 2025',
    'owner.first_name': 'John',
    'owner.last_name': 'Smith',
    'facility.name': 'Happy Paws Kennel',
  },
  task: {
    'task.title': 'Follow up with owner',
    'task.due_date': 'January 12, 2025',
    'task.priority': 'High',
    'owner.first_name': 'John',
    'owner.last_name': 'Smith',
    'facility.name': 'Happy Paws Kennel',
  },
};

/**
 * Replace {{token}} placeholders with sample data
 */
function replaceTokens(text, objectType) {
  if (!text) return '';

  const data = SAMPLE_DATA[objectType] || SAMPLE_DATA.pet;

  return text.replace(/\{\{([^}]+)\}\}/g, (match, token) => {
    const key = token.trim();
    return data[key] || match;
  });
}

/**
 * SMS Preview mockup
 */
function SmsPreview({ content }) {
  return (
    <div className="bg-[var(--bb-color-bg-body)] rounded-xl p-4 max-w-[280px]">
      {/* Phone header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--bb-color-border-subtle)]">
        <Smartphone size={14} className="text-[var(--bb-color-text-tertiary)]" />
        <span className="text-xs text-[var(--bb-color-text-tertiary)]">SMS Preview</span>
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'rounded-2xl rounded-bl-sm px-4 py-2.5',
          'bg-[var(--bb-color-accent)] text-white',
          'text-sm leading-relaxed'
        )}
      >
        {content || 'Your message will appear here...'}
      </div>

      {/* Timestamp */}
      <div className="text-right mt-1">
        <span className="text-xs text-[var(--bb-color-text-tertiary)]">Just now</span>
      </div>
    </div>
  );
}

/**
 * Email Preview mockup
 */
function EmailPreview({ subject, content, fromName }) {
  return (
    <div className="bg-[var(--bb-color-bg-body)] rounded-lg overflow-hidden max-w-md">
      {/* Email header */}
      <div className="bg-[var(--bb-color-bg-elevated)] px-4 py-3 border-b border-[var(--bb-color-border-subtle)]">
        <div className="flex items-center gap-2 mb-2">
          <Mail size={14} className="text-[var(--bb-color-text-tertiary)]" />
          <span className="text-xs text-[var(--bb-color-text-tertiary)]">Email Preview</span>
        </div>

        {fromName && (
          <div className="text-xs text-[var(--bb-color-text-secondary)] mb-1">
            From: <span className="text-[var(--bb-color-text-primary)]">{fromName}</span>
          </div>
        )}

        {subject && (
          <div className="font-medium text-[var(--bb-color-text-primary)]">{subject}</div>
        )}
      </div>

      {/* Email body */}
      <div className="p-4 text-sm text-[var(--bb-color-text-secondary)] whitespace-pre-wrap">
        {content || 'Your email content will appear here...'}
      </div>
    </div>
  );
}

/**
 * MessagePreview - Main component
 */
export default function MessagePreview({
  type,
  content,
  subject,
  fromName,
  objectType = 'pet',
}) {
  const [showPreview, setShowPreview] = useState(false);

  // Replace tokens with sample values
  const previewContent = replaceTokens(content, objectType);
  const previewSubject = subject ? replaceTokens(subject, objectType) : null;

  if (!content && !subject) return null;

  return (
    <div className="mt-4 border-t border-[var(--bb-color-border-subtle)] pt-4">
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        className={cn(
          'flex items-center gap-2 text-sm',
          'text-[var(--bb-color-accent)] hover:text-[var(--bb-color-accent-hover)]'
        )}
      >
        {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
        {showPreview ? 'Hide preview' : 'Show preview'}
      </button>

      {showPreview && (
        <div className="mt-3">
          {type === 'sms' ? (
            <SmsPreview content={previewContent} />
          ) : (
            <EmailPreview subject={previewSubject} content={previewContent} fromName={fromName} />
          )}

          <p className="text-xs text-[var(--bb-color-text-tertiary)] mt-3">
            Preview uses sample data. Actual values will vary per record.
          </p>
        </div>
      )}
    </div>
  );
}
