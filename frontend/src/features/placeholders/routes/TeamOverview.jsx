import { useState } from 'react';
import { Users, Calendar, MessageSquare, BarChart3, Clock, Settings, UserPlus, Search, Filter, MoreVertical, CheckCircle, AlertTriangle, XCircle, TrendingUp, Target, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import StaffWizard from '../components/StaffWizard';
import TeamDashboard from '../components/TeamDashboard';
import StaffProfileView from '../components/StaffProfileView';
import ScheduleCalendarView from '../components/ScheduleCalendarView';
import TaskManagementSystem from '../components/TaskManagementSystem';
import TimeClockSystem from '../components/TimeClockSystem';
import PerformanceReviews from '../components/PerformanceReviews';
import InternalMessaging from '../components/InternalMessaging';
import TeamAnalytics from '../components/TeamAnalytics';
import MobileAppPreview from '../components/MobileAppPreview';
import RolesPermissionsBuilder from '../components/RolesPermissionsBuilder';

const TeamOverview = () => {
  const [hasStaff, setHasStaff] = useState(true); // Change to false to see empty state
  const [currentView, setCurrentView] = useState('overview'); // overview, profile, schedule, tasks, timeclock, reviews, messages, analytics, mobile, permissions
  const [showStaffWizard, setShowStaffWizard] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Set document title
  useState(() => {
    document.title = 'Team Management | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleAddStaff = () => {
    setShowStaffWizard(true);
  };

  const handleStaffWizardComplete = (staffData) => {
    setShowStaffWizard(false);
    setHasStaff(true);
    setCurrentView('overview');
  };

  const handleViewStaffProfile = (staff) => {
    setSelectedStaff(staff);
    setCurrentView('profile');
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
    setSelectedStaff(null);
  };

  // Mock team data
  const teamStats = {
    totalStaff: 8,
    activeMembers: 7,
    roles: 4,
    avgTasksPerStaff: 12,
    clockedIn: 4,
    scheduled: 6,
    onPto: 1,
    utilization: 78
  };

  const mockStaff = [
    {
      id: 1,
      name: 'Jenny Martinez',
      email: 'jenny.martinez@email.com',
      phone: '(555) 234-5678',
      role: 'Kennel Attendant',
      status: 'clocked-in',
      shift: '8:00 AM - 5:00 PM',
      tasksPending: 3,
      tasksCompleted: 8,
      areas: ['Dog boarding', 'Daycare', 'Reception'],
      rating: 4.9,
      reviews: 12,
      tenure: '2 years, 7 months',
      photo: null
    },
    {
      id: 2,
      name: 'Mike Thompson',
      email: 'mike.t@email.com',
      phone: '(555) 345-6789',
      role: 'Manager',
      status: 'clocked-in',
      shift: '7:00 AM - 4:00 PM',
      tasksPending: 5,
      tasksCompleted: 12,
      areas: ['All areas'],
      rating: 5.0,
      reviews: 24,
      tenure: '5 years, 1 month',
      photo: null
    },
    {
      id: 3,
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 456-7890',
      role: 'Groomer',
      status: 'off',
      ptoReason: 'Vacation',
      returnDate: 'Oct 17, 2025',
      areas: ['Grooming'],
      rating: 4.8,
      reviews: 18,
      tenure: '1 year, 8 months',
      photo: null
    },
    {
      id: 4,
      name: 'David Martinez',
      email: 'david.m@email.com',
      phone: '(555) 567-8901',
      role: 'Kennel Attendant',
      status: 'scheduled',
      shift: '2:00 PM - 10:00 PM',
      areas: ['Dog boarding', 'Cat boarding'],
      rating: 4.2,
      reviews: 9,
      tenure: '6 months',
      photo: null
    }
  ];

  if (!hasStaff) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          breadcrumb="Home > Settings > Team Management"
          title="Team Management"
          subtitle="Build and manage your dream team"
          actions={
            <Button onClick={handleAddStaff}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          }
        />

        {/* Value Proposition */}
        <Card className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-surface-primary dark:to-surface-primary border-blue-200 dark:border-blue-900/30">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-blue-900 dark:text-blue-100 mb-2">Why Team Management Matters</h3>
            <p className="text-blue-800 dark:text-blue-200 max-w-2xl mx-auto">
              Proper team setup enables automated shift scheduling, task assignment and tracking,
              time clock and payroll integration, permission-based access control, and staff performance analytics.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-surface-primary rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900 dark:text-text-primary">Automated Scheduling</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Visual calendar with coverage analysis</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-surface-primary rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900 dark:text-text-primary">Task Management</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">Assign, track, and complete daily tasks</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white dark:bg-surface-primary rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900 dark:text-text-primary">Time Tracking</div>
                <div className="text-sm text-gray-600 dark:text-text-secondary">GPS-verified clock in/out system</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-100 dark:bg-surface-secondary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Setup time: 5 minutes per staff member</span>
            </div>
          </div>
        </Card>

        {/* Getting Started Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Add */}
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={handleAddStaff}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Quick Add</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Recommended</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-text-primary mb-4">
              Add staff member in under 2 minutes. Basic info, role, and working hours.
            </p>
            <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-1 mb-4">
              <li>• Name, email, phone</li>
              <li>• Job title and permissions</li>
              <li>• Working hours and availability</li>
            </ul>
            <Button className="w-full">
              Add First Staff Member
            </Button>
          </Card>

          {/* Bulk Import */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Bulk Import</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">5+ staff members</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-text-primary mb-4">
              Add multiple staff at once via CSV/Excel. Perfect for existing teams.
            </p>
            <div className="space-y-3">
              <Button variant="outline" className="w-full">
                Download Template
              </Button>
              <Button variant="outline" className="w-full">
                Import Staff List
              </Button>
            </div>
          </Card>
        </div>

        {/* Alternative Option */}
        <Card className="p-6 border-dashed border-2 border-gray-300 dark:border-surface-border">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Send Invitations</h4>
            <p className="text-gray-600 dark:text-text-secondary mb-4">
              Send email invitations to staff members. They'll complete their own profiles.
            </p>
            <Button variant="outline">
              Send Invite to Staff
            </Button>
          </div>
        </Card>

        {/* Staff Wizard Modal */}
        <StaffWizard
          isOpen={showStaffWizard}
          onClose={() => setShowStaffWizard(false)}
          onComplete={handleStaffWizardComplete}
        />
      </div>
    );
  }

  // Populated team management view
  return (
    <div className="space-y-6">
      {/* Page Header with Navigation */}
      <PageHeader
        breadcrumb="Home > Settings > Team Management"
        title="Team Management"
        subtitle="Manage staff, schedules, permissions, and performance"
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-surface-secondary rounded-lg p-1">
              <Button
                key="overview"
                variant={currentView === 'overview' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('overview')}
                className="px-3"
              >
                <Users className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                key="schedule"
                variant={currentView === 'schedule' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('schedule')}
                className="px-3"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button
                key="tasks"
                variant={currentView === 'tasks' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('tasks')}
                className="px-3"
              >
                <Target className="h-4 w-4 mr-2" />
                Tasks
              </Button>
              <Button
                key="timeclock"
                variant={currentView === 'timeclock' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('timeclock')}
                className="px-3"
              >
                <Clock className="h-4 w-4 mr-2" />
                Time Clock
              </Button>
              <Button
                key="reviews"
                variant={currentView === 'reviews' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('reviews')}
                className="px-3"
              >
                <Star className="h-4 w-4 mr-2" />
                Reviews
              </Button>
              <Button
                key="messages"
                variant={currentView === 'messages' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('messages')}
                className="px-3"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
              <Button
                key="analytics"
                variant={currentView === 'analytics' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('analytics')}
                className="px-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>

            {/* Quick Actions */}
            <Button onClick={handleAddStaff}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        }
      />

      {/* Main Content Area */}
      {currentView === 'overview' && (
        <TeamDashboard
          stats={teamStats}
          staff={mockStaff}
          onViewProfile={handleViewStaffProfile}
          onAddStaff={handleAddStaff}
        />
      )}

      {currentView === 'profile' && selectedStaff && (
        <StaffProfileView
          staff={selectedStaff}
          onBack={handleBackToOverview}
        />
      )}

      {currentView === 'schedule' && (
        <ScheduleCalendarView />
      )}

      {currentView === 'tasks' && (
        <TaskManagementSystem />
      )}

      {currentView === 'timeclock' && (
        <TimeClockSystem />
      )}

      {currentView === 'reviews' && (
        <PerformanceReviews />
      )}

      {currentView === 'messages' && (
        <InternalMessaging />
      )}

      {currentView === 'analytics' && (
        <TeamAnalytics />
      )}

      {/* Staff Wizard Modal */}
      <StaffWizard
        isOpen={showStaffWizard}
        onClose={() => setShowStaffWizard(false)}
        onComplete={handleStaffWizardComplete}
      />
    </div>
  );
};

export default TeamOverview;
