import { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';

const BulkImportModal = ({ isOpen, onClose, onImport }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleImport = () => {
    if (uploadedFile) {
      setIsUploading(true);
      // Simulate upload
      setTimeout(() => {
        onImport({ file: uploadedFile, services: [] });
        setIsUploading(false);
        onClose();
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Import Services from Spreadsheet</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Your Pricing Sheet</h3>
            <p className="text-sm text-gray-600">
              We'll automatically create services from your spreadsheet
            </p>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
            {uploadedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drop CSV/Excel file here or click to upload
                  </p>
                  <Button variant="outline" as="span">
                    Choose File
                  </Button>
                </label>
              </>
            )}
          </div>

          {/* Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Your file should include columns:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Service Name</li>
              <li>• Category (Boarding, Daycare, Grooming, etc.)</li>
              <li>• Base Price</li>
              <li>• Unit (per night, per day, etc.)</li>
              <li>• Optional: Size pricing, discounts, add-ons</li>
            </ul>
            <div className="mt-3">
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700">
                <FileText className="w-4 h-4 mr-1" />
                Download Template
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!uploadedFile || isUploading}
          >
            {isUploading ? 'Importing...' : 'Import Services'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
