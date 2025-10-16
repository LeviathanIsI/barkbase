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
        <h2 className="text-xl font-semibold text-gray-900">Timeline View</h2>
        <span className="text-sm text-gray-600">Switch to Grid</span>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          📊 TODAY'S ACTIVITY • {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>

        {/* Timeline */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-sm font-medium text-gray-600 w-16">8:00 AM</div>
            <div className="flex-1">
              <div className="bg-green-50 border-l-4 border-green-500 pl-4 py-2">
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
            <div className="text-sm font-medium text-gray-600 w-16">9:00 AM</div>
            <div className="flex-1 space-y-2">
              <div className="bg-red-50 border-l-4 border-red-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-red-800">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium">Bella LATE (scheduled, not arrived)</span>
                </div>
                <div className="text-sm text-red-700 mt-1">
                  Golden Retriever • Sarah Johnson
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    Call Owner
                  </button>
                  <button className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Check In Now
                  </button>
                </div>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 pl-4 py-2">
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
            <div className="text-sm font-medium text-gray-600 w-16">9:17 AM</div>
            <div className="flex-1">
              <div className="bg-gray-50 border-l-4 border-gray-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-gray-800">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Luna picked up</span>
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  Pug • Emma Davis • Needs extra attention - Follow up
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-sm font-medium text-gray-600 w-16">10:00 AM</div>
            <div className="flex-1">
              <div className="bg-blue-50 border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Lucy arriving soon</span>
                </div>
                <div className="text-sm text-blue-700 mt-1">
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
            <div className="text-sm text-gray-600">On Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">1</div>
            <div className="text-sm text-gray-600">Late</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1</div>
            <div className="text-sm text-gray-600">Early</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">0</div>
            <div className="text-sm text-gray-600">No-shows</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">QUICK STATS</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Average check-in time:</span>
              <div className="font-semibold text-gray-900">2 mins 15 secs</div>
            </div>
            <div>
              <span className="text-gray-600">Busiest period:</span>
              <div className="font-semibold text-gray-900">8:30-9:30 AM (3 arrivals)</div>
            </div>
            <div>
              <span className="text-gray-600">Revenue today:</span>
              <div className="font-semibold text-gray-900">$178.00 (4 pets)</div>
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
