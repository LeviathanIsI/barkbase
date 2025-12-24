import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Settings, Type, Eye, FileText,
  ExternalLink, Download, Activity, Save, Loader2, X, Plus, Check
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { OBJECT_TYPES } from '../objectConfig';
import {
  useObjectSettings,
  useUpdateObjectSettings,
  useObjectProperties
} from '@/features/settings/api/objectSettingsApi';

const ObjectSetupTab = ({ objectType }) => {
  const config = OBJECT_TYPES[objectType];
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [exportingSchema, setExportingSchema] = useState(false);

  // Fetch object settings from API
  const { data: settings, isLoading: settingsLoading } = useObjectSettings(objectType);
  const { data: propertiesData, isLoading: propertiesLoading } = useObjectProperties(objectType);
  const updateSettings = useUpdateObjectSettings(objectType);

  const { register, handleSubmit, watch, reset, setValue, formState: { isDirty } } = useForm({
    defaultValues: {
      singularName: '',
      pluralName: '',
      primaryDisplayProperty: 'name',
      secondaryDisplayProperties: [],
      description: '',
      autoAssignOwner: true,
      sendNotificationOnCreate: false,
    },
  });

  const secondaryDisplayProperties = watch('secondaryDisplayProperties') || [];

  // Reset form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        singularName: settings.singularName || config?.labelSingular || '',
        pluralName: settings.pluralName || config?.labelPlural || '',
        primaryDisplayProperty: settings.primaryDisplayProperty || 'name',
        secondaryDisplayProperties: settings.secondaryDisplayProperties || [],
        description: settings.description || '',
        autoAssignOwner: settings.autoAssignOwner !== false,
        sendNotificationOnCreate: settings.sendNotificationOnCreate || false,
      });
    }
  }, [settings, config, reset]);

  // Build property options for select
  const propertyOptions = useMemo(() => {
    if (!propertiesData?.properties) {
      return [
        { value: 'name', label: 'Name' },
        { value: 'id', label: 'ID' },
      ];
    }
    return propertiesData.properties.map(p => ({
      value: p.name,
      label: p.label || p.name,
    }));
  }, [propertiesData]);

  // Available properties for secondary (exclude primary and already selected)
  const availableSecondaryProperties = useMemo(() => {
    const primaryProp = watch('primaryDisplayProperty');
    return propertyOptions.filter(
      p => p.value !== primaryProp && !secondaryDisplayProperties.includes(p.value)
    );
  }, [propertyOptions, watch('primaryDisplayProperty'), secondaryDisplayProperties]);

  const onSubmit = async (data) => {
    try {
      await updateSettings.mutateAsync(data);
      toast.success('Object settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleAddSecondaryProperty = (propValue) => {
    const current = secondaryDisplayProperties || [];
    setValue('secondaryDisplayProperties', [...current, propValue], { shouldDirty: true });
    setShowPropertyPicker(false);
  };

  const handleRemoveSecondaryProperty = (propValue) => {
    const current = secondaryDisplayProperties || [];
    setValue('secondaryDisplayProperties', current.filter(p => p !== propValue), { shouldDirty: true });
  };

  const handleExportSchema = async () => {
    setExportingSchema(true);
    try {
      // Generate schema JSON
      const schema = {
        objectType,
        singularName: watch('singularName'),
        pluralName: watch('pluralName'),
        description: watch('description'),
        primaryDisplayProperty: watch('primaryDisplayProperty'),
        secondaryDisplayProperties: secondaryDisplayProperties,
        properties: propertiesData?.properties || [],
        settings: {
          autoAssignOwner: watch('autoAssignOwner'),
          sendNotificationOnCreate: watch('sendNotificationOnCreate'),
        },
        exportedAt: new Date().toISOString(),
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${objectType}-schema.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Schema exported successfully');
    } catch (error) {
      toast.error('Failed to export schema');
    } finally {
      setExportingSchema(false);
    }
  };

  const handleViewAnalytics = () => {
    // Navigate to analytics page for this object type
    window.location.href = `/analytics?object=${objectType}`;
  };

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Object type not found</p>
      </div>
    );
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const Icon = config.icon;
  const singularName = watch('singularName') || config.labelSingular;
  const pluralName = watch('pluralName') || config.labelPlural;

  return (
    <div className="space-y-4">
      {/* Header with description and actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-muted">
            Configure how {pluralName} are displayed and managed in your account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/settings/data-model?object=${objectType}`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            View {pluralName} in the data model
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Single form wrapping everything */}
      <form onSubmit={handleSubmit(onSubmit)}>
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

              <div className="space-y-4">
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
                    className="w-full rounded border border-border bg-surface-secondary px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Describe what this object represents..."
                  />
                </div>
              </div>
            </Card>

            {/* Properties Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-text">Properties</h2>
                </div>
                <a href={`/settings/properties?object=${objectType}`} className="text-xs text-primary hover:underline">
                  Manage {singularName} properties
                </a>
              </div>

              <p className="text-xs text-muted mb-4">
                Manage the information you collect about your {pluralName}.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Primary Display Property</label>
                  <Select
                    {...register('primaryDisplayProperty')}
                    options={propertyOptions}
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted">
                    The main identifying field shown in lists and associations
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">Secondary Display Properties</label>
                  <div className="flex flex-wrap gap-1.5">
                    {secondaryDisplayProperties.map((prop) => (
                      <span
                        key={prop}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-surface-secondary rounded border border-border group"
                      >
                        {propertyOptions.find(p => p.value === prop)?.label || prop}
                        <button
                          type="button"
                          onClick={() => handleRemoveSecondaryProperty(prop)}
                          className="opacity-50 hover:opacity-100 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPropertyPicker(!showPropertyPicker)}
                        className="inline-flex items-center px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded border border-dashed border-primary/50"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add property
                      </button>
                      {showPropertyPicker && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-10 max-h-48 overflow-y-auto">
                          {availableSecondaryProperties.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted">No more properties available</div>
                          ) : (
                            availableSecondaryProperties.map(prop => (
                              <button
                                key={prop.value}
                                type="button"
                                onClick={() => handleAddSecondaryProperty(prop.value)}
                                className="w-full px-3 py-2 text-xs text-left hover:bg-surface-secondary"
                              >
                                {prop.label}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted">
                    Additional properties shown in lists and previews
                  </p>
                </div>
              </div>
            </Card>

            {/* Creating Records Card */}
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-text mb-4">Creating {pluralName}</h2>

              <a
                href={`/settings/forms/${objectType}/create`}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-secondary hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-10 rounded bg-surface flex items-center justify-center border border-border">
                  <FileText className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-primary hover:underline">
                    Customize the 'Create {singularName}' form
                  </span>
                  <p className="text-xs text-muted mt-0.5">
                    Add, remove, or edit fields on the 'Create {singularName}' form
                  </p>
                </div>
              </a>
            </Card>

            {/* Automation Card */}
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-text mb-4">Automation</h2>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('autoAssignOwner')}
                    className="mt-0.5 rounded border-border"
                  />
                  <div>
                    <span className="text-sm font-medium text-text">
                      Auto-assign owner on creation
                    </span>
                    <p className="text-xs text-muted mt-0.5">
                      When a new {singularName.toLowerCase()} is created, automatically assign the current user as the owner.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('sendNotificationOnCreate')}
                    className="mt-0.5 rounded border-border"
                  />
                  <div>
                    <span className="text-sm font-medium text-text">
                      Send notification on creation
                    </span>
                    <p className="text-xs text-muted mt-0.5">
                      Send an email notification when a new {singularName.toLowerCase()} record is created.
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
                  <h2 className="text-sm font-semibold text-text">{singularName}</h2>
                  <p className="text-xs text-muted">{settings?.isPipelineObject ? 'Pipeline Object' : 'Standard Object'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted">Object ID</span>
                  <span className="font-mono text-text">{objectType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted">Type</span>
                  <span className="text-text">{settings?.isPipelineObject ? 'Pipeline' : 'Standard'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border">
                  <span className="text-muted">Properties</span>
                  <span className="text-text">
                    {propertiesLoading ? '...' : (propertiesData?.properties?.length || 0)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted">Records</span>
                  <span className="text-text">{settings?.recordCount ?? 0}</span>
                </div>
              </div>
            </Card>

            {/* Quick Actions Card */}
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-text mb-3">Quick Actions</h2>
              <div className="space-y-2">
                <a
                  href={`/${objectType}`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-surface-secondary transition-colors"
                >
                  <Eye className="w-4 h-4 text-muted" />
                  <span>View all {pluralName}</span>
                </a>
                <button
                  type="button"
                  onClick={handleExportSchema}
                  disabled={exportingSchema}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-surface-secondary transition-colors disabled:opacity-50"
                >
                  {exportingSchema ? (
                    <Loader2 className="w-4 h-4 text-muted animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-muted" />
                  )}
                  <span>Export schema</span>
                </button>
                <button
                  type="button"
                  onClick={handleViewAnalytics}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded hover:bg-surface-secondary transition-colors"
                >
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
                    <span className="text-text font-medium">{settings?.dataQuality ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (settings?.dataQuality ?? 0) >= 80
                          ? 'bg-green-500'
                          : (settings?.dataQuality ?? 0) >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${settings?.dataQuality ?? 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted">
                  Based on required fields completion across all {pluralName.toLowerCase()}
                </p>
              </div>
            </Card>

            {/* Save Button - Always visible when dirty */}
            {isDirty && (
              <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save All Changes
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Click outside to close property picker */}
      {showPropertyPicker && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setShowPropertyPicker(false)}
        />
      )}
    </div>
  );
};

export default ObjectSetupTab;
