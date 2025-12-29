import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';
import { 
  FileText, 
  Upload, 
  Download, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  Plus,
  Mail,
  Calendar,
  Send,
  FileCheck,
  FilePlus,
  Clock,
  CheckCircle,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Template types
const TEMPLATE_TYPES = [
  { value: 'boarding', label: 'Boarding Agreement', icon: FileText, color: 'blue' },
  { value: 'vaccination', label: 'Vaccination Requirements', icon: FileCheck, color: 'green' },
  { value: 'pickup', label: 'Pickup Authorization', icon: FilePlus, color: 'purple' },
  { value: 'emergency', label: 'Emergency Contact Form', icon: FileText, color: 'red' },
  { value: 'policies', label: 'Policies & Procedures', icon: FileText, color: 'orange' },
  { value: 'custom', label: 'Custom Document', icon: FilePlus, color: 'gray' },
];

// Email attachment settings
const EMAIL_ATTACHMENT_OPTIONS = [
  { id: 'booking_confirmation', label: 'Booking Confirmation', description: 'Sent when a booking is confirmed' },
  { id: 'booking_reminder', label: 'Booking Reminder', description: 'Sent 24 hours before check-in' },
  { id: 'check_in', label: 'Check-In Confirmation', description: 'Sent when pet is checked in' },
  { id: 'check_out', label: 'Check-Out Summary', description: 'Sent when pet is checked out' },
  { id: 'invoice', label: 'Invoice Email', description: 'Sent with payment invoices' },
];

const Files = () => {
  const [templates, setTemplates] = useState([]);
  const [customFiles, setCustomFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/files/templates');
      setTemplates(data?.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setTemplates([]);
    }
  }, []);

  // Fetch custom files
  const fetchCustomFiles = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/files/custom');
      setCustomFiles(data?.files || []);
    } catch (err) {
      console.error('Failed to fetch custom files:', err);
      setCustomFiles([]);
    }
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTemplates(), fetchCustomFiles()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchTemplates, fetchCustomFiles]);

  const handleEdit = (template) => {
    alert(`Edit template: ${template.name}\n\nTemplate editing UI coming soon!`);
  };

  const handlePreview = (template) => {
    alert(`Preview: ${template.name}\n\nTemplate preview coming soon!`);
  };

  const handleDuplicate = async (template) => {
    try {
      await apiClient.post('/api/v1/files/templates', {
        name: `${template.name} (Copy)`,
        description: template.description,
        type: template.type,
        contentType: template.contentType,
        content: template.content,
        status: 'draft',
        autoAttach: [],
      });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to duplicate template:', err);
      alert('Failed to duplicate template');
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    
    try {
      await apiClient.delete(`/api/v1/files/templates/${template.id}`);
      setTemplates(prev => prev.filter(t => t.id !== template.id));
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template');
    }
  };

  const handleToggleStatus = async (template) => {
    const newStatus = template.status === 'active' ? 'draft' : 'active';
    try {
      await apiClient.patch(`/api/v1/files/templates/${template.id}`, { status: newStatus });
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      console.error('Failed to update template status:', err);
      alert('Failed to update template status');
    }
  };

  const handleDeleteCustomFile = async (file) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;
    
    try {
      await apiClient.delete(`/api/v1/files/custom/${file.id}`);
      setCustomFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (err) {
      console.error('Failed to delete file:', err);
      alert('Failed to delete file');
    }
  };

  const handleCreateTemplate = () => {
    alert('Create template UI coming soon!');
  };

  const handleUploadFile = () => {
    alert('File upload requires S3 integration. Coming soon!');
  };

  return (
    <SettingsPage 
      title="Files" 
      description="Document templates and files to send to customers"
      actions={
        <Button onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      }
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-surface rounded-lg border border-border w-fit">
        {[
          { id: 'templates', label: 'Templates', icon: FileText },
          { id: 'custom', label: 'Custom Files', icon: Upload },
          { id: 'attachments', label: 'Email Attachments', icon: Mail },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-muted hover:text-text hover:bg-surface-secondary"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Card 
          header={(
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text">Document Templates</h3>
                <p className="text-sm text-muted">Pre-built templates that can be sent to customers during the booking process</p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchTemplates} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          )}
        >
          {isLoading && templates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-sm font-medium text-text">No templates yet</p>
              <p className="text-xs text-muted mt-1 mb-4">Create your first document template to get started.</p>
              <Button onClick={handleCreateTemplate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(template => (
                <TemplateCard 
                  key={template.id}
                  template={template}
                  onEdit={handleEdit}
                  onPreview={handlePreview}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">Need a custom template?</p>
                <p className="text-xs text-muted">Create a new template from scratch or upload your own document.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleUploadFile}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Custom Files Tab */}
      {activeTab === 'custom' && (
        <Card 
          header={(
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text">Custom Files</h3>
                <p className="text-sm text-muted">Upload your own PDFs and documents to send to customers</p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchCustomFiles} disabled={isLoading}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          )}
        >
          {isLoading && customFiles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : customFiles.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <p className="text-sm font-medium text-text">No custom files uploaded</p>
              <p className="text-xs text-muted mt-1 mb-4">Upload PDFs, documents, or images to share with customers.</p>
              <Button onClick={handleUploadFile}>
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {customFiles.map(file => (
                <CustomFileCard key={file.id} file={file} onDelete={handleDeleteCustomFile} />
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <div className="bg-surface-secondary rounded-lg p-6 border-2 border-dashed border-border text-center">
              <Upload className="w-8 h-8 text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-text mb-1">Drop files here or click to upload</p>
              <p className="text-xs text-muted mb-4">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
              <Button variant="outline" onClick={handleUploadFile}>
                Choose Files
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Email Attachments Tab */}
      {activeTab === 'attachments' && (
        <Card 
          title="Email Attachments" 
          description="Configure which documents are automatically attached to different email types"
        >
          <div className="space-y-6">
            {EMAIL_ATTACHMENT_OPTIONS.map(emailType => (
              <EmailAttachmentConfig 
                key={emailType.id}
                emailType={emailType}
                templates={templates.filter(t => t.status === 'active')}
                customFiles={customFiles}
                onUpdate={fetchTemplates}
              />
            ))}
          </div>

          <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
            <div className="flex gap-3">
              <Settings className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-info">Pro tip</p>
                <p className="text-xs text-info/80 mt-1">
                  Attach your boarding agreement and vaccination requirements to booking confirmations so customers have all necessary documents before their visit.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </SettingsPage>
  );
};

// Template Card Component
const TemplateCard = ({ template, onEdit, onPreview, onDuplicate, onDelete, onToggleStatus }) => {
  const tz = useTimezoneUtils();
  const typeInfo = TEMPLATE_TYPES.find(t => t.value === template.type) || TEMPLATE_TYPES[5];
  const TypeIcon = typeInfo.icon;

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Unknown';
    return tz.formatDate(new Date(dateString), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors group">
      {/* Icon */}
      <div className="p-2.5 rounded-lg flex-shrink-0 bg-primary/10">
        <TypeIcon className="w-5 h-5 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-text">{template.name}</p>
          <Badge variant={template.status === 'active' ? 'success' : 'neutral'}>
            {template.status === 'active' ? (
              <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
            ) : (
              <><Clock className="w-3 h-3 mr-1" /> Draft</>
            )}
          </Badge>
        </div>
        <p className="text-xs text-muted mb-2 line-clamp-2">{template.description || 'No description'}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Updated {formatDateDisplay(template.lastUpdated)}
          </span>
          <span className="flex items-center gap-1">
            <Send className="w-3 h-3" />
            Sent {template.usageCount || 0} times
          </span>
          {template.autoAttach?.length > 0 && (
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Auto-attached to {template.autoAttach.length} email{template.autoAttach.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={() => onPreview(template)} title="Preview">
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(template)} title="Edit">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDuplicate(template)} title="Duplicate">
          <Copy className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(template)} title="Delete" className="text-danger hover:text-danger">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Custom File Card Component
const CustomFileCard = ({ file, onDelete }) => {
  const tz = useTimezoneUtils();
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Unknown';
    return tz.formatDate(new Date(dateString), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-surface hover:border-primary/30 transition-colors group">
      <div className="p-2.5 rounded-lg bg-orange-500/10 flex-shrink-0">
        <FileText className="w-5 h-5 text-orange-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{file.name}</p>
        <div className="flex items-center gap-3 text-xs text-muted mt-1">
          {file.description && <span>{file.description}</span>}
          <span>{formatFileSize(file.size)}</span>
          <span>Uploaded {formatDateDisplay(file.uploadedAt)}</span>
          <span>Sent {file.usageCount || 0} times</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" title="Preview">
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" title="Download">
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" title="Delete" className="text-danger hover:text-danger" onClick={() => onDelete(file)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// Email Attachment Config Component
const EmailAttachmentConfig = ({ emailType, templates, customFiles, onUpdate }) => {
  const [attachedDocs, setAttachedDocs] = useState([]);

  useEffect(() => {
    // Get initially attached documents from templates
    const attached = templates
      .filter(t => t.autoAttach?.includes(emailType.id))
      .map(t => t.id);
    setAttachedDocs(attached);
  }, [templates, emailType.id]);

  const handleToggle = async (docId, isTemplate) => {
    const newAttached = attachedDocs.includes(docId)
      ? attachedDocs.filter(id => id !== docId)
      : [...attachedDocs, docId];
    
    setAttachedDocs(newAttached);

    // Update the template's autoAttach in the backend
    if (isTemplate) {
      const template = templates.find(t => t.id === docId);
      if (template) {
        const newAutoAttach = newAttached.includes(docId)
          ? [...(template.autoAttach || []), emailType.id]
          : (template.autoAttach || []).filter(id => id !== emailType.id);
        
        try {
          await apiClient.patch(`/api/v1/files/templates/${docId}`, { autoAttach: newAutoAttach });
          onUpdate?.();
        } catch (err) {
          console.error('Failed to update auto-attach:', err);
        }
      }
    }
  };

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-text">{emailType.label}</p>
          <p className="text-xs text-muted">{emailType.description}</p>
        </div>
        <Badge variant="neutral">
          {attachedDocs.length} attached
        </Badge>
      </div>

      {templates.length === 0 && customFiles.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">
          No active templates or files to attach. Create a template first.
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <label 
              key={template.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-surface-secondary cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted" />
                <span className="text-sm text-text">{template.name}</span>
              </div>
              <Switch
                checked={attachedDocs.includes(template.id)}
                onCheckedChange={() => handleToggle(template.id, true)}
              />
            </label>
          ))}
          {customFiles.map(file => (
            <label 
              key={file.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-surface-secondary cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-text">{file.name}</span>
                <Badge variant="neutral" className="text-xs">Custom</Badge>
              </div>
              <Switch
                checked={attachedDocs.includes(file.id)}
                onCheckedChange={() => handleToggle(file.id, false)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default Files;
