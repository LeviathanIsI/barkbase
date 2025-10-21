import Button from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  MessageSquare,
  Settings,
  Smartphone,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useStaffQuery } from "../../settings/api";
import InternalMessaging from "../components/InternalMessaging";
import MobileAppPreview from "../components/MobileAppPreview";
import PerformanceReviews from "../components/PerformanceReviews";
import RolesPermissionsBuilder from "../components/RolesPermissionsBuilder";
import ScheduleCalendarView from "../components/ScheduleCalendarView";
import StaffProfileView from "../components/StaffProfileView";
import StaffWizard from "../components/StaffWizard";
import TaskManagementSystem from "../components/TaskManagementSystem";
import TeamAnalytics from "../components/TeamAnalytics";
import TeamDashboard from "../components/TeamDashboard";
import TimeClockSystem from "../components/TimeClockSystem";

const TeamOverview = () => {
  const [currentView, setCurrentView] = useState("overview"); // overview, profile, schedule, tasks, timeclock, reviews, messages, analytics, mobile, permissions
  const [showStaffWizard, setShowStaffWizard] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Real API data
  const { data: staffData, isLoading: staffLoading } = useStaffQuery();

  // Set document title
  useState(() => {
    document.title = "Team Management | BarkBase";
    return () => {
      document.title = "BarkBase";
    };
  }, []);

  const handleAddStaff = () => {
    setShowStaffWizard(true);
  };

  const handleStaffWizardComplete = (staffData) => {
    setShowStaffWizard(false);
    setCurrentView("overview");
  };

  const handleViewStaffProfile = (staff) => {
    setSelectedStaff(staff);
    setCurrentView("profile");
  };

  const handleBackToOverview = () => {
    setCurrentView("overview");
    setSelectedStaff(null);
  };

  // Process staff data from API
  const { staff, teamStats, hasStaff } = useMemo(() => {
    if (!staffData || staffLoading) {
      return {
        staff: [],
        teamStats: {
          totalStaff: 0,
          activeMembers: 0,
          roles: 0,
          avgTasksPerStaff: 0,
          clockedIn: 0,
          scheduled: 0,
          onPto: 0,
          utilization: 0,
        },
        hasStaff: false,
      };
    }

    const staffArray = staffData || [];
    const totalStaff = staffArray.length;
    const activeMembers = staffArray.filter((s) => s.isActive !== false).length;
    const roles = [...new Set(staffArray.map((s) => s.role))].length;

    // Calculate stats (these would need additional API calls for real data)
    const clockedIn = 0; // Would need time clock API
    const scheduled = 0; // Would need schedule API
    const onPto = 0; // Would need PTO API
    const utilization = 0; // Would need utilization API
    const avgTasksPerStaff = 0; // Would need task API

    return {
      staff: staffArray,
      teamStats: {
        totalStaff,
        activeMembers,
        roles,
        avgTasksPerStaff,
        clockedIn,
        scheduled,
        onPto,
        utilization,
      },
      hasStaff: staffArray.length > 0,
    };
  }, [staffData, staffLoading]);

  if (!hasStaff) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          breadcrumb="Home > Staff > Team Management"
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
        <Card className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-blue-900 mb-2">
              Why Team Management Matters
            </h3>
            <p className="text-blue-800 max-w-2xl mx-auto">
              Proper team setup enables automated shift scheduling, task
              assignment and tracking, time clock and payroll integration,
              permission-based access control, and staff performance analytics.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">
                  Automated Scheduling
                </div>
                <div className="text-sm text-gray-600">
                  Visual calendar with coverage analysis
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Task Management</div>
                <div className="text-sm text-gray-600">
                  Assign, track, and complete daily tasks
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Time Tracking</div>
                <div className="text-sm text-gray-600">
                  GPS-verified clock in/out system
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="w-5 h-5" />
              <span className="font-medium">
                Setup time: 5 minutes per staff member
              </span>
            </div>
          </div>
        </Card>

        {/* Getting Started Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Add */}
          <Card
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={handleAddStaff}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Quick Add
                </h4>
                <p className="text-sm text-gray-600">Recommended</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Add staff member in under 2 minutes. Basic info, role, and working
              hours.
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>• Name, email, phone</li>
              <li>• Job title and permissions</li>
              <li>• Working hours and availability</li>
            </ul>
            <Button className="w-full">Add First Staff Member</Button>
          </Card>

          {/* Bulk Import */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Bulk Import
                </h4>
                <p className="text-sm text-gray-600">5+ staff members</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              Add multiple staff at once via CSV/Excel. Perfect for existing
              teams.
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
        <Card className="p-6 border-dashed border-2 border-gray-300">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Send Invitations
            </h4>
            <p className="text-gray-600 mb-4">
              Send email invitations to staff members. They'll complete their
              own profiles.
            </p>
            <Button variant="outline">Send Invite to Staff</Button>
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
        breadcrumb="Home > Staff > Team Management"
        title="Team Management"
        subtitle="Manage staff, schedules, permissions, and performance"
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={currentView === "overview" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("overview")}
                className="px-3"
              >
                <Users className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={currentView === "schedule" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("schedule")}
                className="px-3"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button
                variant={currentView === "tasks" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("tasks")}
                className="px-3"
              >
                <Target className="h-4 w-4 mr-2" />
                Tasks
              </Button>
              <Button
                variant={currentView === "timeclock" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("timeclock")}
                className="px-3"
              >
                <Clock className="h-4 w-4 mr-2" />
                Time Clock
              </Button>
              <Button
                variant={currentView === "reviews" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("reviews")}
                className="px-3"
              >
                <Star className="h-4 w-4 mr-2" />
                Reviews
              </Button>
              <Button
                variant={currentView === "messages" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("messages")}
                className="px-3"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
              <Button
                variant={currentView === "analytics" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("analytics")}
                className="px-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant={currentView === "mobile" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("mobile")}
                className="px-3"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Mobile
              </Button>
              <Button
                variant={currentView === "permissions" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("permissions")}
                className="px-3"
              >
                <Settings className="h-4 w-4 mr-2" />
                Permissions
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
      {currentView === "overview" && (
        <TeamDashboard
          stats={teamStats}
          staff={mockStaff}
          onViewProfile={handleViewStaffProfile}
          onAddStaff={handleAddStaff}
        />
      )}

      {currentView === "profile" && selectedStaff ? (
        <StaffProfileView staff={selectedStaff} onBack={handleBackToOverview} />
      ) : currentView === "profile" && !selectedStaff ? (
        <TeamDashboard
          stats={teamStats}
          staff={mockStaff}
          onViewProfile={handleViewStaffProfile}
          onAddStaff={handleAddStaff}
        />
      ) : null}

      {currentView === "schedule" && <ScheduleCalendarView />}

      {currentView === "tasks" && <TaskManagementSystem />}

      {currentView === "timeclock" && <TimeClockSystem />}

      {currentView === "reviews" && <PerformanceReviews />}

      {currentView === "messages" && <InternalMessaging />}

      {currentView === "analytics" && <TeamAnalytics />}

      {currentView === "mobile" && <MobileAppPreview />}

      {currentView === "permissions" && <RolesPermissionsBuilder />}

      {/* Default fallback */}
      {![
        "overview",
        "profile",
        "schedule",
        "tasks",
        "timeclock",
        "reviews",
        "messages",
        "analytics",
        "mobile",
        "permissions",
      ].includes(currentView) && (
        <TeamDashboard
          stats={teamStats}
          staff={mockStaff}
          onViewProfile={handleViewStaffProfile}
          onAddStaff={handleAddStaff}
        />
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
