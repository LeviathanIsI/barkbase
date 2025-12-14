import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  File,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Download,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { ENTITY_TYPES } from './importFieldDefinitions';

const ImportUploadStep = ({
  selectedTypes,
  file,
  onFileChange,
  parsedData,
  parseError,
  isParsing,
  fileMode,
  onFileModeChange,
  importModes,
  onImportModesChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        onFileChange(droppedFile);
      }
    },
    [onFileChange]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const selectedFile = e.target.files[0];
      if (selectedFile) {
        onFileChange(selectedFile);
      }
    },
    [onFileChange]
  );

  const handleRemoveFile = useCallback(() => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileChange]);

  const getFileIcon = (filename) => {
    if (!filename) return File;
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') return FileSpreadsheet;
    if (ext === 'json') return FileJson;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const FileIcon = file ? getFileIcon(file.name) : Upload;

  // Get selected entity labels
  const selectedLabels = selectedTypes.map((t) => ENTITY_TYPES[t]?.label).join(' and ');

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">
          Upload your file
        </h2>
        <p className="mt-2 text-sm text-[color:var(--bb-color-text-muted)]">
          Configure how to import your {selectedLabels} data
        </p>
      </div>

      {/* Section 1: File Type (only show if multiple types selected) */}
      {selectedTypes.length > 1 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
            Is your data in one or multiple files?
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <label
              className={cn(
                'flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                fileMode === 'single'
                  ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
                  : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] hover:border-[color:var(--bb-color-border-default)]'
              )}
            >
              <input
                type="radio"
                name="fileMode"
                value="single"
                checked={fileMode === 'single'}
                onChange={() => onFileModeChange('single')}
                className="w-4 h-4 text-[color:var(--bb-color-accent)]"
              />
              <div>
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                  Single file
                </p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                  {selectedLabels} data in a single file
                </p>
              </div>
            </label>

            <label
              className={cn(
                'flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                fileMode === 'multiple'
                  ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
                  : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] hover:border-[color:var(--bb-color-border-default)]'
              )}
            >
              <input
                type="radio"
                name="fileMode"
                value="multiple"
                checked={fileMode === 'multiple'}
                onChange={() => onFileModeChange('multiple')}
                className="w-4 h-4 text-[color:var(--bb-color-accent)]"
              />
              <div>
                <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                  Multiple files
                </p>
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                  {selectedLabels} data in separate files
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Section 2: Import Mode per entity type */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
          Choose how to import your data
        </label>
        <div className="space-y-3">
          {selectedTypes.map((typeId) => {
            const entity = ENTITY_TYPES[typeId];
            if (!entity) return null;

            return (
              <div
                key={typeId}
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: 'var(--bb-color-border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                      {entity.label}
                    </p>
                    <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                      {entity.description}
                    </p>
                  </div>
                  <div className="min-w-[220px]">
                    <StyledSelect
                      options={[
                        { value: 'create_update', label: `Create and update ${entity.label.toLowerCase()}` },
                        { value: 'create_only', label: `Create new ${entity.label.toLowerCase()} only` },
                        { value: 'update_only', label: `Update existing ${entity.label.toLowerCase()} only` },
                      ]}
                      value={importModes[typeId] || 'create_update'}
                      onChange={(opt) =>
                        onImportModesChange({
                          ...importModes,
                          [typeId]: opt?.value || 'create_update',
                        })
                      }
                      isClearable={false}
                      isSearchable={false}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: File Upload */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
            Upload your file
          </label>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              className="flex items-center gap-1 text-[color:var(--bb-color-accent)] hover:underline"
            >
              <FileText className="w-3.5 h-3.5" />
              View import requirements
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-[color:var(--bb-color-accent)] hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Download example file
            </button>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer',
            isDragOver
              ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
              : file
              ? 'border-[color:var(--bb-color-status-positive)] bg-[color:var(--bb-color-bg-surface)]'
              : 'border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] hover:border-[color:var(--bb-color-border-default)]'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{
                  backgroundColor:
                    'var(--bb-color-status-positive-muted, rgba(34, 197, 94, 0.1))',
                }}
              >
                <FileIcon className="w-7 h-7 text-[color:var(--bb-color-status-positive)]" />
              </div>

              <div className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <CheckCircle className="w-4 h-4 text-[color:var(--bb-color-status-positive)]" />
                  <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                    File uploaded: {file.name}
                  </p>
                </div>
                <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
                  {formatFileSize(file.size)}
                </p>
              </div>

              {/* Parsing state */}
              <div className="mt-4">
                {isParsing ? (
                  <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-text-muted)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing file...</span>
                  </div>
                ) : parseError ? (
                  <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-status-negative)]">
                    <AlertCircle className="w-4 h-4" />
                    <span>{parseError}</span>
                  </div>
                ) : parsedData ? (
                  <div className="flex flex-col items-center gap-1 text-sm">
                    <span className="text-[color:var(--bb-color-status-positive)]">
                      <strong>{parsedData.rowCount.toLocaleString()}</strong> rows found
                    </span>
                    {parsedData.headers && (
                      <span className="text-[color:var(--bb-color-text-muted)]">
                        {parsedData.headers.length} columns detected
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Remove button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="mt-4"
              >
                <X className="w-4 h-4 mr-1" />
                Remove file
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
                  isDragOver
                    ? 'bg-[color:var(--bb-color-accent)]'
                    : 'bg-[color:var(--bb-color-bg-elevated)]'
                )}
              >
                <Upload
                  className={cn(
                    'w-7 h-7 transition-colors',
                    isDragOver
                      ? 'text-white'
                      : 'text-[color:var(--bb-color-text-muted)]'
                  )}
                />
              </div>

              <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                {isDragOver
                  ? 'Drop your file here'
                  : `Drag and drop or choose a file to upload your ${selectedLabels.toLowerCase()}`}
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
                All .csv, .xlsx, and .xls file types are supported
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Parse error details */}
      {parseError && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor:
              'var(--bb-color-status-negative-muted, rgba(239, 68, 68, 0.1))',
            borderColor: 'var(--bb-color-status-negative)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[color:var(--bb-color-status-negative)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[color:var(--bb-color-status-negative)]">
                Error parsing file
              </p>
              <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                {parseError}
              </p>
              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-2">
                Please check that your file is a valid CSV, Excel, or JSON file
                and try again.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sample data preview */}
      {parsedData && parsedData.sampleRows && parsedData.sampleRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
            Data preview
          </p>
          <div
            className="overflow-x-auto rounded-lg border"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                  {parsedData.headers?.slice(0, 6).map((header, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-2 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      {header}
                    </th>
                  ))}
                  {parsedData.headers?.length > 6 && (
                    <th
                      className="px-3 py-2 text-left font-medium text-[color:var(--bb-color-text-muted)] border-b"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      +{parsedData.headers.length - 6} more
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parsedData.sampleRows.slice(0, 3).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {parsedData.headers?.slice(0, 6).map((header, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-3 py-2 text-[color:var(--bb-color-text-primary)] border-b max-w-[150px] truncate"
                        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                        title={row[header]}
                      >
                        {row[header] || (
                          <span className="text-[color:var(--bb-color-text-muted)]">
                            -
                          </span>
                        )}
                      </td>
                    ))}
                    {parsedData.headers?.length > 6 && (
                      <td
                        className="px-3 py-2 text-[color:var(--bb-color-text-muted)] border-b"
                        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                      >
                        ...
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Language (optional) */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
          Select the language of the column headers in your file
        </label>
        <div className="w-48">
          <StyledSelect
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
            ]}
            defaultValue="en"
            isClearable={false}
            isSearchable={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ImportUploadStep;
