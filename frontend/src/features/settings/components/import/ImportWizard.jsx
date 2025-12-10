import { useState, useCallback, useMemo } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import ImportTypeStep from './ImportTypeStep';
import ImportUploadStep from './ImportUploadStep';
import ImportMapStep from './ImportMapStep';
import ImportDetailsStep from './ImportDetailsStep';
import { autoMapColumns, getUnmappedRequiredFields, ENTITY_TYPES } from './importFieldDefinitions';

const STEPS = [
  { id: 'type', label: 'Type', shortLabel: 'Type' },
  { id: 'upload', label: 'Upload', shortLabel: 'Upload' },
  { id: 'map', label: 'Map', shortLabel: 'Map' },
  { id: 'details', label: 'Details', shortLabel: 'Details' },
];

const ImportWizard = ({ onClose, onImportComplete }) => {
  // Auth
  const accessToken = useAuthStore((state) => state.accessToken);

  // Step management
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Type selection
  const [selectedTypes, setSelectedTypes] = useState([]);

  // Step 2: File upload
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isParsing, setIsParsing] = useState(false);

  // Step 3: Mappings
  const [mappings, setMappings] = useState({});
  const [overwriteSettings, setOverwriteSettings] = useState({});

  // Step 4: Import options
  const [importOptions, setImportOptions] = useState({
    skipDuplicates: true,
    updateExisting: false,
    createNewOnly: false,
  });

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  // Parse file when uploaded
  const handleFileChange = useCallback(async (newFile) => {
    setFile(newFile);
    setParsedData(null);
    setParseError(null);
    setMappings({});
    setOverwriteSettings({});

    if (!newFile) return;

    setIsParsing(true);

    try {
      const ext = newFile.name.split('.').pop()?.toLowerCase();
      const content = await readFileAsText(newFile);

      let data;
      if (ext === 'json') {
        const parsed = JSON.parse(content);
        // Handle both array and object with data property
        data = Array.isArray(parsed) ? parsed : (parsed.data || [parsed]);
      } else if (ext === 'csv') {
        data = parseCSV(content);
      } else if (ext === 'xlsx' || ext === 'xls') {
        // For XLSX, we'd need a library like xlsx/sheetjs
        // For now, show an error
        throw new Error('Excel files require the xlsx library. Please convert to CSV first.');
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      if (!data || data.length === 0) {
        throw new Error('File appears to be empty or could not be parsed.');
      }

      const headers = Object.keys(data[0]);
      const sampleRows = data.slice(0, 5);

      setParsedData({
        headers,
        rowCount: data.length,
        sampleRows,
        allData: data,
      });

      // Auto-map columns if we have selected types
      if (selectedTypes.length > 0) {
        const autoMappings = {};
        selectedTypes.forEach(typeId => {
          const typeMappings = autoMapColumns(headers, typeId);
          Object.assign(autoMappings, typeMappings);
        });
        setMappings(autoMappings);
      }
    } catch (err) {
      console.error('Parse error:', err);
      setParseError(err.message || 'Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  }, [selectedTypes]);

  // Re-run auto-mapping when types change (if file already uploaded)
  const handleTypesChange = useCallback((newTypes) => {
    setSelectedTypes(newTypes);

    if (parsedData?.headers) {
      const autoMappings = {};
      newTypes.forEach(typeId => {
        const typeMappings = autoMapColumns(parsedData.headers, typeId);
        Object.assign(autoMappings, typeMappings);
      });
      setMappings(autoMappings);
    }
  }, [parsedData?.headers]);

  // Check if step is valid
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 0: // Type
        return selectedTypes.length > 0;
      case 1: // Upload
        return file && parsedData && !parseError && !isParsing;
      case 2: // Map
        // Check all required fields are mapped
        let allMapped = true;
        selectedTypes.forEach(typeId => {
          const unmapped = getUnmappedRequiredFields(mappings, typeId);
          if (unmapped.length > 0) allMapped = false;
        });
        return allMapped;
      case 3: // Details
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedTypes, file, parsedData, parseError, isParsing, mappings]);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!parsedData?.allData) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // Transform data based on mappings
      const transformedData = parsedData.allData.map(row => {
        const transformed = {};
        Object.entries(mappings).forEach(([header, fieldKey]) => {
          if (fieldKey && row[header] !== undefined) {
            transformed[fieldKey] = row[header];
          }
        });
        return transformed;
      });

      // Call the import API
      const response = await fetch('/api/v1/import-export/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          entityTypes: selectedTypes,
          data: transformedData,
          mappings,
          options: importOptions,
          filename: file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Import failed');
      }

      const result = await response.json();

      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      console.error('Import error:', err);
      setImportError(err.message || 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, mappings, selectedTypes, importOptions, file, onImportComplete]);

  const canGoNext = isStepValid;
  const canGoPrev = currentStep > 0;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--bb-color-overlay-scrim)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              Import Data
            </h2>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
          >
            <X className="w-5 h-5 text-[color:var(--bb-color-text-muted)]" />
          </button>
        </div>

        {/* Progress stepper */}
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  {/* Step indicator */}
                  <div className="flex items-center">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                        isCompleted
                          ? 'bg-[color:var(--bb-color-status-positive)] text-white'
                          : isCurrent
                          ? 'bg-[color:var(--bb-color-accent)] text-white'
                          : 'bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)]'
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={cn(
                        'ml-2 text-sm font-medium hidden sm:inline',
                        isCurrent
                          ? 'text-[color:var(--bb-color-text-primary)]'
                          : 'text-[color:var(--bb-color-text-muted)]'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connector line */}
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-4 transition-colors',
                        idx < currentStep
                          ? 'bg-[color:var(--bb-color-status-positive)]'
                          : 'bg-[color:var(--bb-color-border-subtle)]'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 0 && (
            <ImportTypeStep
              selectedTypes={selectedTypes}
              onTypesChange={handleTypesChange}
            />
          )}

          {currentStep === 1 && (
            <ImportUploadStep
              file={file}
              onFileChange={handleFileChange}
              parsedData={parsedData}
              parseError={parseError}
              isParsing={isParsing}
            />
          )}

          {currentStep === 2 && (
            <ImportMapStep
              selectedTypes={selectedTypes}
              parsedData={parsedData}
              mappings={mappings}
              onMappingsChange={setMappings}
              overwriteSettings={overwriteSettings}
              onOverwriteSettingsChange={setOverwriteSettings}
            />
          )}

          {currentStep === 3 && (
            <ImportDetailsStep
              selectedTypes={selectedTypes}
              parsedData={parsedData}
              mappings={mappings}
              importOptions={importOptions}
              onImportOptionsChange={setImportOptions}
            />
          )}

          {/* Import error */}
          {importError && (
            <div
              className="mt-4 p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--bb-color-status-negative-muted, rgba(239, 68, 68, 0.1))',
                borderColor: 'var(--bb-color-status-negative)',
              }}
            >
              <p className="text-sm text-[color:var(--bb-color-status-negative)]">{importError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={!canGoPrev || isImporting}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isImporting}
            >
              Cancel
            </Button>

            {isLastStep ? (
              <Button
                type="button"
                onClick={handleImport}
                disabled={!canGoNext || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={!canGoNext}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
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

export default ImportWizard;
