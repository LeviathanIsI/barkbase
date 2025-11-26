import { Smartphone, Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const MobileAppPreview = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">Staff Mobile App</h2>
        <p className="text-gray-600 dark:text-text-secondary">Your team's mobile companion for daily operations</p>
      </div>

      {/* What Staff Can Do */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-6">What Staff Can Do</h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-sm">⏰</span>
              </div>
              TIME TRACKING
            </h4>
            <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-2">
              <li>• Clock in/out with GPS verification</li>
              <li>• View schedule and upcoming shifts</li>
              <li>• Request time off or shift swaps</li>
              <li>• View timesheet and hours worked</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">📋</span>
              </div>
              TASK MANAGEMENT
            </h4>
            <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-2">
              <li>• View assigned tasks for the day</li>
              <li>• Mark tasks as complete</li>
              <li>• Add notes and photos to tasks</li>
              <li>• Get push notifications for new tasks</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
              </div>
              PET CARE
            </h4>
            <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-2">
              <li>• Check in/out pets</li>
              <li>• Log feeding, medications, activities</li>
              <li>• Upload photos directly to customer accounts</li>
              <li>• View pet profiles and special instructions</li>
              <li>• Access medical records and behavioral notes</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
                <span className="text-orange-600 text-sm">💬</span>
              </div>
              COMMUNICATION
            </h4>
            <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-2">
              <li>• Team chat and direct messages</li>
              <li>• Message customers (if permitted)</li>
              <li>• Push notifications for important updates</li>
              <li>• Share photos/videos with team</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
          <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3 flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
              <span className="text-indigo-600 text-sm">📊</span>
            </div>
            PERFORMANCE
          </h4>
          <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-2 mb-4">
            <li>• View personal performance metrics</li>
            <li>• See customer feedback/ratings</li>
            <li>• Track completed tasks and goals</li>
          </ul>

          <div className="text-center">
            <p className="text-gray-600 dark:text-text-secondary mb-4">Available on:</p>
            <div className="flex justify-center gap-4">
              <Button variant="outline">
                <Smartphone className="w-4 h-4 mr-2" />
                Download iOS App
              </Button>
              <Button variant="outline">
                <Smartphone className="w-4 h-4 mr-2" />
                Download Android App
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* App Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">App Preview</h3>

        <div className="bg-gray-100 dark:bg-surface-secondary rounded-lg p-4 max-w-sm mx-auto">
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow-lg overflow-hidden">
            {/* Phone Header */}
            <div className="bg-gray-800 text-white text-center py-2 text-sm font-medium">
              BarkBase Staff
            </div>

            {/* App Content */}
            <div className="p-4 space-y-4">
              {/* Clock In/Out */}
              <div className="text-center p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-1">⏰ Clock In/Out</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary mb-3">Status: Clocked In</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary mb-3">Time: 6h 2m</div>
                <Button size="sm" className="w-full" variant="destructive">🔴 Clock Out</Button>
              </div>

              {/* Today's Tasks */}
              <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-text-primary">📋 Today's Tasks (3)</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-50 dark:bg-green-950/20 rounded-full"></div>
                    <span>2 completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>1 pending</span>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded">
                  <div className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">⏰ HIGH PRIORITY</div>
                  <div className="text-sm text-red-800 dark:text-red-200">Administer medication to Max @ 2:00 PM</div>
                  <Button size="sm" className="w-full mt-2">Mark Complete</Button>
                </div>
              </div>

              {/* Current Pets */}
              <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                <div className="font-medium text-gray-900 dark:text-text-primary mb-2">Current Pets (18)</div>
                <Button size="sm" className="w-full" variant="outline">View Check-in List</Button>
              </div>

              {/* Messages */}
              <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900 dark:text-text-primary">💬 Messages (2)</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary space-y-1">
                  <div>Mike: "Great job today!"</div>
                  <Button size="sm" className="w-full mt-2" variant="outline">View All</Button>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="flex justify-around pt-4 border-t border-gray-200 dark:border-surface-border">
                <div className="text-center text-blue-600 dark:text-blue-400">
                  <div className="text-lg">🏠</div>
                  <div className="text-xs">Home</div>
                </div>
                <div className="text-center text-gray-400 dark:text-text-tertiary">
                  <div className="text-lg">📋</div>
                  <div className="text-xs">Tasks</div>
                </div>
                <div className="text-center text-gray-400 dark:text-text-tertiary">
                  <div className="text-lg">💬</div>
                  <div className="text-xs">Messages</div>
                </div>
                <div className="text-center text-gray-400 dark:text-text-tertiary">
                  <div className="text-lg">👤</div>
                  <div className="text-xs">Profile</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MobileAppPreview;
