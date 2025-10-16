import { useState } from 'react';
import { X, QrCode, Camera } from 'lucide-react';
import Button from '@/components/ui/Button';

const QRCheckInModal = ({ isOpen, onClose }) => {
  const [scanning, setScanning] = useState(true);
  const [detected, setDetected] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="text-center">
            <QrCode className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">QR Code Check-In</h3>
            <p className="text-gray-600 mb-6">Point camera at customer's QR code</p>

            {!detected ? (
              <div className="bg-gray-100 rounded-lg p-8 mb-6">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Scanning...</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-900 mb-2">✅ QR Code Detected</h4>
                <p className="text-green-800">Found booking for Bella - Golden Retriever</p>
                <p className="text-sm text-green-700 mt-2">Confidence: 98% match</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              {!detected ? (
                <Button variant="outline" className="flex-1">
                  Manual Check-in
                </Button>
              ) : (
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  ✓ Complete Check-In (2 seconds)
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCheckInModal;
