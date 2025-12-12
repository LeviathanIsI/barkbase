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
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/stores/auth';

const NotificationsOverview = () => {
  const user = useAuthStore((state) => state.user);
  const [preferences, setPreferences] = useState({
    email: {
      enabled: true,
      address: user?.email || ''
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
      await apiClient.put('/api/v1/settings/notifications', preferences);
      toast.success('Notification preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(error.message || 'Failed to save preferences');
    }
  };

  const handleReset = () => {
    // TODO: Reset to default preferences
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Notifications</h1>
          <p className="mt-1 text-sm text-muted">Configure email, SMS, and push notification preferences</p>
        </div>
        <Button onClick={handleSave}>Save Preferences</Button>
      </header>

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
    </div>
  );
};

export default NotificationsOverview;
