import { Users, Settings, Crown, Shield, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const TeamRouting = () => {
  // Mock team data
  const teamMembers = [
    { id: 1, name: 'Sarah Johnson', role: 'Manager', avatar: null },
    { id: 2, name: 'Mike Chen', role: 'Staff', avatar: null },
    { id: 3, name: 'Lisa Rodriguez', role: 'Groomer', avatar: null },
    { id: 4, name: 'David Kim', role: 'Trainer', avatar: null }
  ];

  // Mock routing rules
  const routingRules = [
    {
      event: 'New bookings',
      recipients: ['Sarah Johnson (Manager)'],
      description: 'Front desk staff'
    },
    {
      event: 'Payment issues',
      recipients: ['Sarah Johnson (Manager)'],
      description: 'Manager only'
    },
    {
      event: 'Vaccination alerts',
      recipients: ['All Staff'],
      description: 'All staff members'
    },
    {
      event: 'Emergency incidents',
      recipients: ['Sarah Johnson (Manager)', 'On-duty staff'],
      description: 'Manager + on-duty staff'
    }
  ];

  const handleConfigureRouting = () => {
    // TODO: Open routing configuration modal
  };

  const getRoleIcon = (role) => {
    switch (role.toLowerCase()) {
      case 'manager':
        return Crown;
      case 'staff':
        return User;
      case 'groomer':
        return Shield;
      case 'trainer':
        return Shield;
      default:
        return User;
    }
  };

  return (
    <Card title="Team Notification Routing" icon={Users}>
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Available on Pro plan
              </h4>
              <p className="text-sm text-blue-800">
                Route specific notifications to team members for better workflow management.
              </p>
            </div>
          </div>
        </div>

        {/* Current Routing Rules */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Current Routing Rules</h3>
            <Button variant="outline" onClick={handleConfigureRouting}>
              Configure Team Routing
            </Button>
          </div>

          <div className="space-y-3">
            {routingRules.map((rule, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{rule.event}</h4>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Recipients:</span>
                      {rule.recipients.map((recipient, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {recipient}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members Overview */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4">Team Members</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <RoleIcon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upgrade Prompt */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <div className="text-center">
            <Users className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-purple-900 mb-2">
              Advanced Team Routing
            </h4>
            <p className="text-purple-700 mb-4">
              Route notifications intelligently based on roles, schedules, and availability.
              Ensure the right team member gets notified at the right time.
            </p>
            <div className="flex gap-3 justify-center">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Upgrade to Pro
              </Button>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TeamRouting;
