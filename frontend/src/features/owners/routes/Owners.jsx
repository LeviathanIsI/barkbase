import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const owners = [
  {
    id: 'owner-1',
    name: 'Amy Peterson',
    email: 'amy.peterson@example.com',
    pets: ['Luna'],
    status: 'active',
  },
  {
    id: 'owner-2',
    name: 'Jamie Fox',
    email: 'jamie.fox@example.com',
    pets: ['Bella'],
    status: 'invited',
  },
];

const Owners = () => (
  <DashboardLayout
    title="Owner CRM"
    description="Centralize communication, consents, and billing details per household."
    actions={<Button>Invite Owner</Button>}
  >
    <Card title="Owner Directory" description="Syncs with backend CRM and marketing automations.">
      <ul className="space-y-3 text-sm">
        {owners.map((owner) => (
          <li key={owner.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-4">
            <div>
              <p className="font-semibold text-text">{owner.name}</p>
              <p className="text-xs text-muted">{owner.email}</p>
              <p className="mt-1 text-xs text-muted">Pets: {owner.pets.join(', ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={owner.status === 'active' ? 'success' : 'info'}>{owner.status}</Badge>
              <Button size="sm" variant="ghost">
                View
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  </DashboardLayout>
);

export default Owners;
