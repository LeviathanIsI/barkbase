import { useState, useMemo, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';
import { 
  FileText, 
  Image, 
  File, 
  Download, 
  Trash2, 
  Eye, 
  Search,
  Upload,
  Calendar,
  User,
  PawPrint,
  HardDrive,
  FileCheck,
  FileImage,
  RefreshCw,
  Syringe,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Document categories
const CATEGORIES = [
  { value: 'all', label: 'All Documents', icon: FileText },
  { value: 'vaccination', label: 'Vaccination Records', icon: Syringe },
  { value: 'waiver', label: 'Signed Waivers', icon: FileCheck },
  { value: 'vet', label: 'Vet Records', icon: FileText },
  { value: 'photo', label: 'Pet Photos', icon: FileImage },
  { value: 'other', label: 'Other', icon: File },
];

const Documents = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ used: 0, total: 500 * 1024 * 1024, documentCount: 0 });

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = { sortBy };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery) params.search = searchQuery;

      const { data } = await apiClient.get('/api/v1/documents', { params });
      setDocuments(data?.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, searchQuery, sortBy]);

  // Fetch storage stats
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v1/documents/stats');
      setStats({
        used: data?.used || 0,
        total: data?.total || 500 * 1024 * 1024,
        documentCount: data?.documentCount || 0,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [fetchDocuments, fetchStats]);

  // Filter documents client-side for immediate search
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // Client-side search for responsiveness
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.filename?.toLowerCase().includes(query) ||
        doc.customer?.name?.toLowerCase().includes(query) ||
        doc.pet?.name?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      } else if (sortBy === 'name') {
        return (a.filename || '').localeCompare(b.filename || '');
      } else if (sortBy === 'size') {
        return (b.size || 0) - (a.size || 0);
      }
      return 0;
    });

    return filtered;
  }, [documents, searchQuery, sortBy]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: documents.length };
    CATEGORIES.forEach(cat => {
      if (cat.value !== 'all') {
        counts[cat.value] = documents.filter(d => d.category === cat.value).length;
      }
    });
    return counts;
  }, [documents]);

  const handleView = (doc) => {
    if (doc.storageUrl) {
      window.open(doc.storageUrl, '_blank');
    } else {
      alert(`Document preview not available for: ${doc.filename}`);
    }
  };

  const handleDownload = (doc) => {
    if (doc.storageUrl) {
      const a = document.createElement('a');
      a.href = doc.storageUrl;
      a.download = doc.originalFilename || doc.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`Download not available for: ${doc.filename}`);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Are you sure you want to delete "${doc.filename}"?`)) return;
    
    try {
      await apiClient.delete(`/api/v1/documents/${doc.id}`);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      fetchStats();
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document');
    }
  };

  const handleUpload = () => {
    // In production, this would open a file upload modal
    alert('File upload requires S3 integration. Coming soon!');
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const storagePercentage = stats.total > 0 ? (stats.used / stats.total) * 100 : 0;

  return (
    <SettingsPage 
      title="Documents" 
      description="Files received from customers"
      actions={
        <Button onClick={handleUpload}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      }
    >
      {/* Storage Usage */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <HardDrive className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">Storage Usage</p>
              <p className="text-xs text-muted">
                {formatBytes(stats.used)} of {formatBytes(stats.total)} used • {stats.documentCount} documents
              </p>
            </div>
          </div>
          <div className="flex-1 max-w-xs">
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  storagePercentage > 90 ? "bg-danger" : storagePercentage > 70 ? "bg-warning" : "bg-primary"
                )}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-1 text-right">{storagePercentage.toFixed(1)}% used</p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <Input
                placeholder="Search by filename, customer, or pet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="w-full lg:w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={CATEGORIES.map(cat => ({
                value: cat.value,
                label: `${cat.label} (${categoryCounts[cat.value] || 0})`,
              }))}
              menuPortalTarget={document.body}
            />
          </div>

          {/* Sort */}
          <div className="w-full lg:w-40">
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'date', label: 'Newest First' },
                { value: 'name', label: 'Name (A-Z)' },
                { value: 'size', label: 'Largest First' },
              ]}
              menuPortalTarget={document.body}
            />
          </div>

          <Button variant="ghost" onClick={() => { fetchDocuments(); fetchStats(); }} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </Card>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = categoryFilter === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "bg-surface text-muted hover:text-text hover:bg-surface-secondary border border-border"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                isActive ? "bg-white/20" : "bg-border"
              )}>
                {categoryCounts[cat.value] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Documents List */}
      <Card 
        title="Documents" 
        description={`${filteredDocuments.length} document${filteredDocuments.length === 1 ? '' : 's'} found`}
      >
        {isLoading && documents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted/30 mx-auto mb-4" />
            <p className="text-sm font-medium text-text">No documents found</p>
            <p className="text-xs text-muted mt-1">
              {searchQuery || categoryFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Documents from customers will appear here when uploaded'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map(doc => (
              <DocumentRow 
                key={doc.id} 
                document={doc}
                onView={handleView}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </Card>
    </SettingsPage>
  );
};

// Document row component
const DocumentRow = ({ document, onView, onDownload, onDelete }) => {
  const tz = useTimezoneUtils();
  const categoryInfo = CATEGORIES.find(c => c.value === document.category) || CATEGORIES[5];
  const CategoryIcon = categoryInfo.icon;

  const getFileIcon = () => {
    if (document.fileType === 'image' || document.mimeType?.startsWith('image/')) return Image;
    if (document.fileType === 'pdf' || document.mimeType?.includes('pdf')) return FileText;
    return File;
  };

  const FileIcon = getFileIcon();

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
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-surface hover:border-border transition-colors group">
      {/* File Icon */}
      <div className={cn(
        "p-2.5 rounded-lg flex-shrink-0",
        document.fileType === 'image' ? "bg-purple-500/10" : "bg-blue-500/10"
      )}>
        <FileIcon className={cn(
          "w-5 h-5",
          document.fileType === 'image' ? "text-purple-500" : "text-blue-500"
        )} />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text truncate">{document.filename}</p>
          <Badge variant="neutral" className="flex-shrink-0">
            <CategoryIcon className="w-3 h-3 mr-1" />
            {categoryInfo.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted">
          {document.customer && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {document.customer.name}
            </span>
          )}
          {document.pet && (
            <span className="flex items-center gap-1">
              <PawPrint className="w-3 h-3" />
              {document.pet.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateDisplay(document.uploadedAt)}
          </span>
          <span>{formatFileSize(document.size)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={() => onView(document)}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDownload(document)}>
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(document)} className="text-danger hover:text-danger">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Documents;
