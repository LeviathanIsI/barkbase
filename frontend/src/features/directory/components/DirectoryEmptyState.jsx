/**
 * DirectoryEmptyState - Empty state for directory pages
 * Uses unified empty state system with design tokens
 */

import { EmptyState } from '@/components/ui/emptystates';

const DirectoryEmptyState = ({ title, description, icon, children }) => (
  <EmptyState
    icon={icon}
    title={title}
    description={description}
    actions={children}
    className="border border-dashed border-[var(--bb-color-border-subtle)]"
  />
);

export default DirectoryEmptyState;

