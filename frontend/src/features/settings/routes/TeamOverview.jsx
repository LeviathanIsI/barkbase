import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, Search, Filter, MoreVertical, Upload,
  Clock, TrendingUp, AlertTriangle, CheckCircle,
  User, Mail, Phone, MessageSquare, Calendar,
  Activity, Star, DollarSign
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import TeamMemberCard from './components/TeamMemberCard';
import TeamFilters from './components/TeamFilters';
import BulkActions from './components/BulkActions';
import PermissionMatrixModal from './components/PermissionMatrixModal';
import ShiftCoveragePlanner from './components/ShiftCoveragePlanner';

const TeamOverview = () => {
  const navigate = useNavigate();
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showShiftPlanner, setShowShiftPlanner] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    location: 'all',
    sortBy: 'name'
  });

  // Mock team data - replace with API calls
  const teamStats = {
    activeStaff: 5,
    pendingInvites: 2,
    onlineNow: 3,
    avgHoursToday: 6.2,
    currentCoverage: 'adequate',
    tomorrowCoverage: 'low'
  };

  const teamMembers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      role: 'Manager',
      status: 'active',
      lastActive: '2 hours ago',
      isOnline: false,
      avatar: null,
      joinedAt: '2024-01-15',
      permissions: {
        checkInOut: true,
        bookings: true,
        reports: true,
        billing: false,
        settings: false,
        staffSchedule: true
      },
      schedule: 'Mon-Fri, 9AM-5PM',
      location: 'Building A',
      hourlyRate: 22,
      performance: {
        checkInsProcessed: 47,
        bookingsCreated: 23,
        satisfaction: 4.8,
        onTimeClockIns: 95,
        avgResponseTime: 12
      }
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike.chen@example.com',
      role: 'Staff',
      status: 'active',
      lastActive: 'Just now',
      isOnline: true,
      avatar: null,
      joinedAt: '2024-02-03',
      permissions: {
        checkInOut: true,
        bookings: false,
        reports: false,
        billing: false,
        settings: false,
        staffSchedule: true
      },
      schedule: 'Tue-Sat, 10AM-6PM',
      location: 'Building B',
      hourlyRate: 18,
      performance: {
        checkInsProcessed: 32,
        bookingsCreated: 8,
        satisfaction: 4.6,
        onTimeClockIns: 88,
        avgResponseTime: 18
      }
    },
    {
      id: 3,
      name: 'Jessica Williams',
      email: 'jessica.williams@example.com',
      role: 'Staff',
      status: 'pending',
      lastActive: 'Invited 2 days ago',
      isOnline: false,
      avatar: null,
      joinedAt: null,
      permissions: {},
      schedule: 'Mon-Wed-Fri, 9AM-3PM',
      location: 'Building A',
      hourlyRate: 16
    }
  ];

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
    // Implement bulk actions
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

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600">Manage staff and permissions</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/settings/team/invite')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import from CSV
          </Button>
        </div>
      </div>

      {/* Team Overview Dashboard */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Team Overview
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{teamStats.activeStaff}</div>
              <div className="text-sm text-gray-600">Active Staff</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{teamStats.pendingInvites}</div>
              <div className="text-sm text-gray-600">Pending Invites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{teamStats.onlineNow}</div>
              <div className="text-sm text-gray-600">Online Now</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{teamStats.avgHoursToday}h</div>
              <div className="text-sm text-gray-600">Avg Hours Today</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Current Coverage:</span>
              <div className="flex items-center gap-2">
                <currentCoverage.icon className={`w-4 h-4 ${currentCoverage.color}`} />
                <span className="text-sm font-medium">{currentCoverage.text}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Tomorrow's Coverage:</span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Current Shift Status
          </h3>

          <div className="space-y-3">
            {activeMembers.filter(m => m.status === 'active').slice(0, 3).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <Avatar size="sm" fallback={member.name} />
                  <span className="font-medium">{member.name}</span>
                </div>
                <div className="text-sm text-gray-600">
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
            />
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Invites ({pendingInvites.length})
          </h3>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-sm text-gray-600">
                      {invite.role} role • {invite.lastActive}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Resend Invite
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600">
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showPermissionModal && editingMember && (
        <PermissionMatrixModal
          member={editingMember}
          onClose={() => {
            setShowPermissionModal(false);
            setEditingMember(null);
          }}
          onSave={(updatedMember) => {
            setShowPermissionModal(false);
            setEditingMember(null);
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
