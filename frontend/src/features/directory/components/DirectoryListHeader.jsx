import { PageHeader } from '@/components/ui/Card';

/**
 * DirectoryListHeader
 * Standardized header for directory/list pages with token-based spacing
 */
const DirectoryListHeader = ({ title, description, actions, children }) => (
  <div className="space-y-[var(--bb-space-6,1.5rem)]">
    <PageHeader title={title} description={description} actions={actions} />
    {children}
  </div>
);

export default DirectoryListHeader;

