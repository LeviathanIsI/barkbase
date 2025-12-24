/**
 * Professional Avatar Component
 * User/pet profile images with fallback initials
 * Supports optional file upload functionality
 */

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { User, Camera, Loader2 } from 'lucide-react';

const Avatar = React.forwardRef(({ 
  className, 
  src, 
  alt, 
  fallback, 
  size = 'md',
  uploadable = false,
  onUpload,
  isUploading = false,
  ...props 
}, ref) => {
  const fileInputRef = useRef(null);
  
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const [imageError, setImageError] = React.useState(false);

  // Reset image error when src changes
  React.useEffect(() => {
    setImageError(false);
  }, [src]);

  const handleClick = () => {
    if (uploadable && fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-surface-secondary',
        sizes[size],
        uploadable && !isUploading && 'cursor-pointer group',
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : fallback ? (
        <div className="flex h-full w-full items-center justify-center bg-primary-100 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 font-medium">
          {typeof fallback === 'string' ? fallback.charAt(0).toUpperCase() : fallback}
        </div>
      ) : (
        <User className="h-full w-full p-2 text-gray-400 dark:text-text-tertiary" />
      )}
      
      {/* Upload overlay */}
      {uploadable && !isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Camera className="w-1/3 h-1/3 text-white" />
        </div>
      )}
      
      {/* Loading overlay */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
          <Loader2 className="w-1/3 h-1/3 text-white animate-spin" />
        </div>
      )}
      
      {/* Hidden file input */}
      {uploadable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar;
