import { MessageSquare, Plus, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const InternalMessaging = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Team Messages</h2>
          <p className="text-gray-600">Internal communication hub for your team</p>
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
            <h3 className="font-medium text-gray-900 mb-3">Channels</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded cursor-pointer">
                <span className="text-blue-600">📢</span>
                <span className="flex-1">#general</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">12</span>
              </div>
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <span className="text-gray-600">🏢</span>
                <span className="flex-1">#operations</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">3</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-3 h-3 mr-1" />
                Create Channel
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Direct Messages</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">J</div>
                <span className="flex-1">Jenny Martinez</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">2</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
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
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">#general</h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">M</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">Mike Thompson</span>
                    <span className="text-xs text-gray-500">Today @ 8:15 AM</span>
                  </div>
                  <p className="text-gray-700">Morning team! We're at 85% capacity today. Let's have a great day!</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>👍 3</span>
                    <span>❤️ 2</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">J</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">Jenny Martinez</span>
                    <span className="text-xs text-gray-500">Today @ 8:47 AM</span>
                  </div>
                  <p className="text-gray-700">@Mike - Max's owner just called. Can we accommodate 6 PM pickup?</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
