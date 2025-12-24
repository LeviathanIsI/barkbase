import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { usePageView } from '@/hooks/useTelemetry';
import apiClient from '@/lib/apiClient';

const PropertyDetail = () => {
  usePageView('property-detail');

  const { objectType, propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('details');

  // Form state
  const [formData, setFormData] = useState({
    label: '',
    name: '',
    type: '',
    group: '',
    description: '',
    required: false,
    options: {},
  });

  useEffect(() => {
    fetchProperty();
  }, [objectType, propertyId]);

  const fetchProperty = async () => {
    setLoading(true);
    try {
      // Fetch all properties for the object type (v2 API)
      const res = await apiClient.get(`/api/v2/properties?objectType=${objectType}`);
      const data = res.data;

      // v2 returns { properties: [], metadata: {...} }
      const allProperties = data?.properties || data || [];
      const prop = allProperties.find(p => p.propertyId === propertyId || p.recordId === propertyId);

      if (prop) {
        setProperty(prop);
        setFormData({
          label: prop.label,
          name: prop.name,
          type: prop.type,
          group: prop.group,
          description: prop.description || '',
          required: prop.required,
          options: prop.options || {},
        });
      }
    } catch (error) {
      console.error('Failed to fetch property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use v2 API for updates
      await apiClient.patch(`/api/v2/properties/${propertyId}`, {
        displayLabel: formData.label,
        description: formData.description,
        propertyGroup: formData.group,
      });

      navigate(`/settings/properties?tab=${objectType}`);
    } catch (error) {
      console.error('Failed to save property:', error);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { recordId: 'details', label: 'Details' },
    { recordId: 'field-type', label: 'Field type' },
    { recordId: 'rules', label: 'Rules' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-muted">Loading property...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted">Property not found</p>
        <Button
          variant="outline"
          onClick={() => navigate('/settings/properties')}
          className="mt-4"
        >
          Back to Properties
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/settings/properties?tab=${objectType}`)}
            className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text">{property.label}</h1>
            <p className="text-xs text-muted mt-0.5">
              {objectType.charAt(0).toUpperCase() + objectType.slice(1)}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-border bg-surface">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Manage
            </h2>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.recordId}
                  onClick={() => setActiveSection(section.recordId)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeSection === section.recordId
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-text hover:bg-surface/80'
                  }`}
                >
                  {activeSection === section.recordId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <span className={activeSection === section.recordId ? '' : 'ml-6'}>
                    {section.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-3xl p-8">
            {activeSection === 'details' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-text mb-4">
                    Add property details
                  </h2>
                  <p className="text-sm text-muted mb-6">
                    In BarkBase, data is stored in properties. After you create new properties, you can edit them in Property Settings.
                  </p>
                </div>

                {/* Property Label */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Property label <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Internal name: {property.name} (cannot be changed)
                  </p>
                </div>

                {/* Object Type */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Object type <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={objectType.charAt(0).toUpperCase() + objectType.slice(1)}
                    disabled
                    className="w-full rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-text cursor-not-allowed opacity-60"
                  />
                  <p className="mt-1 text-xs text-muted">Cannot be changed after creation</p>
                </div>

                {/* Group */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Group <span className="text-red-600">*</span>
                  </label>
                  <StyledSelect
                    options={[
                      { value: 'basic_info', label: 'Basic Information' },
                      { value: 'contact_info', label: 'Contact Information' },
                      { value: 'custom_fields', label: 'Custom Fields' },
                      { value: 'identification', label: 'Identification' },
                      { value: 'medical', label: 'Medical Information' },
                      { value: 'financial', label: 'Financial' },
                      { value: 'status', label: 'Status' },
                      { value: 'notes', label: 'Notes' },
                    ]}
                    value={formData.group}
                    onChange={(opt) => setFormData({ ...formData, group: opt?.value || 'basic_info' })}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Add a description to help users understand this property"
                  />
                </div>

                {property.system && (
                  <div className="rounded-lg bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>System Property:</strong> This is a built-in property. You can edit the label, group, and description, but the internal name, object type, and field type cannot be changed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'field-type' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-text mb-2">
                    Field type
                  </h2>
                  <p className="text-sm text-muted mb-6">
                    The field type determines how data is stored and displayed.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Type
                  </label>
                  <input
                    type="text"
                    value={property.type}
                    disabled
                    className="w-full rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-text cursor-not-allowed opacity-60"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Field type cannot be changed after creation
                  </p>
                </div>

                {/* Show enum options if applicable */}
                {(property.type === 'enum' || property.type === 'multi_enum') && property.options?.choices && (
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {property.options.choices.map((choice, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text"
                        >
                          {choice}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'rules' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-text mb-2">
                    Validation rules
                  </h2>
                  <p className="text-sm text-muted mb-6">
                    Set rules to validate data entered into this property.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label className="text-sm text-text">
                    Make this property required
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
