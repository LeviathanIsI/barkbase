/**
 * Members - Phase 8 Enterprise Table System
 * Token-based styling for consistent theming.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { Shield, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { can } from '@/lib/acl';
import InviteMember from '../components/InviteMember';
import SettingsPage from '../components/SettingsPage';
import UserRoleManager from '../components/UserRoleManager';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';
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
  const [managingRoles, setManagingRoles] = useState(null);
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

  // Use legacy role system for now
  const canManageRoles = role === 'OWNER' || role === 'ADMIN';

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
    <>
      <SettingsPage
        title="Workspace Members"
        description="Manage who can access this tenant and their roles."
        actions={canManage ? <InviteMember /> : null}
        contentClassName="grid gap-[var(--bb-space-6,1.5rem)] xl:grid-cols-[2fr,1fr]"
      >
        <Card
          title="Active Members"
          description="Update roles or remove members. Owners retain full control over billing and invites."
        >
          {membersQuery.isLoading ? (
            <div className="space-y-[var(--bb-space-3,0.75rem)]">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              No members found for this tenant.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-[var(--bb-space-6,1.5rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Legacy Role</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.recordId}>
                      <TableCell>
                        <span style={{ color: 'var(--bb-color-text-primary)' }}>
                          {member.user?.email ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <select
                            value={member.role}
                            onChange={(event) => handleRoleChange(member.recordId, event.target.value)}
                            className="rounded-lg border px-[var(--bb-space-2,0.5rem)] py-[var(--bb-space-1,0.25rem)] text-[var(--bb-font-size-sm,0.875rem)]"
                            style={{
                              borderColor: 'var(--bb-color-border-subtle)',
                              backgroundColor: 'var(--bb-color-bg-elevated)',
                              color: 'var(--bb-color-text-primary)',
                            }}
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
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
                          {member.user?.roles?.length > 0 ? (
                            member.user.roles.map(role => (
                              <Badge key={role.recordId} variant="outline" className="text-[var(--bb-font-size-xs,0.75rem)]">
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span
                              className="text-[var(--bb-font-size-xs,0.75rem)]"
                              style={{ color: 'var(--bb-color-text-muted)' }}
                            >
                              No roles assigned
                            </span>
                          )}
                          {canManageRoles && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setManagingRoles(member.user)}
                              className="h-6 w-6"
                            >
                              <Shield className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.user?.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Inactive</Badge>
                        )}
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(member.recordId)}
                            disabled={removeMember.isPending}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
        <Card title="Pending Invites" description="Invitations expire automatically after seven days.">
          {invites.length === 0 ? (
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              No outstanding invitations.
            </p>
          ) : (
            <ul className="space-y-[var(--bb-space-3,0.75rem)]">
              {invites.map((invite) => (
                <li
                  key={invite.recordId}
                  className="rounded-lg border p-[var(--bb-space-3,0.75rem)]"
                  style={{
                    borderColor: 'var(--bb-color-border-subtle)',
                    backgroundColor: 'var(--bb-color-bg-elevated)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className="font-[var(--bb-font-weight-medium,500)] text-[var(--bb-font-size-sm,0.875rem)]"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
                        {invite.email}
                      </p>
                      <p
                        className="text-[var(--bb-font-size-xs,0.75rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        Role: {invite.role}
                      </p>
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
      </SettingsPage>

      {managingRoles && (
        <UserRoleManager 
          user={managingRoles} 
          onClose={() => setManagingRoles(null)} 
        />
      )}
    </>
  );
};

export default Members;
