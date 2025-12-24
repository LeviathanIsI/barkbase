/**
 * Members - Enterprise Staff/Team Management
 *
 * Displays and manages workspace memberships (staff/team for the tenant).
 * Uses the Enterprise Memberships API via config-service.
 *
 * API Response Shape (from useMembersQuery):
 * {
 *   members: [{
 *     id, membershipId, tenantId, userId, role, status,
 *     email, firstName, lastName, name,
 *     invitedAt, joinedAt, createdAt, updatedAt,
 *     isCurrentUser: boolean
 *   }],
 *   total: number
 * }
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import { Skeleton } from '@/components/ui/skeleton';
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
  // Filter invited members from active members
  const activeMembers = members.filter(m => m.status !== 'invited');
  const invites = members.filter(m => m.status === 'invited');

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
          ) : membersQuery.isError ? (
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-error, #dc2626)' }}
            >
              Failed to load team members. Please try again.
            </p>
          ) : activeMembers.length === 0 ? (
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--bb-color-text-primary)' }}>
                            {member.name || '—'}
                          </span>
                          {member.isCurrentUser && (
                            <Badge variant="outline" className="text-[var(--bb-font-size-xs,0.75rem)]">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span style={{ color: 'var(--bb-color-text-muted)' }}>
                          {member.email || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {canManage && !member.isCurrentUser ? (
                          <div className="min-w-[120px]">
                            <StyledSelect
                              options={roleOptions}
                              value={member.role}
                              onChange={(opt) => handleRoleChange(member.id, opt?.value || member.role)}
                              isDisabled={updateRole.isPending}
                              isClearable={false}
                              isSearchable={false}
                            />
                          </div>
                        ) : (
                          <Badge variant="neutral">{member.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.status === 'active' ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="neutral">{member.status || 'Active'}</Badge>
                        )}
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          {!member.isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(member.id)}
                              disabled={removeMember.isPending}
                            >
                              Remove
                            </Button>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
        <Card title="Pending Invites" description="Invited members who haven't joined yet.">
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
                  key={invite.id}
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
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">Pending</Badge>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(invite.id)}
                          disabled={removeMember.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
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
