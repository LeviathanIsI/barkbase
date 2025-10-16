import { useState } from 'react';
import { X, Camera, User } from 'lucide-react';
import Button from '@/components/ui/Button';

const PhotoCheckInModal = ({ isOpen, onClose }) => {
  const [identifying, setIdentifying] = useState(false);
  const [identified, setIdentified] = useState(false);

  if (!isOpen) return null;

  const handleIdentify = () => {
    setIdentifying(true);
    setTimeout(() => {
      setIdentified(true);
      setIdentifying(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="text-center">
            <Camera className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Photo Check-In</h3>
            <p className="text-gray-600 mb-6">Snap a photo to identify the pet</p>

            {!identifying && !identified ? (
              <div className="bg-gray-100 rounded-lg p-8 mb-6">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">Center pet in frame</p>
                <Button onClick={handleIdentify}>
                  Capture & Identify
                </Button>
              </div>
            ) : identifying ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="animate-pulse">
                  <p className="text-blue-800 mb-2">🤖 Identifying pet...</p>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '80%' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-green-900 mb-2">✅ Pet Identified</h4>
                <p className="text-green-800">Bella - Golden Retriever</p>
                <p className="text-sm text-green-700">Confidence: 98% match</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              {identified ? (
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  ✓ Check In Bella
                </Button>
              ) : (
                <Button variant="outline" className="flex-1">
                  Use QR Instead
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoCheckInModal;
