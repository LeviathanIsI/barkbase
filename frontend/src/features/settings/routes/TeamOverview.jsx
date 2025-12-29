import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  Users, UserPlus, Upload, Clock, TrendingUp, AlertTriangle, CheckCircle,
  Mail, Loader2, Search, Copy, Check, Link
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StyledSelect from '@/components/ui/StyledSelect';
import TeamMemberCard from './components/TeamMemberCard';
import PermissionMatrixModal from './components/PermissionMatrixModal';
import ShiftCoveragePlanner from './components/ShiftCoveragePlanner';
import StaffRolesSection from '../components/StaffRolesSection';
import { apiClient } from '@/lib/apiClient';

/**
 * InviteSuccessView - Shows the invite link after successful invitation
 */
const InviteSuccessView = ({ inviteResult, onClose, onInviteAnother }) => {
  const tz = useTimezoneUtils();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const expiresDate = inviteResult.expiresAt
    ? tz.formatShortDate(inviteResult.expiresAt)
    : '7 days';

  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-6 h-6 text-green-500" />
      </div>
      <h2 className="text-base font-semibold text-text mb-1">Invitation Sent!</h2>
      <p className="text-sm text-muted mb-4">
        Share this link with <span className="font-medium text-text">{inviteResult.email}</span>
      </p>

      {/* Invite Link Box */}
      <div className="bg-surface-secondary border border-border rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Link className="w-4 h-4 text-muted flex-shrink-0" />
          <span className="text-xs text-muted">Invite Link</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteResult.inviteUrl}
            className="flex-1 text-xs bg-transparent border-none outline-none text-text truncate"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted mb-4">
        This link expires on {expiresDate}
      </p>

      <div className="flex gap-2 justify-center">
        <Button variant="ghost" size="sm" onClick={onInviteAnother}>
          Invite Another
        </Button>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
};

const TeamOverview = () => {
  const tz = useTimezoneUtils();
  const queryClient = useQueryClient();
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showShiftPlanner, setShowShiftPlanner] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'STAFF' });
  const [inviteResult, setInviteResult] = useState(null); // Stores successful invite with URL
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Fetch team members from API
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/memberships');
      return data;
    },
  });

  // Mutations
  const inviteMutation = useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.post('/api/v1/memberships', { data: formData });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      // Store invite result to show the invite link
      if (data?.invitation?.inviteUrl) {
        setInviteResult({
          email: inviteForm.email,
          inviteUrl: data.invitation.inviteUrl,
          tenantName: data.invitation.tenantName,
          expiresAt: data.invitation.expiresAt,
        });
      } else {
        setShowInviteModal(false);
        toast.success('Team member invited');
      }
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'STAFF' });
    },
    onError: (err) => toast.error(err.message || 'Failed to invite'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }) => {
      const { data } = await apiClient.put(`/api/v1/memberships/${id}`, { data: formData });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setShowPermissionModal(false);
      setEditingMember(null);
      toast.success('Team member updated');
    },
    onError: (err) => toast.error(err.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/api/v1/memberships/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member removed');
    },
    onError: (err) => toast.error(err.message || 'Failed to remove'),
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.post(`/api/v1/memberships/${id}/resend-invite`);
      return data;
    },
    onSuccess: () => toast.success('Invite resent'),
    onError: (err) => toast.error(err.message || 'Failed to resend'),
  });

  // Transform API data
  const teamMembers = (membersData?.members || []).map(member => ({
    id: member.id,
    name: member.name || member.email,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    role: member.role,
    status: member.status || 'active',
    lastActive: member.joinedAt ? `Joined ${tz.formatShortDate(member.joinedAt)}` : 'Pending',
    isOnline: false,
    joinedAt: member.joinedAt,
    invitedAt: member.invitedAt,
    isCurrentUser: member.isCurrentUser,
    permissions: {
      checkInOut: ['OWNER', 'ADMIN', 'STAFF'].includes(member.role),
      bookings: ['OWNER', 'ADMIN'].includes(member.role),
      reports: ['OWNER', 'ADMIN'].includes(member.role),
      billing: ['OWNER'].includes(member.role),
      settings: ['OWNER', 'ADMIN'].includes(member.role),
      staffSchedule: ['OWNER', 'ADMIN'].includes(member.role),
    },
  }));

  // Stats
  const teamStats = {
    activeStaff: teamMembers.filter(m => m.status === 'active').length,
    pendingInvites: teamMembers.filter(m => m.status === 'pending').length,
    onlineNow: teamMembers.filter(m => m.isOnline).length,
  };

  const pendingInvites = teamMembers.filter(m => m.status === 'pending');
  const activeMembers = teamMembers.filter(m => m.status === 'active');

  // Filter members
  const filteredMembers = activeMembers.filter(m => {
    const matchesSearch = !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Handlers
  const handleMemberSelect = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowPermissionModal(true);
  };

  const handleInvite = () => {
    if (!inviteForm.email) {
      toast.error('Email is required');
      return;
    }
    inviteMutation.mutate(inviteForm);
  };

  const handleDeleteMember = (id) => {
    if (!confirm('Remove this team member?')) return;
    deleteMutation.mutate(id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted">Loading team...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-text">Failed to load team</h3>
        <p className="text-sm text-muted mt-1">{error.message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => queryClient.invalidateQueries({ queryKey: ['team-members'] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Team</h1>
          <p className="text-sm text-muted">Manage staff and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import
          </Button>
          <Button size="sm" onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Invite
          </Button>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-surface-primary"
              />
            </div>
            <div className="min-w-[130px]">
              <StyledSelect
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'OWNER', label: 'Owner' },
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'STAFF', label: 'Staff' },
                  { value: 'READONLY', label: 'Read Only' },
                ]}
                value={roleFilter}
                onChange={(opt) => setRoleFilter(opt?.value || 'all')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMembers.length > 0 && (
            <div className="flex items-center gap-3 p-2 bg-primary/10 rounded-md">
              <span className="text-sm font-medium">{selectedMembers.length} selected</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={() => {
                  if (confirm(`Remove ${selectedMembers.length} member(s)?`)) {
                    selectedMembers.forEach(id => deleteMutation.mutate(id));
                    setSelectedMembers([]);
                  }
                }}
              >
                Remove Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedMembers([])}>
                Clear
              </Button>
            </div>
          )}

          {/* Team Members Grid */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">
              Active Members ({filteredMembers.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  isSelected={selectedMembers.includes(member.id)}
                  onSelect={handleMemberSelect}
                  onEdit={handleEditMember}
                  onDelete={handleDeleteMember}
                />
              ))}
            </div>
            {filteredMembers.length === 0 && (
              <p className="text-sm text-muted py-8 text-center">No team members found</p>
            )}
          </div>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">
                Pending Invites ({pendingInvites.length})
              </h3>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted" />
                      <div>
                        <p className="text-sm font-medium text-text">{invite.email}</p>
                        <p className="text-xs text-muted">{invite.role} • {invite.lastActive}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendInviteMutation.mutate(invite.id)}
                        disabled={resendInviteMutation.isPending}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          if (confirm('Cancel this invite?')) deleteMutation.mutate(invite.id);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar (1/3) */}
        <div className="space-y-4">
          {/* Team Overview Stats */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Overview
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xl font-bold text-primary">{teamStats.activeStaff}</div>
                <div className="text-xs text-muted">Active</div>
              </div>
              <div>
                <div className="text-xl font-bold text-orange-500">{teamStats.pendingInvites}</div>
                <div className="text-xs text-muted">Pending</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-500">{teamStats.onlineNow}</div>
                <div className="text-xs text-muted">Online</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Coverage Today</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" /> Adequate
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Coverage Tomorrow</span>
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" /> Adequate
                </span>
              </div>
            </div>
          </Card>

          {/* Staff Roles Configuration */}
          <StaffRolesSection />
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-primary rounded-lg shadow-xl max-w-md w-full mx-4 p-5">
            {inviteResult ? (
              // Success state - show invite link
              <InviteSuccessView
                inviteResult={inviteResult}
                onClose={() => {
                  setShowInviteModal(false);
                  setInviteResult(null);
                }}
                onInviteAnother={() => setInviteResult(null)}
              />
            ) : (
              // Form state
              <>
                <h2 className="text-base font-semibold text-text mb-4">Invite Team Member</h2>
                <div className="space-y-3">
                  <Input
                    label="Email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="colleague@example.com"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="First Name"
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      placeholder="John"
                    />
                    <Input
                      label="Last Name"
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1">Role</label>
                    <StyledSelect
                      options={[
                        { value: 'OWNER', label: 'Owner' },
                        { value: 'ADMIN', label: 'Admin' },
                        { value: 'STAFF', label: 'Staff' },
                        { value: 'READONLY', label: 'Read Only' },
                      ]}
                      value={inviteForm.role}
                      onChange={(opt) => setInviteForm({ ...inviteForm, role: opt?.value || 'STAFF' })}
                      isClearable={false}
                      isSearchable={false}
                      menuPortalTarget={document.body}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleInvite} disabled={inviteMutation.isPending || !inviteForm.email}>
                    {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && editingMember && (
        <PermissionMatrixModal
          member={editingMember}
          onClose={() => {
            setShowPermissionModal(false);
            setEditingMember(null);
          }}
          onSave={(updatedMember) => {
            updateMutation.mutate({ id: editingMember.id, role: updatedMember.role });
          }}
        />
      )}

      {showShiftPlanner && (
        <ShiftCoveragePlanner onClose={() => setShowShiftPlanner(false)} />
      )}
    </div>
  );
};

export default TeamOverview;
