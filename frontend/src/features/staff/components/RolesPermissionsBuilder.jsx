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
            <p className="text-sm text-gray-600 dark:text-text-secondary">Full access to all features</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-text-primary">👔 Manager (2 staff)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Operational oversight</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-text-primary">👤 Kennel Attendant (4 staff)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Day-to-day pet care</p>
          </div>
          <div className="p-4 border border-gray-200 dark:border-surface-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-text-primary">✂️ Groomer (1 staff)</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Professional grooming</p>
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

        {/* Sample Permissions */}
        <div className="space-y-4">
          <div>
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
                <input type="checkbox" checked className="rounded" />
                <span className="text-sm">Check in/out pets</span>
              </label>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">PET CARE</h5>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked className="rounded" />
                <span className="text-sm">Log activities</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked className="rounded" />
                <span className="text-sm">Upload photos/videos</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked className="rounded" />
                <span className="text-sm">View medical records</span>
              </label>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 dark:text-text-primary mb-3">FINANCIAL</h5>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">Process payments</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">View financial reports</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-surface-border mt-6">
          <Button variant="outline">Cancel Changes</Button>
          <Button>💾 Save Permissions</Button>
        </div>
      </Card>
    </div>
  );
};

export default RolesPermissionsBuilder;
