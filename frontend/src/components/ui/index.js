// Barrel export for UI components
// Simplifies imports: import { Button, Modal, Badge } from '@/components/ui';

export { default as Alert } from './Alert';
export { default as AlertDialog } from './AlertDialog';
export { default as AssociationModal } from './AssociationModal';
export { default as Avatar } from './Avatar';
export { default as Badge } from './Badge';
export { default as Button } from './Button';
export { default as Calendar } from './Calendar';
export { default as Card } from './Card';
export { default as Checkbox } from './Checkbox';
export { default as ConfirmDialog } from './ConfirmDialog';
export { default as DataTable } from './DataTable';
export { default as Dialog } from './Dialog';
export { default as DropdownMenu } from './DropdownMenu';
export { default as FilterDropdown } from './FilterDropdown';
export { default as Input } from './Input';
export { default as Label } from './Label';
export { default as Modal } from './Modal';
export { default as PasswordStrength } from './PasswordStrength';
export { default as Select } from './Select';
export { ScrollableTableContainer } from './ScrollableTableContainer';
// Base Skeleton component for backwards compatibility
export { default as Skeleton } from './skeleton/Skeleton';
export { default as Switch } from './Switch';
export { default as Tabs } from './Tabs';
export { default as Textarea } from './Textarea';
export { default as UpgradeBanner } from './UpgradeBanner';

// Empty state components
export { EmptyState, InlineEmpty, TableEmptyState } from './emptystates';

// Skeleton components - direct exports from skeleton folder to avoid circular deps
export { default as SkeletonBase } from './skeleton/Skeleton';
export { default as SkeletonText } from './skeleton/SkeletonText';
export { default as SkeletonAvatar } from './skeleton/SkeletonAvatar';
export { default as SkeletonCard } from './skeleton/SkeletonCard';
export { default as SkeletonTableRow } from './skeleton/SkeletonTableRow';
export { default as SkeletonChart } from './skeleton/SkeletonChart';
export { default as SkeletonForm } from './skeleton/SkeletonForm';
export { default as SkeletonInspector } from './skeleton/SkeletonInspector';

