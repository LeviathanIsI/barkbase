import { Clock, Mail, Calendar, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ScheduledReports = () => {
  const scheduledReports = [
    {
      name: 'Daily Revenue Summary',
      frequency: 'Every day @ 8:00 AM',
      recipients: 'owner@happypaws.com',
      format: 'PDF attachment',
      status: 'active',
      lastSent: 'Today @ 8:00 AM'
    },
    {
      name: 'Weekly Performance Report',
      frequency: 'Every Monday @ 9:00 AM',
      recipients: 'owner@happypaws.com, manager@...',
      format: 'PDF + Excel attachment',
      status: 'active',
      lastSent: 'Mon Oct 14 @ 9:00 AM'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Scheduled Reports</h3>
          <p className="text-gray-600 dark:text-text-secondary">Automatically receive reports via email</p>
        </div>
        <Button>
          <Clock className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">ACTIVE SCHEDULES (2)</h4>

        <div className="space-y-4">
          {scheduledReports.map((report, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h5 className="font-semibold text-gray-900 dark:text-text-primary">{report.name}</h5>
                    <span className="px-2 py-1 bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                      Active
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-600 dark:text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {report.frequency}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {report.recipients}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {report.format}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">Last sent: {report.lastSent}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">
                    <Settings className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Pause
                  </Button>
                  <Button variant="outline" size="sm">
                    Delete
                  </Button>
                  <Button size="sm">
                    Send Now
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ScheduledReports;
