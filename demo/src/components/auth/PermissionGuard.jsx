import { usePermissions } from '@/hooks/usePermissions';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';

/**
 * Component to conditionally render children based on permissions
 * 
 * @param {Object} props
 * @param {string} props.permission - Single permission to check
 * @param {string[]} props.anyOf - Array of permissions (user needs at least one)
 * @param {string[]} props.allOf - Array of permissions (user needs all)
 * @param {React.ReactNode} props.children - Content to render if permission check passes
 * @param {React.ReactNode} props.fallback - Content to render if permission check fails
 * @param {boolean} props.showLoader - Whether to show loader while checking permissions
 */
export const PermissionGuard = ({ 
  permission, 
  anyOf, 
  allOf, 
  children, 
  fallback = null,
  showLoader = true 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingState label="Checking permissions…" variant="spinner" />
      </div>
    );
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyPermission(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasAccess = hasAllPermissions(allOf);
  }

  return hasAccess ? children : fallback;
};

/**
 * HOC to wrap a component with permission checking
 */
export const withPermission = (permission, options = {}) => {
  return (Component) => {
    return (props) => (
      <PermissionGuard 
        permission={permission} 
        fallback={options.fallback}
        showLoader={options.showLoader}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
};

/**
 * HOC to wrap a component with any-of permission checking
 */
export const withAnyPermission = (permissions, options = {}) => {
  return (Component) => {
    return (props) => (
      <PermissionGuard 
        anyOf={permissions} 
        fallback={options.fallback}
        showLoader={options.showLoader}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
};

/**
 * HOC to wrap a component with all-of permission checking
 */
export const withAllPermissions = (permissions, options = {}) => {
  return (Component) => {
    return (props) => (
      <PermissionGuard 
        allOf={permissions} 
        fallback={options.fallback}
        showLoader={options.showLoader}
      >
        <Component {...props} />
      </PermissionGuard>
    );
  };
};

