import { useState } from 'react';
import { Mail, Smartphone, Monitor, Clock, Bell, Users, History, AlertTriangle, User, TestTube, Smartphone as MobileIcon, Moon } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CommunicationChannels from './components/CommunicationChannels';
import NotificationSchedule from './components/NotificationSchedule';
import ActivityAlerts from './components/ActivityAlerts';
import TeamRouting from './components/TeamRouting';
import NotificationHistory from './components/NotificationHistory';
import CriticalAlerts from './components/CriticalAlerts';
import CustomerNotifications from './components/CustomerNotifications';
import NotificationTesting from './components/NotificationTesting';
import MobilePush from './components/MobilePush';
import DoNotDisturb from './components/DoNotDisturb';

const NotificationsOverview = () => {
  const [preferences, setPreferences] = useState({
    email: {
      enabled: true,
      address: 'joshua.r.bradford1@gmail.com'
    },
    sms: {
      enabled: false,
      number: null
    },
    inApp: {
      enabled: true
    },
    push: {
      enabled: false
    },
    schedule: {
      frequency: 'real-time',
      quietHours: {
        enabled: true,
        start: '23:00',
        end: '07:00',
        emailsOnly: true
      },
      doNotDisturb: {
        enabled: false
      }
    },
    activityAlerts: {
      bookings: {
        newBooking: true,
        cancellation: true,
        modification: true,
        waitlistOpening: false,
        capacityWarning: false,
        dailySummary: false
      },
      payments: {
        paymentReceived: true,
        paymentFailed: true,
        refundProcessed: false,
        creditsExpiring: false,
        outstandingBalance: false
      },
      petHealth: {
        vaccinationExpiring: true,
        vaccinationExpired: true,
        medicationDue: false,
        incidentReport: false,
        emergencyContact: false
      },
      customerComm: {
        newInquiry: true,
        reviewReceived: false,
        feedbackSubmitted: false,
        reportCardViewed: false
      },
      staffOps: {
        staffClockInOut: false,
        shiftReminders: false,
        taskCompletion: false,
        inventoryLow: false
      }
    },
    criticalAlerts: {
      paymentFailures: true,
      systemDowntime: true,
      securityAlerts: true,
      emergencyIncidents: true,
      sameDayCancellations: true,
      channels: ['email', 'sms', 'inApp']
    },
    customerNotifications: {
      confirmations: 'immediate',
      reminders: {
        sevenDays: true,
        twentyFourHours: true,
        dayOf: true,
        hoursBefore: 2
      },
      reportCards: {
        enabled: true,
        photoUpdates: true,
        timing: 'end-of-day'
      },
      marketing: {
        birthdays: true,
        rebooking: false,
        seasonal: false,
        newsletter: false
      }
    }
  });

  const handleSave = async () => {
    try {
      // Save preferences to API
      const response = await fetch('/api/v1/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        alert('Notification preferences saved successfully!');
      } else {
        alert('Failed to save preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleReset = () => {
    // TODO: Reset to default preferences
    console.log('Resetting notification preferences');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-600">Email and communication preferences</p>
      </div>

      {/* Communication Channels */}
      <CommunicationChannels
        preferences={preferences}
        onUpdate={(updates) => setPreferences(prev => ({ ...prev, ...updates }))}
      />

      {/* Notification Schedule */}
      <NotificationSchedule
        schedule={preferences.schedule}
        onUpdate={(schedule) => setPreferences(prev => ({ ...prev, schedule }))}
      />

      {/* Activity Alerts */}
      <ActivityAlerts
        alerts={preferences.activityAlerts}
        onUpdate={(activityAlerts) => setPreferences(prev => ({ ...prev, activityAlerts }))}
      />

      {/* Team Notification Routing */}
      <TeamRouting />

      {/* Critical Alerts */}
      <CriticalAlerts
        alerts={preferences.criticalAlerts}
        onUpdate={(criticalAlerts) => setPreferences(prev => ({ ...prev, criticalAlerts }))}
      />

      {/* Customer Notifications */}
      <CustomerNotifications
        notifications={preferences.customerNotifications}
        onUpdate={(customerNotifications) => setPreferences(prev => ({ ...prev, customerNotifications }))}
      />

      {/* Mobile Push Notifications */}
      <MobilePush />

      {/* Do Not Disturb */}
      <DoNotDisturb
        dnd={preferences.schedule.doNotDisturb}
        onUpdate={(doNotDisturb) => setPreferences(prev => ({
          ...prev,
          schedule: { ...prev.schedule, doNotDisturb }
        }))}
      />

      {/* Recent Notifications */}
      <NotificationHistory />

      {/* Notification Testing */}
      <NotificationTesting />

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button onClick={handleSave}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
};

export default NotificationsOverview;
