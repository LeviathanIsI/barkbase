import { FileSearch } from 'lucide-react';
import PlaceholderPage from '@/components/shared/PlaceholderPage';

const AuditLogs = () => {
  return (
    <PlaceholderPage
      title="Logs & Audit"
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Support' },
        { label: 'Logs & Audit' },
      ]}
      description="View comprehensive audit logs of system activity, user actions, data changes, and security events for compliance and troubleshooting."
      illustration={FileSearch}
      badge={{ label: 'Coming Soon', variant: 'secondary' }}
      pageName="logs-audit"
    />
  );
};

export default AuditLogs;
