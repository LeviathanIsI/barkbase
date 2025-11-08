import { format } from 'date-fns';
import { Clock, CheckCircle, TrendingUp, Calendar, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const DailySummaryDashboard = ({ pets, currentDate }) => {
  const completedToday = [
    { time: '8:00 AM', action: 'Daisy checked out' },
    { time: '9:30 AM', action: 'Cooper checked in' },
    { time: '10:15 AM', action: 'Bailey checked out' },
    { time: '11:45 AM', action: 'Sadie checked in' },
    { time: '1:30 PM', action: 'Tucker checked out' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Timeline View</h2>
        <span className="text-sm text-gray-600 dark:text-text-secondary">Switch to Grid</span>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-6">
          📊 TODAY'S ACTIVITY • {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>

        {/* Timeline */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-sm font-medium text-gray-600 dark:text-text-secondary w-16">8:00 AM</div>
            <div className="flex-1">
              <div className="bg-green-50 dark:bg-surface-primary border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Charlie checked in</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  Beagle • Tom Brown • On time • No issues
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-sm font-medium text-gray-600 dark:text-text-secondary w-16">9:00 AM</div>
            <div className="flex-1 space-y-2">
              <div className="bg-red-50 dark:bg-surface-primary border-l-4 border-red-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">Bella LATE (scheduled, not arrived)</span>
                </div>
                <div className="text-sm text-red-700 mt-1">
                  Golden Retriever • Sarah Johnson
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200 px-2 py-1 rounded">
                    Call Owner
                  </button>
                  <button className="text-xs bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    Check In Now
                  </button>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-surface-primary border-l-4 border-green-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Max checked in</span>
                </div>
                <div className="text-sm text-green-700 mt-1">
                  German Shepherd • Mike Wilson • First time visitor • Watch behavior
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-sm font-medium text-gray-600 dark:text-text-secondary w-16">9:17 AM</div>
            <div className="flex-1">
              <div className="bg-gray-50 dark:bg-surface-secondary border-l-4 border-gray-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-gray-800 dark:text-text-primary">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Luna picked up</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-text-primary mt-1">
                  Pug • Emma Davis • Needs extra attention - Follow up
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-sm font-medium text-gray-600 dark:text-text-secondary w-16">10:00 AM</div>
            <div className="flex-1">
              <div className="bg-blue-50 dark:bg-surface-primary border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Lucy arriving soon</span>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Siamese Cat • Anna Smith • Indoor only • Prepare cat area
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">2</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">On Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">1</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Late</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Early</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-text-secondary">0</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">No-shows</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-text-primary mb-3">QUICK STATS</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-text-secondary">Average check-in time:</span>
              <div className="font-semibold text-gray-900 dark:text-text-primary">2 mins 15 secs</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-text-secondary">Busiest period:</span>
              <div className="font-semibold text-gray-900 dark:text-text-primary">8:30-9:30 AM (3 arrivals)</div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-text-secondary">Revenue today:</span>
              <div className="font-semibold text-gray-900 dark:text-text-primary">$178.00 (4 pets)</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline">
            View Full Analytics
          </Button>
          <Button variant="outline">
            Export Daily Report
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DailySummaryDashboard;
