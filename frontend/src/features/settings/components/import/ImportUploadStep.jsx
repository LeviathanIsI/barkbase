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
} from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';

const ImportUploadStep = ({
  file,
  onFileChange,
  parsedData,
  parseError,
  isParsing,
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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileChange(droppedFile);
    }
  }, [onFileChange]);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onFileChange(selectedFile);
    }
  }, [onFileChange]);

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">
          Upload your file
        </h2>
        <p className="mt-2 text-sm text-[color:var(--bb-color-text-muted)]">
          Drag and drop your file here, or click to browse
        </p>
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
              style={{ backgroundColor: 'var(--bb-color-status-positive-muted, rgba(34, 197, 94, 0.1))' }}
            >
              <FileIcon className="w-7 h-7 text-[color:var(--bb-color-status-positive)]" />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                {file.name}
              </p>
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
                <div className="flex items-center gap-2 text-sm text-[color:var(--bb-color-status-positive)]">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    <strong>{parsedData.rowCount.toLocaleString()}</strong> rows found
                    {parsedData.headers && (
                      <span className="text-[color:var(--bb-color-text-muted)]">
                        {' '}with {parsedData.headers.length} columns
                      </span>
                    )}
                  </span>
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
                isDragOver ? 'bg-[color:var(--bb-color-accent)]' : 'bg-[color:var(--bb-color-bg-elevated)]'
              )}
            >
              <Upload
                className={cn(
                  'w-7 h-7 transition-colors',
                  isDragOver ? 'text-white' : 'text-[color:var(--bb-color-text-muted)]'
                )}
              />
            </div>

            <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
              {isDragOver ? 'Drop your file here' : 'Drag & drop your file here'}
            </p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
              or click to browse
            </p>
          </div>
        )}
      </div>

      {/* Supported formats */}
      <div className="flex items-center justify-center gap-6 text-xs text-[color:var(--bb-color-text-muted)]">
        <div className="flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4" />
          <span>CSV</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Excel (.xlsx)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileJson className="w-4 h-4" />
          <span>JSON</span>
        </div>
      </div>

      {/* Parse error details */}
      {parseError && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--bb-color-status-negative-muted, rgba(239, 68, 68, 0.1))',
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
                Please check that your file is a valid CSV, Excel, or JSON file and try again.
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
                        {row[header] || <span className="text-[color:var(--bb-color-text-muted)]">-</span>}
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
    </div>
  );
};

export default ImportUploadStep;
