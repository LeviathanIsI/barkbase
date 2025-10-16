import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SettingsPage from '../components/SettingsPage';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const ImportExport = () => {
  const [importFile, setImportFile] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportScope, setExportScope] = useState('all');
  
  const [recentJobs] = useState([
    { id: 1, type: 'export', status: 'completed', date: '2024-01-15', records: 1250 },
    { id: 2, type: 'import', status: 'completed', date: '2024-01-10', records: 45 },
    { id: 3, type: 'export', status: 'failed', date: '2024-01-08', records: 0 }
  ]);

  const handleImport = () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }
    // TODO: Process import
    alert(`Importing ${importFile.name}...`);
  };

  const handleExport = () => {
    // TODO: Process export
    alert(`Exporting data as ${exportFormat.toUpperCase()}...`);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImportFile(file);
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
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            {importFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Supported formats:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>CSV - Comma separated values</li>
                  <li>Excel - .xlsx or .xls files</li>
                  <li>JSON - JavaScript Object Notation</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleImport} disabled={!importFile}>
              <Upload className="w-4 h-4 mr-2" />
              Import Data
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
          <div>
            <label className="block text-sm font-medium mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="csv">CSV (.csv)</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="json">JSON (.json)</option>
              <option value="pdf">PDF Report (.pdf)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Export Scope</label>
            <select
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="all">All Data</option>
              <option value="pets">Pets Only</option>
              <option value="owners">Owners Only</option>
              <option value="bookings">Bookings Only</option>
              <option value="financial">Financial Records</option>
            </select>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Jobs */}
      <Card 
        title="Recent Import/Export Jobs" 
        description="Track your data transfer history"
      >
        <div className="space-y-2">
          {recentJobs.map(job => (
            <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded ${
                  job.type === 'import' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {job.type === 'import' ? 
                    <Upload className="w-4 h-4 text-blue-600" /> : 
                    <Download className="w-4 h-4 text-green-600" />
                  }
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {job.type === 'import' ? 'Data Import' : 'Data Export'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(job.date).toLocaleDateString()} - {job.records} records
                  </p>
                </div>
              </div>
              <Badge variant={job.status === 'completed' ? 'success' : 'danger'}>
                {job.status === 'completed' ? 
                  <><CheckCircle className="w-3 h-3 mr-1" /> Completed</> : 
                  <><AlertCircle className="w-3 h-3 mr-1" /> Failed</>
                }
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </SettingsPage>
  );
};

export default ImportExport;