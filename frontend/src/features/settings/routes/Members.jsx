import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { can } from '@/lib/acl';
import InviteMember from '../components/InviteMember';
import {
  useMembersQuery,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from '../api';

const roleOptions = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'READONLY', label: 'Read Only' },
];

const Members = () => {
  const role = useAuthStore((state) => state.role);
  const tenant = useTenantStore((state) => state.tenant);
  const membersQuery = useMembersQuery();
  const updateRole = useUpdateMemberRoleMutation();
  const removeMember = useRemoveMemberMutation();

  const canManage = can({
    role,
    plan: tenant?.plan,
    features: tenant?.features,
    featureFlags: tenant?.featureFlags,
  }, 'manageMembers');

  const members = membersQuery.data?.members ?? [];
  const invites = membersQuery.data?.invites ?? [];

  const handleRoleChange = async (membershipId, nextRole) => {
    try {
      await updateRole.mutateAsync({ membershipId, role: nextRole });
      toast.success('Role updated');
    } catch (error) {
      toast.error(error.message ?? 'Unable to update role');
    }
  };

  const handleRemove = async (membershipId) => {
    try {
      await removeMember.mutateAsync(membershipId);
      toast.success('Member removed');
    } catch (error) {
      toast.error(error.message ?? 'Unable to remove member');
    }
  };

  return (
    <DashboardLayout
      title="Workspace Members"
      description="Manage who can access this tenant and their roles."
      actions={canManage ? <InviteMember /> : null}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card
          title="Active Members"
          description="Update roles or remove members. Owners retain full control over billing and invites."
        >
          {membersQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted">No members found for this tenant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/70 text-sm">
                <thead className="bg-surface/70 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Status</th>
                    {canManage ? <th className="px-3 py-2 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-surface/60">
                      <td className="px-3 py-2 text-text">{member.user?.email ?? '—'}</td>
                      <td className="px-3 py-2">
                        {canManage ? (
                          <select
                            value={member.role}
                            onChange={(event) => handleRoleChange(member.id, event.target.value)}
                            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
                            disabled={updateRole.isPending}
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="neutral">{member.role}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {member.user?.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Inactive</Badge>
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(member.id)}
                            disabled={removeMember.isPending}
                          >
                            Remove
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Pending Invites" description="Invitations expire automatically after seven days.">
          {invites.length === 0 ? (
            <p className="text-sm text-muted">No outstanding invitations.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {invites.map((invite) => (
                <li key={invite.id} className="rounded-lg border border-border/60 bg-surface/60 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text">{invite.email}</p>
                      <p className="text-xs text-muted">Role: {invite.role}</p>
                    </div>
                    <Badge variant="neutral">
                      Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Members;
