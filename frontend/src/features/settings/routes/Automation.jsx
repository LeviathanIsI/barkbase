import Card from '@/components/ui/Card';

const Automation = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Automation</h1>
          <p className="mt-1 text-sm text-muted">Configure automated workflows and rules</p>
        </div>
      </header>
      <Card title="Coming Soon" description="This feature is under development.">
        <p className="text-sm text-muted">
          Automation settings will allow you to set up triggers, actions, and workflows to streamline your operations.
        </p>
      </Card>
    </div>
  );
};

export default Automation;