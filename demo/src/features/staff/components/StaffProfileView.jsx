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
            <div className="w-24 h-24 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center text-white font-semibold text-2xl">
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
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-1">⭐⭐⭐⭐⭐ 4.9/5.0</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Overall Rating</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">Based on 12 reviews</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-1">98.5%</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Task Completion</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">On-time rate</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-1">96%</div>
            <div className="text-sm text-gray-600 dark:text-text-secondary">Attendance</div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">Very Good</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-1">247</div>
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
    </div>
  );
};

export default StaffProfileView;
