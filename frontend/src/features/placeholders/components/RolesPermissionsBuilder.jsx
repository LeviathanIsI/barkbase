import { Plus, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const RolesPermissionsBuilder = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary">Roles & Permissions</h2>
          <p className="text-gray-600 dark:text-text-secondary">Define custom roles with granular access control</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-1" />
          Create Role
        </Button>
      </div>

      {/* Existing Roles */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">Existing Roles (4)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-text-primary">👑 Admin (2 staff)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Full access to all features and settings</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-text-primary">👔 Manager (2 staff)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Operational oversight and team coordination</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-text-primary">👤 Kennel Attendant (4 staff)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Day-to-day pet care and facility operations</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-text-primary">✂️ Groomer (1 staff)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Professional grooming services</p>
          </div>
        </div>
      </Card>

      {/* Selected Role */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Kennel Attendant</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Edit</Button>
            <Button variant="outline" size="sm">Duplicate</Button>
            <Button variant="outline" size="sm" className="text-red-600">Delete</Button>
          </div>
        </div>

        <h4 className="font-medium text-gray-900 dark:text-text-primary mb-4">Permissions Matrix</h4>

        {/* Bookings & Scheduling */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">BOOKINGS & SCHEDULING</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">View bookings</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Create bookings</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Modify bookings</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">Check in/out pets</span>
            </label>
          </div>
        </div>

        {/* Customer Management */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">CUSTOMER MANAGEMENT</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">View customer profiles</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Edit customer profiles</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">Send messages to customers</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Delete customer accounts</span>
            </label>
          </div>
        </div>

        {/* Pet Care */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">PET CARE</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">View pet profiles</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">Log activities (feeding, medications)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">Upload photos/videos</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">View medical records</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Edit medical records</span>
            </label>
          </div>
        </div>

        {/* Financial */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">FINANCIAL</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View pricing</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Process payments</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Issue refunds</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View financial reports</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Modify pricing</span>
            </label>
          </div>
        </div>

        {/* Facility Management */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">FACILITY MANAGEMENT</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">View facility layout</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Modify facility settings</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked className="rounded" />
              <span className="text-sm">Assign pets to kennels</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Add/remove kennels</span>
            </label>
          </div>
        </div>

        {/* Staff Management */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">STAFF MANAGEMENT</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View other staff profiles</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Edit staff profiles</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View staff schedules</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Modify staff schedules</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Add/remove staff</span>
            </label>
          </div>
        </div>

        {/* Reports & Analytics */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">REPORTS & ANALYTICS</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View operational reports</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View financial reports</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View staff performance reports</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Export data</span>
            </label>
          </div>
        </div>

        {/* System Settings */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">SYSTEM SETTINGS</h5>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Access system settings</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Manage integrations</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">View audit logs</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Manage billing</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline">Cancel Changes</Button>
          <Button>💾 Save Permissions</Button>
        </div>
      </Card>
    </div>
  );
};

export default RolesPermissionsBuilder;
