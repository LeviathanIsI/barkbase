import { History, Mail, Smartphone, Monitor, CheckCircle, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const NotificationHistory = () => {
  // Mock notification history
  const notifications = [
    {
      id: 1,
      date: 'Today',
      time: '9:30 AM',
      title: 'New booking: Max (Golden Retriever)',
      description: 'March 15-18',
      type: 'booking',
      channels: ['Email', 'In-App'],
      status: 'delivered',
      icon: Mail
    },
    {
      id: 2,
      date: 'Today',
      time: '8:45 AM',
      title: 'Payment received: $285.00',
      description: 'from Sarah Johnson',
      type: 'payment',
      channels: ['Email'],
      status: 'delivered',
      icon: Mail
    },
    {
      id: 3,
      date: 'Yesterday',
      time: '3:20 PM',
      title: 'Vaccination expiring: Luna needs rabies vaccine',
      description: 'by March 1',
      type: 'health',
      channels: ['Email', 'SMS'],
      status: 'delivered',
      icon: AlertTriangle
    },
    {
      id: 4,
      date: 'Yesterday',
      time: '2:15 PM',
      title: 'New customer inquiry',
      description: 'Question about daycare rates',
      type: 'inquiry',
      channels: ['Email'],
      status: 'delivered',
      icon: Mail
    },
    {
      id: 5,
      date: '2 days ago',
      time: '10:30 AM',
      title: 'Booking modification: Bella check-in changed',
      description: 'Now arriving at 9:00 AM instead of 8:00 AM',
      type: 'booking',
      channels: ['Email'],
      status: 'delivered',
      icon: Mail
    }
  ];

  const getChannelIcon = (channel) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return Mail;
      case 'sms':
        return Smartphone;
      case 'in-app':
        return Monitor;
      default:
        return Mail;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'booking':
        return 'text-blue-600 dark:text-blue-400';
      case 'payment':
        return 'text-green-600';
      case 'health':
        return 'text-red-600';
      case 'inquiry':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-text-secondary';
    }
  };

  const handleViewAll = () => {
    // TODO: Open full notification history
  };

  const handleTestNotification = () => {
    // TODO: Open test notification modal
  };

  return (
    <Card title="Recent Notifications" icon={History}>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-text-secondary">
          See what notifications you've received
        </p>

        {/* Notification List */}
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <div key={notification.id} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 dark:bg-surface-secondary rounded-full">
                    <Icon className={`w-4 h-4 ${getTypeColor(notification.type)}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-text-primary">{notification.title}</h4>
                      <span className="text-sm text-gray-500 dark:text-text-secondary">{notification.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">{notification.description}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-text-secondary">
                      <span>{notification.date}</span>
                      <div className="flex items-center gap-1">
                        <span>Delivered via:</span>
                        {notification.channels.map((channel, idx) => {
                          const ChannelIcon = getChannelIcon(channel);
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <ChannelIcon className="w-3 h-3" />
                              <span>{channel}</span>
                              {idx < notification.channels.length - 1 && <span>•</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleViewAll}>
            View All
          </Button>
          <Button onClick={handleTestNotification}>
            Test Notification
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NotificationHistory;
