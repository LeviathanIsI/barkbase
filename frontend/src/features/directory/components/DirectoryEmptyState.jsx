/**
 * DirectoryEmptyState - Premium empty state for directory pages
 * Uses unified empty state system with branded styling
 */

import { EmptyState } from '@/components/ui/emptystates';

const DirectoryEmptyState = ({ title, description, icon, variant = 'neutral', children }) => (
  <EmptyState
    icon={icon}
    title={title}
    description={description}
    variant={variant}
    actions={children}
  />
);

export default DirectoryEmptyState;
