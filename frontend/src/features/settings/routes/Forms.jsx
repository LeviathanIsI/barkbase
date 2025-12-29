import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  Download, 
  RefreshCw,
  CheckCircle,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const Forms = () => {
  const tz = useTimezoneUtils();
  // Forms state
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [formSettings, setFormSettings] = useState({
    requireSignature: true,
    saveIncomplete: true,
    emailCopy: true,
    autoReminder: true,
    reminderDays: 3
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState([]);
  const [isUsingTemplate, setIsUsingTemplate] = useState(null);

  // Fetch forms from API
  const fetchForms = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get('/api/v1/forms');
      setForms(data?.forms || []);
    } catch (err) {
      console.error('Failed to fetch forms:', err);
      setForms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch form settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/forms/settings');
      setFormSettings({
        requireSignature: data?.requireSignature ?? true,
        saveIncomplete: data?.saveIncomplete ?? true,
        emailCopy: data?.emailCopy ?? true,
        autoReminder: data?.autoReminder ?? true,
        reminderDays: data?.reminderDays ?? 3,
      });
    } catch (err) {
      console.error('Failed to fetch form settings:', err);
    }
  }, []);

  // Fetch form templates
  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/forms/templates');
      setTemplates(data?.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchForms();
    fetchSettings();
    fetchTemplates();
  }, [fetchForms, fetchSettings, fetchTemplates]);

  // Handlers
  const handleCreateForm = () => {
    alert('Form builder coming soon! Use a template to get started.');
  };

  const handleEditForm = (form) => {
    alert(`Form editor for "${form.name}" coming soon!`);
  };

  const handleDeleteForm = async (form) => {
    if (!confirm(`Are you sure you want to delete "${form.name}"?`)) return;
    
    try {
      await apiClient.delete(`/api/v1/forms/${form.id}`);
      setForms(prev => prev.filter(f => f.id !== form.id));
    } catch (err) {
      console.error('Failed to delete form:', err);
      alert('Failed to delete form');
    }
  };

  const handlePreviewForm = (form) => {
    alert(`Form preview for "${form.name}" coming soon!`);
  };

  const handleDuplicateForm = async (form) => {
    try {
      const { data } = await apiClient.post(`/api/v1/forms/${form.id}/duplicate`);
      fetchForms(); // Refresh list
      alert(`Form "${data.name}" created`);
    } catch (err) {
      console.error('Failed to duplicate form:', err);
      alert('Failed to duplicate form');
    }
  };

  const handleUseTemplate = async (templateId) => {
    try {
      setIsUsingTemplate(templateId);
      const { data } = await apiClient.post(`/api/v1/forms/templates/${templateId}/use`);
      fetchForms(); // Refresh list
      alert(`Form "${data.name}" created from template`);
    } catch (err) {
      console.error('Failed to use template:', err);
      alert('Failed to create form from template');
    } finally {
      setIsUsingTemplate(null);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...formSettings, [key]: value };
    setFormSettings(newSettings);
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      await apiClient.put('/api/v1/forms/settings', formSettings);
      alert('Settings saved successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExportForms = async () => {
    try {
      const { data } = await apiClient.get('/api/v1/forms');
      const blob = new Blob([JSON.stringify(data.forms, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barkbase_forms_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export forms:', err);
      alert('Failed to export forms');
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Unknown';
    return tz.formatDate(new Date(dateString), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SettingsPage 
      title="Forms & Waivers" 
      description="Manage customer forms and agreements"
    >
      {/* Forms List */}
      <Card 
        header={(
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text">Custom Forms</h3>
              <p className="text-sm text-muted">Create and manage your forms</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchForms} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
              <Button onClick={handleCreateForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Form
              </Button>
            </div>
          </div>
        )}
      >
        {isLoading && forms.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted/30 mx-auto mb-4" />
            <p className="text-sm font-medium text-text">No forms yet</p>
            <p className="text-xs text-muted mt-1 mb-4">Create your first form or use a template to get started.</p>
            <Button onClick={handleCreateForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Form
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {forms.map(form => (
              <div
                key={form.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/30 bg-surface transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text">{form.name}</h4>
                      {form.isRequired && (
                        <Badge variant="warning" size="sm">Required</Badge>
                      )}
                      <Badge variant={form.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {form.status === 'active' ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> {form.status}</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted mt-1">
                      <span>{form.fieldCount || 0} fields</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {form.submissionCount || 0} submissions
                      </span>
                      <span>•</span>
                      <span>Modified {formatDateDisplay(form.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => handlePreviewForm(form)} title="Preview">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicateForm(form)} title="Duplicate">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEditForm(form)} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteForm(form)} 
                    title="Delete"
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Form Settings */}
      <Card 
        title="Form Settings" 
        description="Configure form behavior and requirements"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text">Require Electronic Signature</h4>
              <p className="text-sm text-muted">Customers must sign forms electronically</p>
            </div>
            <Switch
              checked={formSettings.requireSignature}
              onCheckedChange={(checked) => updateSetting('requireSignature', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text">Save Incomplete Forms</h4>
              <p className="text-sm text-muted">Allow customers to save and resume later</p>
            </div>
            <Switch
              checked={formSettings.saveIncomplete}
              onCheckedChange={(checked) => updateSetting('saveIncomplete', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text">Email Copy to Customer</h4>
              <p className="text-sm text-muted">Send completed forms to customer email</p>
            </div>
            <Switch
              checked={formSettings.emailCopy}
              onCheckedChange={(checked) => updateSetting('emailCopy', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-text">Automatic Reminders</h4>
              <p className="text-sm text-muted">Remind customers to complete forms</p>
            </div>
            <Switch
              checked={formSettings.autoReminder}
              onCheckedChange={(checked) => updateSetting('autoReminder', checked)}
            />
          </div>

          {formSettings.autoReminder && (
            <div className="ml-8 p-4 bg-surface-secondary rounded-lg">
              <label className="block text-sm font-medium mb-2 text-text">
                Send reminder after
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={formSettings.reminderDays}
                  onChange={(e) => updateSetting('reminderDays', parseInt(e.target.value) || 1)}
                  min="1"
                  max="14"
                  className="w-20"
                />
                <span className="text-sm text-muted">days</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Form Templates */}
      <Card 
        title="Form Templates" 
        description="Start with pre-built templates"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(template => (
            <div 
              key={template.id}
              className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors bg-surface"
            >
              <h4 className="font-medium text-text mb-2">{template.name}</h4>
              <p className="text-sm text-muted mb-3">{template.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{template.fields?.length || 0} fields</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUseTemplate(template.id)}
                  disabled={isUsingTemplate === template.id}
                >
                  {isUsingTemplate === template.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Use Template'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
          <Button variant="outline" onClick={handleExportForms}>
            <Download className="w-4 h-4 mr-2" />
            Export All Forms
          </Button>
          <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
            {isSavingSettings ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Forms;
