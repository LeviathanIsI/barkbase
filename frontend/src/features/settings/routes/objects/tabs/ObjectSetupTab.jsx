import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Settings, Type, Eye, FileText, MoreVertical,
  ExternalLink, Download, Activity, Save
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';

const ObjectSetupTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [showActions, setShowActions] = useState(false);

  const { register, handleSubmit, watch, formState: { isDirty } } = useForm({
    defaultValues: {
      singularName: config?.labelSingular || '',
      pluralName: config?.labelPlural || '',
      primaryProperty: config?.primaryProperty || 'name',
      description: config?.description || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Object settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Header with description and actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-muted">
            Any person who interacts with a {config.labelSingular.toLowerCase()} record in your account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            View {config.labelPlural} in the data model
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Main Settings */}
        <div className="lg:col-span-3 space-y-4">
          {/* Display Names Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">Display Names</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Singular Name</label>
                  <Input
                    {...register('singularName')}
                    placeholder="e.g., Pet"
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted">Used when referring to a single record</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Plural Name</label>
                  <Input
                    {...register('pluralName')}
                    placeholder="e.g., Pets"
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted">Used when referring to multiple records</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Description</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full rounded border border-border bg-surface-secondary px-3 py-2 text-sm resize-none"
                  placeholder="Describe what this object represents..."
                />
              </div>

              {isDirty && (
                <div className="flex justify-end">
                  <Button type="submit" size="sm">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* Properties Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text">Properties</h2>
              </div>
              <a href={`/settings/properties?object=${objectType}`} className="text-xs text-primary hover:underline">
                Manage {config.labelSingular} properties
              </a>
            </div>

            <p className="text-xs text-muted mb-4">
              Manage the information you collect about your {config.labelPlural}.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Primary Display Property</label>
                <Select
                  value={watch('primaryProperty')}
                  onChange={(e) => {}}
                  options={[
                    { value: 'name', label: 'Name' },
                    { value: 'id', label: 'ID' },
                    { value: 'email', label: 'Email' },
                  ]}
                  className="text-sm"
                />
                <p className="text-[10px] text-muted">
                  The main identifying field shown in lists and associations
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Secondary Display Properties</label>
                <div className="flex flex-wrap gap-1.5">
                  {(config.secondaryProperties || []).map((prop) => (
                    <span
                      key={prop}
                      className="inline-flex items-center px-2 py-1 text-xs bg-surface-secondary rounded border border-border"
                    >
                      {prop}
                    </span>
                  ))}
                  <button className="inline-flex items-center px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded border border-dashed border-primary/50">
                    + Add property
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Creating Records Card */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-text mb-4">Creating {config.labelPlural}</h2>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-secondary">
              <div className="w-12 h-10 rounded bg-surface flex items-center justify-center border border-border">
                <FileText className="w-5 h-5 text-muted" />
              </div>
              <div className="flex-1">
                <a href="#" className="text-sm font-medium text-primary hover:underline">
                  Customize the 'Create {config.labelSingular}' form
                </a>
                <p className="text-xs text-muted mt-0.5">
                  Add, remove, or edit fields on the 'Create {config.labelSingular}' form
                </p>
              </div>
            </div>
          </Card>

          {/* Automation Card */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-text mb-4">Automation</h2>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-border" defaultChecked />
                <div>
                  <span className="text-sm font-medium text-text">
                    Auto-assign owner on creation
                  </span>
                  <p className="text-xs text-muted mt-0.5">
                    When a new {config.labelSingular.toLowerCase()} is created, automatically assign the current user as the owner.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-border" />
                <div>
                  <span className="text-sm font-medium text-text">
                    Send notification on creation
                  </span>
                  <p className="text-xs text-muted mt-0.5">
                    Send an email notification when a new {config.labelSingular.toLowerCase()} record is created.
                  </p>
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column - Object Info & Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Object Info Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text">{config.label}</h2>
                <p className="text-xs text-muted">{config.hasPipeline ? 'Pipeline Object' : 'Standard Object'}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Object ID</span>
                <span className="font-mono text-text">{config.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Type</span>
                <span className="text-text">{config.hasPipeline ? 'Pipeline' : 'Standard'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Properties</span>
                <span className="text-text">{12 + Math.floor(Math.random() * 8)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted">Records</span>
                <span className="text-text">{Math.floor(Math.random() * 500)}</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-text mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-surface-secondary transition-colors">
                <Eye className="w-4 h-4 text-muted" />
                <span>View all {config.labelPlural}</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-surface-secondary transition-colors">
                <Download className="w-4 h-4 text-muted" />
                <span>Export schema</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-surface-secondary transition-colors">
                <Activity className="w-4 h-4 text-muted" />
                <span>View usage analytics</span>
              </button>
            </div>
          </Card>

          {/* Data Quality Card */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-text mb-3">Data Quality</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted">Completeness</span>
                  <span className="text-text font-medium">87%</span>
                </div>
                <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '87%' }} />
                </div>
              </div>
              <p className="text-xs text-muted">
                Based on required fields completion across all {config.labelPlural.toLowerCase()}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ObjectSetupTab;
