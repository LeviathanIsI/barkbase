import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle, X, ChevronLeft, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

/**
 * MobileCheckIn Component
 * Camera-first mobile check-in experience with swipe gestures
 * Phase 3: Mobile-specific views
 */
const MobileCheckIn = () => {
  const queryClient = useQueryClient();
  const tz = useTimezoneUtils();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  // Fetch today's pending arrivals
  const { data: arrivals = [], isLoading } = useQuery({
    queryKey: ['bookings', 'arrivals', 'pending'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiClient.get(`/api/v1/bookings?date=${today}&status=PENDING&type=arrival`);
      return Array.isArray(response) ? response : response?.data || [];
    },
    refetchInterval: 15000,
  });

  const currentBooking = arrivals[currentIndex];

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      // Swipe right = check in
      handleCheckIn();
    } else if (isLeftSwipe) {
      // Swipe left = skip
      handleSkip();
    }
  };

  // Check-in mutation with photo upload
  const checkInMutation = useMutation({
    mutationFn: async ({ bookingId, photo }) => {
      let photoUrl = null;

      // Upload photo to S3 if provided
      if (photo) {
        try {
          // Get presigned upload URL
          const uploadUrlResponse = await apiClient.get('/api/v1/upload-url', {
            params: {
              fileType: 'image/jpeg',
              folder: 'check-ins',
              resourceType: 'booking',
              resourceId: bookingId
            }
          });

          const { uploadUrl, fileUrl } = uploadUrlResponse?.data || uploadUrlResponse;

          if (!uploadUrl) {
            throw new Error('Failed to get upload URL');
          }

          // Convert base64 to blob
          const base64Data = photo.split(',')[1];
          const binaryData = atob(base64Data);
          const arrayBuffer = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            arrayBuffer[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });

          // Upload directly to S3 using presigned URL (intentionally not using BarkBase apiClient - this is a direct S3 upload)
          // eslint-disable-next-line no-restricted-syntax
          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: {
              'Content-Type': 'image/jpeg',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload photo');
          }

          photoUrl = fileUrl;
        } catch (uploadError) {
          console.error('Photo upload error:', uploadError);
          toast.error('Photo upload failed, continuing with check-in...');
        }
      }

      // Perform check-in with photo URL
      return await apiClient.post(`/api/v1/bookings/${bookingId}/check-in`, {
        timestamp: new Date().toISOString(),
        photoUrl,
        source: 'mobile',
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      toast.success('Checked in successfully!');
      setCapturedPhoto(null);
      setShowCamera(false);
      // Move to next
      if (currentIndex < arrivals.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    },
    onError: (error) => {
      toast.error('Check-in failed: ' + error.message);
    },
  });

  const handleCheckIn = async () => {
    if (!currentBooking) return;

    // If camera is required and no photo taken, show camera
    if (!capturedPhoto) {
      setShowCamera(true);
      return;
    }

    checkInMutation.mutate({
      bookingId: currentBooking.id,
      photo: capturedPhoto,
    });
  };

  const handleSkip = () => {
    if (currentIndex < arrivals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error('Camera access denied');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoData);
      stopCamera();
      setShowCamera(false);
    }
  };

  useEffect(() => {
    if (showCamera) {
      startCamera();
    }
    return () => stopCamera();
  }, [showCamera]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-secondary dark:bg-dark-bg-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (arrivals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background-secondary dark:bg-dark-bg-primary p-6 text-center">
        <CheckCircle className="w-16 h-16 text-success-500 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">
          All Caught Up!
        </h2>
        <p className="text-gray-600 dark:text-text-secondary">
          No pending check-ins for today.
        </p>
      </div>
    );
  }

  // Camera view
  if (showCamera) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                stopCamera();
                setShowCamera(false);
              }}
              className="text-white hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </Button>
            <p className="text-white text-sm">
              Take photo of {currentBooking.petName}
            </p>
            <div className="w-12" />
          </div>

          {/* Capture button - large touch target */}
          <button
            onClick={capturePhoto}
            className="mx-auto block w-20 h-20 rounded-full bg-white border-4 border-blue-500 hover:bg-gray-100 active:scale-95 transition-transform"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background-secondary dark:bg-dark-bg-primary flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-surface-primary border-b border-gray-200 dark:border-surface-border p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-text-secondary">
            Check-in {currentIndex + 1} of {arrivals.length}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Swipeable card */}
      <div
        className="flex-1 flex items-center justify-center p-6"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white dark:bg-surface-primary rounded-lg shadow-xl overflow-hidden">
            {/* Pet photo placeholder */}
            <div className="h-64 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              {capturedPhoto ? (
                <img src={capturedPhoto} alt="Pet" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-20 h-20 text-white/50" />
              )}
            </div>

            {/* Pet info */}
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-text-primary mb-2">
                {currentBooking.petName}
              </h2>
              <p className="text-lg text-gray-600 dark:text-text-secondary mb-4">
                {currentBooking.ownerName}
              </p>

              <div className="space-y-2 text-sm text-gray-600 dark:text-text-secondary">
                <div className="flex justify-between">
                  <span>Arrival Time:</span>
                  <span className="font-medium">
                    {tz.formatTime(currentBooking.startDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span className="font-medium">{currentBooking.service || 'Boarding'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Swipe instructions */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-text-secondary">
            <p>Swipe right to check in • Swipe left to skip</p>
          </div>
        </div>
      </div>

      {/* Action buttons - large touch targets (44x44px minimum) */}
      <div className="p-6 bg-white dark:bg-surface-primary border-t border-gray-200 dark:border-surface-border">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={handleSkip}
            className="h-14 text-lg"
          >
            Skip
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleCheckIn}
            disabled={checkInMutation.isPending}
            className="h-14 text-lg bg-green-600 hover:bg-green-700"
          >
            {checkInMutation.isPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Check In
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileCheckIn;
