import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import SettingsPage from '../components/SettingsPage';
import { FileText, Plus, Edit, Trash2, Eye, Copy, Download } from 'lucide-react';

const Forms = () => {
  const [forms, setForms] = useState([
    {
      id: 1,
      name: 'New Customer Form',
      type: 'intake',
      fields: 12,
      submissions: 234,
      lastModified: '2024-01-10',
      active: true,
      required: true
    },
    {
      id: 2,
      name: 'Pet Health Questionnaire',
      type: 'health',
      fields: 18,
      submissions: 189,
      lastModified: '2024-01-05',
      active: true,
      required: false
    },
    {
      id: 3,
      name: 'Daycare Agreement',
      type: 'agreement',
      fields: 8,
      submissions: 145,
      lastModified: '2023-12-20',
      active: true,
      required: true
    },
    {
      id: 4,
      name: 'Grooming Preferences',
      type: 'service',
      fields: 10,
      submissions: 67,
      lastModified: '2023-12-15',
      active: false,
      required: false
    }
  ]);

  const [formSettings, setFormSettings] = useState({
    requireSignature: true,
    saveIncomplete: true,
    emailCopy: true,
    autoReminder: true,
    reminderDays: 3
  });

  const handleCreateForm = () => {
    alert('Opening form builder...');
  };

  const handleEditForm = (form) => {
    alert(`Opening form editor for: ${form.name}`);
  };

  const handleDeleteForm = (form) => {
    if (confirm(`Are you sure you want to delete "${form.name}"?`)) {
      setForms(forms.filter(f => f.id !== form.id));
      alert('Form deleted');
    }
  };

  const handlePreviewForm = (form) => {
    alert(`Opening preview for: ${form.name}`);
  };

  const handleDuplicateForm = (form) => {
    const duplicate = {
      ...form,
      id: Math.max(...forms.map(f => f.id)) + 1,
      name: `${form.name} (Copy)`,
      submissions: 0
    };
    setForms([...forms, duplicate]);
    alert('Form duplicated');
  };

  const updateSetting = (key, value) => {
    setFormSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPage 
      title="Forms & Waivers" 
      description="Manage customer forms and agreements"
    >
      {/* Forms List */}
      <Card 
        title="Custom Forms" 
        description="Create and manage your forms"
        actions={
          <Button onClick={handleCreateForm}>
            <Plus className="w-4 h-4 mr-2" />
            New Form
          </Button>
        }
      >
        <div className="space-y-3">
          {forms.map(form => (
            <div
              key={form.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{form.name}</h4>
                    {form.required && (
                      <Badge variant="warning" size="sm">Required</Badge>
                    )}
                    <Badge variant={form.active ? 'success' : 'neutral'} size="sm">
                      {form.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>{form.fields} fields</span>
                    <span>•</span>
                    <span>{form.submissions} submissions</span>
                    <span>•</span>
                    <span>Modified {form.lastModified}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreviewForm(form)}
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicateForm(form)}
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditForm(form)}
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteForm(form)}
                  title="Delete"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Form Settings */}
      <Card 
        title="Form Settings" 
        description="Configure form behavior and requirements"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Require Electronic Signature</h4>
              <p className="text-sm text-gray-600">Customers must sign forms electronically</p>
            </div>
            <Switch
              checked={formSettings.requireSignature}
              onChange={(checked) => updateSetting('requireSignature', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Save Incomplete Forms</h4>
              <p className="text-sm text-gray-600">Allow customers to save and resume later</p>
            </div>
            <Switch
              checked={formSettings.saveIncomplete}
              onChange={(checked) => updateSetting('saveIncomplete', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Copy to Customer</h4>
              <p className="text-sm text-gray-600">Send completed forms to customer email</p>
            </div>
            <Switch
              checked={formSettings.emailCopy}
              onChange={(checked) => updateSetting('emailCopy', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Automatic Reminders</h4>
              <p className="text-sm text-gray-600">Remind customers to complete forms</p>
            </div>
            <Switch
              checked={formSettings.autoReminder}
              onChange={(checked) => updateSetting('autoReminder', checked)}
            />
          </div>

          {formSettings.autoReminder && (
            <div className="ml-8">
              <label className="block text-sm font-medium mb-2">
                Send reminder after
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formSettings.reminderDays}
                  onChange={(e) => updateSetting('reminderDays', parseInt(e.target.value))}
                  min="1"
                  max="7"
                  className="w-16 px-3 py-2 border rounded-md"
                />
                <span className="text-sm text-gray-600">days</span>
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
          <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
            <h4 className="font-medium mb-2">Basic Intake Form</h4>
            <p className="text-sm text-gray-600">
              Collect essential customer and pet information
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Use Template
            </Button>
          </div>
          
          <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
            <h4 className="font-medium mb-2">Vaccination Records</h4>
            <p className="text-sm text-gray-600">
              Track pet vaccination history and requirements
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Use Template
            </Button>
          </div>
          
          <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
            <h4 className="font-medium mb-2">Emergency Contact</h4>
            <p className="text-sm text-gray-600">
              Collect emergency contact information
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Use Template
            </Button>
          </div>
          
          <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
            <h4 className="font-medium mb-2">Service Agreement</h4>
            <p className="text-sm text-gray-600">
              Standard terms and conditions agreement
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              Use Template
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All Forms
          </Button>
          <Button onClick={() => alert('Form settings saved!')}>
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Forms;