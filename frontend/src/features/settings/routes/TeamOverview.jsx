import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Search, Filter, MoreVertical, Upload,
  Clock, TrendingUp, AlertTriangle, CheckCircle,
  User, Mail, Phone, MessageSquare, Calendar,
  Activity, Star, DollarSign, Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Dialog from '@/components/ui/Dialog';
import TeamMemberCard from './components/TeamMemberCard';
import TeamFilters from './components/TeamFilters';
import BulkActions from './components/BulkActions';
import PermissionMatrixModal from './components/PermissionMatrixModal';
import ShiftCoveragePlanner from './components/ShiftCoveragePlanner';
import { apiClient } from '@/lib/apiClient';

const TeamOverview = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showShiftPlanner, setShowShiftPlanner] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', role: 'STAFF' });
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    location: 'all',
    sortBy: 'name'
  });

  // Fetch team members from API
  const { data: membersData, isLoading, error } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/memberships');
      return data;
    },
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async (formData) => {
      const { data } = await apiClient.post('/api/v1/memberships', { data: formData });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setShowInviteModal(false);
      setInviteForm({ email: '', firstName: '', lastName: '', role: 'STAFF' });
      toast.success('Team member invited successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to invite team member');
    },
  });

  // Update member mutation
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
    onError: (err) => {
      toast.error(err.message || 'Failed to update team member');
    },
  });

  // Delete member mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/api/v1/memberships/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member removed');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove team member');
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.post(`/api/v1/memberships/${id}/resend-invite`);
      return data;
    },
    onSuccess: () => {
      toast.success('Invite resent');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to resend invite');
    },
  });

  // Transform API data to component format
  const teamMembers = (membersData?.members || []).map(member => ({
    id: member.id,
    name: member.name || member.email,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    role: member.role,
    status: member.status || 'active',
    lastActive: member.joinedAt ? `Joined ${new Date(member.joinedAt).toLocaleDateString()}` : 'Pending',
    isOnline: false, // Would need real-time status
    avatar: null,
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

  // Calculate stats from real data
  const teamStats = {
    activeStaff: teamMembers.filter(m => m.status === 'active').length,
    pendingInvites: teamMembers.filter(m => m.status === 'pending').length,
    onlineNow: teamMembers.filter(m => m.isOnline).length,
    avgHoursToday: 0, // Would need time clock integration
    currentCoverage: 'adequate',
    tomorrowCoverage: 'adequate'
  };

  const pendingInvites = teamMembers.filter(member => member.status === 'pending');
  const activeMembers = teamMembers.filter(member => member.status === 'active');

  const handleMemberSelect = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowPermissionModal(true);
  };

  const handleBulkAction = (action) => {
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to remove ${selectedMembers.length} team member(s)?`)) return;
      selectedMembers.forEach(id => deleteMutation.mutate(id));
      setSelectedMembers([]);
    }
  };

  const handleInvite = () => {
    if (!inviteForm.email) {
      toast.error('Email is required');
      return;
    }
    inviteMutation.mutate(inviteForm);
  };

  const handleDeleteMember = (id) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    deleteMutation.mutate(id);
  };

  const handleResendInvite = (id) => {
    resendInviteMutation.mutate(id);
  };

  const handleCancelInvite = (id) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;
    deleteMutation.mutate(id);
  };

  const getCoverageStatus = (status) => {
    switch (status) {
      case 'adequate':
        return { icon: CheckCircle, color: 'text-green-600', text: 'Adequate' };
      case 'low':
        return { icon: AlertTriangle, color: 'text-yellow-600', text: 'Low' };
      case 'critical':
        return { icon: AlertTriangle, color: 'text-red-600', text: 'Critical' };
      default:
        return { icon: CheckCircle, color: 'text-green-600', text: 'Adequate' };
    }
  };

  const currentCoverage = getCoverageStatus(teamStats.currentCoverage);
  const tomorrowCoverage = getCoverageStatus(teamStats.tomorrowCoverage);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-muted-foreground">Loading team members...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">Failed to load team</h3>
        <p className="text-muted-foreground mt-1">{error.message || 'An error occurred'}</p>
        <Button variant="secondary" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['team-members'] })}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header with Actions */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Team</h1>
          <p className="mt-1 text-sm text-muted">Manage staff members, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </header>

      {/* Team Overview Dashboard */}
      <Card className="bg-primary-50 dark:bg-surface-primary border-blue-200 dark:border-blue-900/30">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Team Overview
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{teamStats.activeStaff}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Active Staff</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{teamStats.pendingInvites}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Pending Invites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{teamStats.onlineNow}</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Online Now</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{teamStats.avgHoursToday}h</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Avg Hours Today</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-text-primary">Current Coverage:</span>
              <div className="flex items-center gap-2">
                <currentCoverage.icon className={`w-4 h-4 ${currentCoverage.color}`} />
                <span className="text-sm font-medium">{currentCoverage.text}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-text-primary">Tomorrow's Coverage:</span>
              <div className="flex items-center gap-2">
                <tomorrowCoverage.icon className={`w-4 h-4 ${tomorrowCoverage.color}`} />
                <span className="text-sm font-medium">{tomorrowCoverage.text}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Current Shift Status */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Current Shift Status
          </h3>

          <div className="space-y-3">
            {activeMembers.filter(m => m.status === 'active').slice(0, 3).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-400 dark:bg-gray-600'}`} />
                  <Avatar size="sm" fallback={member.name} />
                  <span className="font-medium">{member.name}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">
                  {member.isOnline
                    ? `Clocked in: ${member.lastActive}`
                    : 'Not scheduled today'
                  }
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" size="sm">
              View Timesheets
            </Button>
            <Button variant="outline" size="sm">
              Clock In/Out Terminal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShiftPlanner(true)}
            >
              Shift Coverage
            </Button>
          </div>
        </div>
      </Card>

      {/* Search and Filters */}
      <TeamFilters filters={filters} onFiltersChange={setFilters} />

      {/* Bulk Actions */}
      {selectedMembers.length > 0 && (
        <BulkActions
          selectedCount={selectedMembers.length}
          onAction={handleBulkAction}
          onClear={() => setSelectedMembers([])}
        />
      )}

      {/* Active Team Members */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">
          Active Team Members ({activeMembers.length})
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeMembers.map((member) => (
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
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400 dark:text-text-tertiary" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-text-primary">{invite.email}</p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">
                      {invite.role} role • {invite.lastActive}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendInvite(invite.id)}
                    disabled={resendInviteMutation.isPending}
                  >
                    {resendInviteMutation.isPending ? 'Sending...' : 'Resend Invite'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleCancelInvite(invite.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Invite Team Member</h2>

              <div className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@example.com"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
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
                <Select
                  label="Role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  options={[
                    { value: 'OWNER', label: 'Owner - Full access to everything' },
                    { value: 'ADMIN', label: 'Admin - Manage staff and settings' },
                    { value: 'STAFF', label: 'Staff - Day-to-day operations' },
                    { value: 'READONLY', label: 'Read Only - View only access' },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviteMutation.isPending || !inviteForm.email}
                >
                  {inviteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invite'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
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
        <ShiftCoveragePlanner
          onClose={() => setShowShiftPlanner(false)}
        />
      )}
    </div>
  );
};

export default TeamOverview;
