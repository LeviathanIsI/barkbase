import { PageHeader } from '@/components/ui/Card';

// TODO (C1:3 - Directory UX Cleanup): Visual cleanup + consistent directory styling.
const DirectoryListHeader = ({ title, breadcrumb, actions, children }) => (
  <div className="space-y-4">
    <PageHeader title={title} breadcrumb={breadcrumb} actions={actions} />
    {children}
  </div>
);

export default DirectoryListHeader;

