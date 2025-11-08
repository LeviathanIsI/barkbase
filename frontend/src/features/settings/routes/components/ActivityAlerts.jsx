import { useState } from 'react';
import { Calendar, CreditCard, Heart, MessageSquare, Users, ChevronDown, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const ActivityAlerts = ({ alerts, onUpdate }) => {
  const [expandedSection, setExpandedSection] = useState('bookings');

  const sections = [
    {
      id: 'bookings',
      title: 'Bookings & Scheduling',
      icon: Calendar,
      enabled: Object.values(alerts.bookings).filter(Boolean).length,
      total: Object.keys(alerts.bookings).length,
      items: [
        { key: 'newBooking', label: 'New booking received', default: true },
        { key: 'cancellation', label: 'Booking cancellation', default: true },
        { key: 'modification', label: 'Booking modification', default: true },
        { key: 'waitlistOpening', label: 'Waitlist opening available', default: false },
        { key: 'capacityWarning', label: 'Capacity approaching maximum (80% full)', default: false },
        { key: 'dailySummary', label: 'Daily schedule summary (8:00 AM)', default: false }
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Financial',
      icon: CreditCard,
      enabled: Object.values(alerts.payments).filter(Boolean).length,
      total: Object.keys(alerts.payments).length,
      items: [
        { key: 'paymentReceived', label: 'Payment received', default: true },
        { key: 'paymentFailed', label: 'Payment failed', default: true },
        { key: 'refundProcessed', label: 'Refund processed', default: false },
        { key: 'creditsExpiring', label: 'Package credits expiring soon', default: false },
        { key: 'outstandingBalance', label: 'Outstanding balance reminders', default: false }
      ]
    },
    {
      id: 'petHealth',
      title: 'Pet Health & Safety',
      icon: Heart,
      enabled: Object.values(alerts.petHealth).filter(Boolean).length,
      total: Object.keys(alerts.petHealth).length,
      items: [
        { key: 'vaccinationExpiring', label: 'Vaccination expiring soon (60 days)', default: true },
        { key: 'vaccinationExpired', label: 'Vaccination expired', default: true },
        { key: 'medicationDue', label: 'Medication due reminder', default: false },
        { key: 'incidentReport', label: 'Incident report filed', default: false },
        { key: 'emergencyContact', label: 'Emergency contact needed', default: false }
      ]
    },
    {
      id: 'customerComm',
      title: 'Customer Communication',
      icon: MessageSquare,
      enabled: Object.values(alerts.customerComm).filter(Boolean).length,
      total: Object.keys(alerts.customerComm).length,
      items: [
        { key: 'newInquiry', label: 'New customer inquiry', default: true },
        { key: 'reviewReceived', label: 'Review received', default: false },
        { key: 'feedbackSubmitted', label: 'Customer feedback submitted', default: false },
        { key: 'reportCardViewed', label: 'Report card viewed by customer', default: false }
      ]
    },
    {
      id: 'staffOps',
      title: 'Staff & Operations',
      icon: Users,
      enabled: Object.values(alerts.staffOps).filter(Boolean).length,
      total: Object.keys(alerts.staffOps).length,
      items: [
        { key: 'staffClockInOut', label: 'Staff clock in/out', default: false },
        { key: 'shiftReminders', label: 'Shift change reminders', default: false },
        { key: 'taskCompletion', label: 'Task completion updates', default: false },
        { key: 'inventoryLow', label: 'Inventory low stock alerts', default: false }
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleAlertToggle = (sectionId, alertKey, value) => {
    onUpdate({
      ...alerts,
      [sectionId]: {
        ...alerts[sectionId],
        [alertKey]: value
      }
    });
  };

  const handleManageSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <Card title="Activity Alerts" description="Manage specific event notifications">
      <div className="space-y-4">
        {/* Section Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                className="border border-gray-200 dark:border-surface-border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-surface-secondary rounded-full">
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-text-primary">{section.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-text-secondary">
                        {section.enabled} of {section.total} enabled
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageSection(section.id);
                      }}
                    >
                      Manage
                    </Button>
                    {expandedSection === section.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-500 dark:text-text-secondary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500 dark:text-text-secondary" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded Section Details */}
        {expandedSection && (
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const section = sections.find(s => s.id === expandedSection);
                const Icon = section.icon;
                return (
                  <>
                    <div className="p-2 bg-blue-100 dark:bg-surface-secondary rounded-full">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary">{section.title}</h3>
                  </>
                );
              })()}
            </div>

            <div className="space-y-3">
              {sections.find(s => s.id === expandedSection).items.map((item) => (
                <label key={item.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={alerts[expandedSection][item.key]}
                    onChange={(e) => handleAlertToggle(expandedSection, item.key, e.target.checked)}
                    className="rounded border-gray-300 dark:border-surface-border"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ActivityAlerts;
