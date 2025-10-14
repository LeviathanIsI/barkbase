import { useEffect } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useStaffQuery, useStaffStatusMutation } from '../api';

const Staff = () => {
  const staffQuery = useStaffQuery();
  const toggleStatus = useStaffStatusMutation();
  const staffMembers = staffQuery.data ?? [];

  useEffect(() => {
    if (staffQuery.isError) {
      toast.error(staffQuery.error?.message ?? 'Unable to load staff', { recordId: 'staff-error',
      });
    }
  }, [staffQuery.isError, staffQuery.error]);

  const handleToggle = async (staffId, current) => {
    try {
      await toggleStatus.mutateAsync({ staffId, isActive: !current });
      toast.success(`Staff member ${!current ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error(error.message ?? 'Unable to update staff member');
    }
  };

  return (
    <DashboardLayout
      title="Staff Operations"
      description="Manage scheduling, task assignments, and two-factor authentication."
      actions={
        <Button variant="ghost" size="sm" onClick={() => staffQuery.refetch()} disabled={staffQuery.isFetching}>
          Refresh
        </Button>
      }
    >
      <Card title="Team Overview" description="Role-based access control enforced via backend authorization policies.">
        {staffQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : staffQuery.isError ? (
          <p className="text-sm text-danger">Failed to load staff members.</p>
        ) : staffMembers.length === 0 ? (
          <p className="text-sm text-muted">No staff assigned to this tenant yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {staffMembers.map((member) => (
              <li
                key={member.recordId}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-4"
              >
                <div>
                  <p className="font-semibold text-text">
                    {member.user?.email ?? 'Unknown user'}
                  </p>
                  <p className="text-xs text-muted">
                    Role: {member.role}
                  </p>
                  {member.user?.lastLoginAt && (
                    <p className="text-xs text-muted">
                      Last login {new Date(member.user.lastLoginAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={member.user?.isActive ? 'success' : 'neutral'}>
                    {member.user?.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={toggleStatus.isPending}
                    onClick={() => handleToggle(member.recordId, member.user?.isActive)}
                  >
                    {member.user?.isActive ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
};

export default Staff;
