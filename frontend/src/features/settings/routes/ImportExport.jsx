import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All Data' },
  { value: 'pets', label: 'Pets Only' },
  { value: 'owners', label: 'Owners Only' },
  { value: 'bookings', label: 'Bookings Only' },
  { value: 'financial', label: 'Financial Records' },
  { value: 'vaccinations', label: 'Vaccination Records' },
];

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV (.csv)', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON (.json)', icon: FileJson },
  { value: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
];

const ImportExport = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  // Export state
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Jobs state
  const [recentJobs, setRecentJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  // Fetch recent jobs
  const fetchJobs = useCallback(async () => {
    try {
      setIsLoadingJobs(true);
      const { data } = await apiClient.get('/api/v1/import-export/jobs');
      setRecentJobs(data?.jobs || []);
    } catch (err) {
      console.error('Failed to fetch import/export jobs:', err);
      // Gracefully handle - show empty list
      setRecentJobs([]);
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImportFile(file);
    setImportError(null);
    setImportSuccess(null);
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      setImportError('Please select a file to import');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      // Read file content
      const fileContent = await readFileAsText(importFile);
      
      // Determine format from extension
      const ext = importFile.name.split('.').pop().toLowerCase();
      let data;
      
      if (ext === 'json') {
        data = JSON.parse(fileContent);
      } else if (ext === 'csv') {
        data = parseCSV(fileContent);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      // Send to API
      const response = await apiClient.post('/api/v1/import-export/import', {
        data,
        format: ext,
        filename: importFile.name,
      });

      if (response.data?.success) {
        setImportSuccess(`Successfully imported ${response.data.recordCount || 0} record(s)`);
        setImportFile(null);
        // Reset file input
        const fileInput = document.getElementById('import-file-input');
        if (fileInput) fileInput.value = '';
        // Refresh jobs list
        fetchJobs();
      } else {
        setImportError(response.data?.message || 'Import failed');
      }
    } catch (err) {
      console.error('Import failed:', err);
      setImportError(err.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/v1/import-export/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            'X-Tenant-Id': tenant?.recordId || '',
          },
          body: JSON.stringify({ scope: exportScope, format: exportFormat }),
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `barkbase_${exportScope}_export.${exportFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Refresh jobs list
      fetchJobs();
    } catch (err) {
      console.error('Export failed:', err);
      setExportError(err.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SettingsPage 
      title="Import & Export" 
      description="Move your data in and out of the system"
    >
      {/* Import Section */}
      <Card 
        title="Import Data" 
        description="Upload data from external sources"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select File to Import
            </label>
            <div className="flex items-center gap-2">
              <input
                id="import-file-input"
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary/10 file:text-primary
                  hover:file:bg-primary/20
                  dark:file:bg-primary/20"
              />
            </div>
            {importFile && (
              <p className="mt-2 text-sm text-muted">
                Selected: <span className="font-medium text-text">{importFile.name}</span> ({(importFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="bg-info/10 border border-info/30 rounded-lg p-3">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-info mr-2 flex-shrink-0" />
              <div className="text-sm text-info">
                <p className="font-medium">Supported formats:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>CSV - Comma separated values</li>
                  <li>Excel - .xlsx or .xls files</li>
                  <li>JSON - JavaScript Object Notation</li>
                </ul>
              </div>
            </div>
          </div>

          {importError && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{importError}</p>
            </div>
          )}

          {importSuccess && (
            <div className="bg-success/10 border border-success/30 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
              <p className="text-sm text-success">{importSuccess}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleImport} disabled={!importFile || isImporting}>
              {isImporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Export Section */}
      <Card 
        title="Export Data" 
        description="Download your data for backup or migration"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Export Format</label>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Export Scope</label>
              <Select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value)}
              >
                {SCOPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          </div>

          {exportError && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{exportError}</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Jobs */}
      <Card 
        header={(
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text">Recent Import/Export Jobs</h3>
              <p className="text-sm text-muted">Track your data transfer history</p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchJobs} disabled={isLoadingJobs}>
              <RefreshCw className={cn("h-4 w-4", isLoadingJobs && "animate-spin")} />
            </Button>
          </div>
        )}
      >
        {isLoadingJobs && recentJobs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted/50 mx-auto mb-3" />
            <p className="text-sm font-medium text-text">No import/export jobs yet</p>
            <p className="text-xs text-muted mt-1">
              Jobs will appear here after you import or export data.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map(job => (
              <div 
                key={job.id} 
                className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    job.type === 'import' ? 'bg-info/10' : 'bg-success/10'
                  )}>
                    {job.type === 'import' ? 
                      <Upload className={cn("w-4 h-4", job.type === 'import' ? 'text-info' : 'text-success')} /> : 
                      <Download className="w-4 h-4 text-success" />
                    }
                  </div>
                  <div>
                    <p className="font-medium text-sm text-text">
                      {job.type === 'import' ? 'Data Import' : 'Data Export'}
                      {job.scope && job.scope !== 'all' && (
                        <span className="text-muted font-normal"> — {job.scope}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(job.createdAt)} • {job.recordCount || 0} records
                      {job.format && <span className="uppercase"> • {job.format}</span>}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(job.status)}>
                  {job.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {job.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {job.status === 'processing' && <Clock className="w-3 h-3 mr-1" />}
                  {job.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                  {capitalizeFirst(job.status)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </SettingsPage>
  );
};

// Helper functions

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || '';
    });
    data.push(row);
  }

  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

function getStatusVariant(status) {
  switch (status) {
    case 'completed': return 'success';
    case 'failed': return 'danger';
    case 'processing': return 'warning';
    case 'pending': return 'neutral';
    default: return 'neutral';
  }
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default ImportExport;
