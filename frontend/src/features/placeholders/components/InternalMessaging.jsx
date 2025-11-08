import { MessageSquare, Plus, Send, Image, Paperclip, Smile } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const InternalMessaging = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Team Messages</h2>
          <p className="text-gray-600 dark:text-text-secondary">Internal communication hub for your team</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-1" />
          New Message
        </Button>
      </div>

      {/* Channels */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Channels</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-surface-primary rounded cursor-pointer">
                <span className="text-blue-600 dark:text-blue-400">📢</span>
                <span className="flex-1">#general</span>
                <span className="text-xs bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200 px-2 py-1 rounded">12</span>
              </div>
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded cursor-pointer">
                <span className="text-gray-600 dark:text-text-secondary">🏢</span>
                <span className="flex-1">#operations</span>
                <span className="text-xs bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200 px-2 py-1 rounded">3</span>
              </div>
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded cursor-pointer">
                <span className="text-gray-600 dark:text-text-secondary">👥</span>
                <span className="flex-1">#managers-only</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-surface-border">
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-3 h-3 mr-1" />
                Create Channel
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Direct Messages</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded cursor-pointer">
                <div className="w-6 h-6 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center text-white text-xs">J</div>
                <span className="flex-1">Jenny Martinez</span>
                <span className="text-xs bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200 px-2 py-1 rounded">2</span>
              </div>
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded cursor-pointer">
                <div className="w-6 h-6 bg-green-50 dark:bg-green-950/20 rounded-full flex items-center justify-center text-white text-xs">M</div>
                <span className="flex-1">Mike Thompson</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-surface-border">
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-3 h-3 mr-1" />
                New Direct Message
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Chat */}
        <div className="md:col-span-2">
          <Card className="p-0 h-96 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-surface-border">
              <h3 className="font-medium text-gray-900 dark:text-text-primary">#general</h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center text-white text-sm font-medium">M</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-text-primary">Mike Thompson</span>
                    <span className="text-xs text-gray-500 dark:text-text-secondary">Today @ 8:15 AM</span>
                  </div>
                  <p className="text-gray-700 dark:text-text-primary">Morning team! We're at 85% capacity today. Expect a busy day. Remember to log all medications and keep communication with owners frequent. Let's have a great day!</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-text-secondary">
                    <span>👍 3</span>
                    <span>❤️ 2</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">J</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-text-primary">Jenny Martinez</span>
                    <span className="text-xs text-gray-500 dark:text-text-secondary">Today @ 8:47 AM</span>
                  </div>
                  <p className="text-gray-700 dark:text-text-primary">@Mike - Max's owner just called asking about pickup time. Can we accommodate 6 PM instead of 5 PM? She's running late from work.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/20 rounded-full flex items-center justify-center text-white text-sm font-medium">M</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-text-primary">Mike Thompson</span>
                    <span className="text-xs text-gray-500 dark:text-text-secondary">Today @ 8:52 AM</span>
                  </div>
                  <p className="text-gray-700 dark:text-text-primary">@Jenny - Yes that's fine. David is here until 10 PM so we have coverage. Update the booking and let her know.</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-text-secondary">
                    <span>✅ 1</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">D</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-text-primary">David Martinez</span>
                    <span className="text-xs text-gray-500 dark:text-text-secondary">Today @ 9:30 AM</span>
                  </div>
                  <p className="text-gray-700 dark:text-text-primary">FYI - Kennel K-11 deep clean complete. Back in service.</p>
                  <div className="w-16 h-12 bg-gray-200 dark:bg-surface-border rounded mt-2 flex items-center justify-center text-xs text-gray-600 dark:text-text-secondary">
                    📸 Photo attached
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-text-secondary">
                    <span>👍 4</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-surface-border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button variant="outline" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InternalMessaging;
