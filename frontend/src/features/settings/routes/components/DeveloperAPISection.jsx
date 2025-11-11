import { Code, Webhook, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';

const DeveloperAPISection = () => {
  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Developer API</h2>
          <p className="text-sm text-gray-600 dark:text-text-secondary">Build custom integrations with our REST API</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Access */}
        <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-text-primary">API Access</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">⭐ Pro Feature</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
            Build custom integrations, mobile apps, or automations using our RESTful API.
          </p>
          <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-1 mb-4">
            <li>• Read/write customers, pets, bookings</li>
            <li>• Create invoices and record payments</li>
            <li>• Manage services and pricing</li>
            <li>• Upload photos and documents</li>
            <li>• Receive webhooks for real-time events</li>
          </ul>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              View API Documentation
            </Button>
            <Button variant="outline" size="sm">
              Get API Keys
            </Button>
          </div>
        </div>

        {/* Webhooks */}
        <div className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Webhook className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-text-primary">Webhooks</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">⭐ Pro Feature</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
            Receive real-time notifications when events happen in your BarkBase account.
          </p>
          <div className="text-sm text-gray-600 dark:text-text-secondary mb-4">
            <div className="font-medium mb-1">Available events:</div>
            <div className="text-xs space-y-1">
              <div>• booking.created, booking.updated, booking.cancelled</div>
              <div>• payment.received, payment.failed, payment.refunded</div>
              <div>• customer.created, customer.updated</div>
              <div>• vaccination.expiring, vaccination.expired</div>
              <div>• checkin.completed, checkout.completed</div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Configure Webhooks
          </Button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💬 "The API is well-documented and easy to use. We built a custom kiosk check-in system in 2 days."
          <br />
          <span className="text-blue-700 dark:text-blue-300">- Dev Team, Paws Paradise</span>
        </p>
      </div>

      <div className="mt-4 flex justify-center">
        <Button className="bg-primary-600 dark:bg-primary-700">
          <ExternalLink className="w-4 h-4 mr-2" />
          Upgrade to Pro for API Access
        </Button>
      </div>
    </div>
  );
};

export default DeveloperAPISection;
