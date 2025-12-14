import { useState } from 'react';

/**
 * Optimized image component with lazy loading, error handling, and loading states.
 */
export function Image({
  src,
  alt,
  className = '',
  fallback,
  aspectRatio,
  width,
  height,
  ...props
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error || !src) {
    if (fallback) {
      return typeof fallback === 'string' ? (
        <img
          src={fallback}
          alt={alt}
          className={className}
          width={width}
          height={height}
          {...props}
        />
      ) : (
        fallback
      );
    }
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 ${className}`}
        style={{ width, height, aspectRatio }}
        role="img"
        aria-label={alt || 'No image'}
      >
        <span className="text-xs">No image</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ aspectRatio }}>
      {!loaded && (
        <div
          className={`absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`}
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        {...props}
      />
    </div>
  );
}

/**
 * Avatar variant with fallback to initials.
 */
export function Avatar({ src, name, size = 'md', className = '' }) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Image
      src={src}
      alt={name || 'Avatar'}
      className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      fallback={
        <div
          className={`flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium ${sizeClasses[size]} ${className}`}
        >
          {initials || '?'}
        </div>
      }
    />
  );
}

export default Image;
