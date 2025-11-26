import { X, Edit, Calendar, MessageSquare, BarChart3, UserX, Camera, Mail, Phone, MapPin, Clock, CheckCircle, XCircle, Star, FileText, Plus, ChevronLeft } from 'lucide-react';
import Button from '@/components/ui/Button';

const StaffProfileView = ({ staff, onBack }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Team
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Staff Profile: {staff.name}</h2>
          <p className="text-gray-600 dark:text-text-secondary">{staff.role}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-1" />
            Edit Profile
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-1" />
            View Schedule
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="w-4 h-4 mr-1" />
            Send Message
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-1" />
            Performance Review
          </Button>
          <Button variant="destructive" size="sm">
            <UserX className="w-4 h-4 mr-1" />
            Deactivate Account
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Basic Information</h3>

        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center text-white font-bold text-2xl">
              {staff.name.split(' ').map(n => n[0]).join('')}
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              <Camera className="w-3 h-3 mr-1" />
              Change Photo
            </Button>
          </div>

          <div className="flex-1 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Full Name</label>
              <p className="text-gray-900 dark:text-text-primary">{staff.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Email</label>
              <p className="text-gray-900 dark:text-text-primary">{staff.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Phone</label>
              <p className="text-gray-900 dark:text-text-primary">{staff.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Employee ID</label>
              <p className="text-gray-900 dark:text-text-primary">EMP-001</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Start Date</label>
              <p className="text-gray-900 dark:text-text-primary">March 12, 2023 (2 years, 7 months)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Employment Type</label>
              <p className="text-gray-900 dark:text-text-primary">Full-time</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Pay Rate</label>
              <p className="text-gray-900 dark:text-text-primary">$15.00/hour</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">Status</label>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                staff.status === 'clocked-in' ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary'
              }`}>
                {staff.status === 'clocked-in' ? '✅ Active (clocked in now)' : '⚪ Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Role & Permissions</h3>
          <Button variant="outline" size="sm">
            Edit Permissions
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">{staff.role}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-green-700 mb-3">ALLOWED ACTIONS:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Check in/out pets
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <CheckCircle className="w-4 h-4 text-green-600" />
                View bookings and schedules
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Log activities (feeding, medications, notes)
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Upload photos and videos
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Message customers
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <CheckCircle className="w-4 h-4 text-green-600" />
                View pet profiles and medical records
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Clock in/out for shifts
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-red-700 mb-3">RESTRICTED ACTIONS:</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <XCircle className="w-4 h-4 text-red-600" />
                Cannot create or modify bookings
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <XCircle className="w-4 h-4 text-red-600" />
                Cannot access financial data or reports
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <XCircle className="w-4 h-4 text-red-600" />
                Cannot process payments or refunds
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <XCircle className="w-4 h-4 text-red-600" />
                Cannot manage other staff members
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-primary">
                <XCircle className="w-4 h-4 text-red-600" />
                Cannot change facility settings
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              Edit Permissions
            </Button>
            <Button variant="outline" size="sm">
              Change Role
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule & Availability */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Schedule & Availability</h3>
          <Button variant="outline" size="sm">
            Request Time Off
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-gray-900 dark:text-text-primary mb-2"><strong>Regular Schedule:</strong></p>
          <p className="text-gray-700 dark:text-text-primary">Monday-Friday: 8:00 AM - 5:00 PM (9 hours/day)</p>
          <p className="text-gray-700 dark:text-text-primary">Saturday-Sunday: Off</p>
          <p className="text-gray-700 dark:text-text-primary mt-2"><strong>Weekly hours:</strong> 45 hours</p>
          <p className="text-gray-700 dark:text-text-primary"><strong>This week:</strong> 43 hours scheduled, 38 hours worked so far</p>
        </div>

        <div className="mb-4">
          <p className="text-gray-900 dark:text-text-primary mb-2"><strong>Areas of responsibility:</strong></p>
          <div className="flex flex-wrap gap-2">
            {staff.areas.map((area, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200 rounded-full text-sm">
                {area}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            View Full Schedule
          </Button>
          <Button variant="outline" size="sm">
            Request Time Off
          </Button>
        </div>
      </div>

      {/* Skills & Certifications */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Skills & Certifications</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Certification
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Skill
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">Pet First Aid Certified</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Issued: Jan 2023 • Expires: Jan 2026</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View Certificate
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">CPR Certified (Pet & Human)</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Issued: Jan 2023 • Expires: Jan 2026</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View Certificate
            </Button>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <h5 className="font-medium text-gray-900 dark:text-text-primary mb-2">Special skills:</h5>
            <ul className="text-sm text-gray-700 dark:text-text-primary space-y-1">
              <li>• Excellent with anxious dogs</li>
              <li>• Medication administration</li>
              <li>• Basic grooming (bathing, nail trimming)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Performance Metrics (Last 30 Days)</h3>
          <Button variant="outline" size="sm">
            View Full Performance Report
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-1">⭐⭐⭐⭐⭐ 4.9/5.0</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Overall Rating</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">Based on 12 reviews</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-1">98.5%</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Task Completion</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">On-time rate</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-1">96%</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Attendance</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">Very Good</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-1">247</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Tasks Completed</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">This month</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h5 className="font-medium text-green-700 mb-2">Strengths:</h5>
            <ul className="text-sm text-gray-700 dark:text-text-primary space-y-1">
              <li>• Exceptional with anxious/nervous dogs</li>
              <li>• Strong customer relationships</li>
              <li>• Reliable and consistent quality work</li>
              <li>• Natural leader, mentors new staff</li>
            </ul>
          </div>

          <div>
            <h5 className="font-medium text-orange-700 mb-2">Areas for improvement:</h5>
            <ul className="text-sm text-gray-700 dark:text-text-primary space-y-1">
              <li>• Punctuality - late clock-ins increasing</li>
              <li>• Time management - tasks sometimes rushed at end of day</li>
              <li>• Documentation - incident reports need more detail</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" size="sm">
            Schedule Review Meeting
          </Button>
        </div>
      </div>

      {/* Time & Attendance */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Time & Attendance</h3>
          <Button variant="outline" size="sm">
            Export Hours
          </Button>
        </div>

        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">This Week (Oct 13-19):</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Monday: 9h 15m (8:00 AM - 5:15 PM)</span>
            </div>
            <div className="flex justify-between">
              <span>Tuesday: 8h 45m (8:00 AM - 4:45 PM)</span>
            </div>
            <div className="flex justify-between">
              <span>Wednesday: 8h 58m (7:58 AM - 4:56 PM)</span>
              <span className="text-blue-600 dark:text-blue-400">← Today</span>
            </div>
            <div className="flex justify-between">
              <span>Thursday: Not yet worked</span>
            </div>
            <div className="flex justify-between">
              <span>Friday: Not yet worked</span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <p className="text-sm"><strong>Total this week:</strong> 26h 58m</p>
            <p className="text-sm"><strong>Expected by end of week:</strong> 45h</p>
          </div>
        </div>

        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">This Month (Oct 1-15):</h5>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
              <div className="text-lg font-bold text-gray-900 dark:text-text-primary">87h 15m</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Hours worked</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
              <div className="text-lg font-bold text-gray-900 dark:text-text-primary">2h 15m</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Overtime hours</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
              <div className="text-lg font-bold text-gray-900 dark:text-text-primary">3</div>
              <div className="text-sm text-gray-600 dark:text-text-secondary">Late arrivals</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <p className="text-sm"><strong>Absences:</strong> 0</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            View Detailed Timesheet
          </Button>
          <Button variant="outline" size="sm">
            Export Hours
          </Button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Recent Activity</h3>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-gray-600 dark:text-text-secondary">Today</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>7:58 AM - Clocked in</li>
              <li>8:15 AM - Checked in Max (Golden Retriever)</li>
              <li>9:00 AM - Logged feeding for 8 dogs</li>
              <li>10:30 AM - Uploaded photos to 5 customer accounts</li>
              <li>12:00 PM - Administered medication to Max</li>
              <li>2:15 PM - Checked out Charlie (Beagle)</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" size="sm">
            View Full Activity Log
          </Button>
        </div>
      </div>

      {/* Notes & Communications */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Notes & Communications</h3>
          <Button variant="outline" size="sm">
            Add Note
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">Internal notes (not visible to {staff.name}):</p>
          <div className="p-4 bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
            <p className="text-sm">
              <strong>Oct 10, 2025 - Mike Thompson:</strong> Jenny handled a difficult customer situation expertly today.
              Customer was upset about pricing, she remained calm and professional. Great work!
            </p>
          </div>

          <div className="mt-3 p-4 bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg">
            <p className="text-sm">
              <strong>Sept 28, 2025 - Sarah Johnson:</strong> Need to remind Jenny about clocking in on time.
              She's been 10-15 mins late 3 times this month.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            Add Note
          </Button>
          <Button variant="outline" size="sm">
            View All Notes
          </Button>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Documents</h3>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Upload Document
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">W-4 Tax Form</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">uploaded Mar 12, 2023</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">Emergency Contact Form</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">uploaded Mar 12, 2023</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">Employee Handbook Acknowledgment</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">signed Mar 15, 2023</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">Pet First Aid Certificate</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">expires Jan 2026</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary">CPR Certificate</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">expires Jan 2026</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" size="sm">
            View All Documents
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StaffProfileView;
