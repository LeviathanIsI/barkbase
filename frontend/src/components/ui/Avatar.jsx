import { useState } from 'react';
import { cn } from '@/lib/cn';
import { User, Camera } from 'lucide-react';

const Avatar = ({
  src,
  alt = 'Avatar',
  size = 'md',
  fallback,
  onUpload,
  uploadable = false,
  className,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && onUpload) {
      onUpload(file);
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white font-medium',
          sizeClasses[size],
          uploadable && 'cursor-pointer hover:opacity-90 transition-opacity'
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <span className={textSizes[size]}>
            {fallback ? getInitials(fallback) : <User className="w-full h-full p-2" />}
          </span>
        )}
      </div>

      {uploadable && (
        <>
          <label
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 hover:bg-blue-700 cursor-pointer shadow-lg"
          >
            <Camera className="w-3 h-3" />
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </>
      )}
    </div>
  );
};

export default Avatar;
