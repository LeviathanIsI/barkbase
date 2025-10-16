import { useState } from 'react';
import { Search, Filter, MoreVertical, UserPlus, Users, CheckCircle, Clock, Calendar, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const TeamDashboard = ({ stats, staff, onViewProfile, onAddStaff }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredStaff = staff.filter(member => {
    const matchesSearch = !searchTerm ||
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && member.status !== 'off') ||
      (statusFilter === 'inactive' && member.status === 'off');

    const matchesRole = roleFilter === 'all' || member.role.toLowerCase().includes(roleFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'clocked-in':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'scheduled':
        return <div className="w-3 h-3 bg-blue-500 rounded-full"></div>;
      case 'off':
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'clocked-in':
        return 'CLOCKED IN';
      case 'scheduled':
        return 'SCHEDULED';
      case 'off':
        return 'OFF TODAY';
      default:
        return 'UNKNOWN';
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">TOTAL STAFF</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStaff}</p>
              <p className="text-xs text-green-600">+2 this month</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ACTIVE MEMBERS</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeMembers}</p>
              <p className="text-xs text-gray-600">On duty today</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ROLES</p>
              <p className="text-2xl font-bold text-gray-900">{stats.roles}</p>
              <p className="text-xs text-gray-600">Different roles</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">AVG TASKS/STAFF</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgTasksPerStaff}</p>
              <p className="text-xs text-gray-600">This week</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">CLOCKED IN NOW</p>
              <p className="text-2xl font-bold text-gray-900">{stats.clockedIn}</p>
              <p className="text-xs text-gray-600">Working now</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ON SCHEDULE</p>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              <p className="text-xs text-gray-600">Today's shift</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">ON PTO</p>
              <p className="text-2xl font-bold text-gray-900">{stats.onPto}</p>
              <p className="text-xs text-gray-600">Sarah on vacation</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">UTILIZATION</p>
              <p className="text-2xl font-bold text-gray-900">{stats.utilization}%</p>
              <p className="text-xs text-gray-600">Efficiency rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff members: name, role, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Role: All</option>
              <option value="manager">Manager</option>
              <option value="attendant">Kennel Attendant</option>
              <option value="groomer">Groomer</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredStaff.length} of {staff.length} staff members
          </div>
        </div>
      </Card>

      {/* Staff List */}
      <div className="space-y-4">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 truncate">{member.name}</h4>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(member.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === 'clocked-in'
                          ? 'bg-green-100 text-green-800'
                          : member.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusText(member.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">🎯 {member.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📧 {member.email}</span>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <span>📞 {member.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅 {member.tenure}</span>
                    </div>
                  </div>

                  {member.status === 'clocked-in' && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        TODAY'S SHIFT: {member.shift} (clocked in @ 7:58 AM)
                      </p>
                      <p className="text-sm text-gray-600">
                        CURRENT TASKS: {member.tasksPending} pending, {member.tasksCompleted} completed today
                      </p>
                    </div>
                  )}

                  {member.status === 'scheduled' && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        TODAY'S SHIFT: {member.shift} (starts in 4 hours)
                      </p>
                    </div>
                  )}

                  {member.status === 'off' && (
                    <div className="mb-3">
                      <p className="text-sm text-red-600">
                        STATUS: On PTO ({member.ptoReason} - {member.returnDate})
                      </p>
                    </div>
                  )}

                  <div className="mb-3">
                    <p className="text-sm text-gray-600">
                      AREAS: {member.areas.join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      ⭐
                      <span className="text-sm font-medium">{member.rating}/5.0</span>
                      <span className="text-xs text-gray-500">({member.reviews} reviews)</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Performance: ⭐⭐⭐⭐⭐
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => onViewProfile(member)}>
                  View Profile
                </Button>
                <Button variant="outline" size="sm">
                  Assign Task
                </Button>
                <Button variant="outline" size="sm">
                  Message
                </Button>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline">
            Load More (showing 4 of 8)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamDashboard;
