import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import SettingsPage from '../components/SettingsPage';
import { Link2, Calendar, CreditCard, Mail, MessageSquare, Package, CheckCircle, XCircle } from 'lucide-react';

const Integrations = () => {
  const [integrations] = useState([
    {
      id: 1,
      name: 'Google Calendar',
      description: 'Sync bookings with Google Calendar',
      icon: Calendar,
      connected: true,
      category: 'calendar',
      lastSync: '2024-01-15T10:30:00'
    },
    {
      id: 2,
      name: 'Stripe',
      description: 'Process payments with Stripe',
      icon: CreditCard,
      connected: true,
      category: 'payment',
      lastSync: '2024-01-15T12:00:00'
    },
    {
      id: 3,
      name: 'Mailchimp',
      description: 'Email marketing automation',
      icon: Mail,
      connected: false,
      category: 'marketing'
    },
    {
      id: 4,
      name: 'Twilio',
      description: 'SMS notifications and reminders',
      icon: MessageSquare,
      connected: false,
      category: 'communication'
    },
    {
      id: 5,
      name: 'QuickBooks',
      description: 'Accounting and invoicing',
      icon: Package,
      connected: false,
      category: 'accounting'
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState(null);

  const handleConnect = (integration) => {
    if (integration.connected) {
      if (confirm(`Are you sure you want to disconnect ${integration.name}?`)) {
        alert(`${integration.name} disconnected`);
      }
    } else {
      alert(`Opening ${integration.name} connection setup...`);
      // TODO: Open OAuth flow or API key setup
    }
  };

  const handleConfigure = (integration) => {
    setSelectedIntegration(integration);
    alert(`Opening configuration for ${integration.name}`);
  };

  return (
    <SettingsPage 
      title="Integrations" 
      description="Connect third-party services to enhance your workflow"
    >
      {/* Available Integrations */}
      <Card 
        title="Available Integrations" 
        description="Connect your favorite tools"
      >
        <div className="space-y-4">
          {integrations.map(integration => {
            const Icon = integration.icon;
            return (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    integration.connected ? 'bg-green-100' : 'bg-gray-100 dark:bg-surface-secondary'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      integration.connected ? 'text-green-600' : 'text-gray-600 dark:text-text-secondary'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium">{integration.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">{integration.description}</p>
                    {integration.connected && integration.lastSync && (
                      <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                        Last synced: {new Date(integration.lastSync).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={integration.connected ? 'success' : 'neutral'}>
                    {integration.connected ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> Not Connected</>
                    )}
                  </Badge>
                  {integration.connected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigure(integration)}
                    >
                      Configure
                    </Button>
                  )}
                  <Button
                    variant={integration.connected ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleConnect(integration)}
                  >
                    {integration.connected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Integration Categories */}
      <Card 
        title="Browse by Category" 
        description="Find integrations by type"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium">Calendar & Scheduling</h4>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">3 integrations</p>
          </div>
          
          <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <h4 className="font-medium">Payments & Billing</h4>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">5 integrations</p>
          </div>
          
          <div className="p-4 border rounded-lg text-center hover:shadow-md transition-shadow cursor-pointer">
            <Mail className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <h4 className="font-medium">Marketing & CRM</h4>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">4 integrations</p>
          </div>
        </div>
      </Card>

      {/* API Access */}
      <Card 
        title="Developer API" 
        description="Build custom integrations"
      >
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
          <div className="flex items-center gap-3">
            <Link2 className="w-8 h-8 text-indigo-600" />
            <div>
              <h4 className="font-medium">REST API Access</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Create custom integrations with our API</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => alert('Opening API documentation...')}>
            View API Docs
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Integrations;