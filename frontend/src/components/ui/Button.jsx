import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary: 'bg-[#4B5DD3] text-white hover:bg-[#3A4BC2] shadow-sm hover:shadow-md transition-all',
  secondary: 'bg-[#FF9800] text-white hover:bg-[#E68900] shadow-sm hover:shadow-md transition-all',
  danger: 'bg-[#F44336] text-white hover:bg-[#D32F2F] shadow-sm hover:shadow-md transition-all',
  success: 'bg-[#4CAF50] text-white hover:bg-[#388E3C] shadow-sm hover:shadow-md transition-all',
  outline: 'bg-transparent text-[#4B5DD3] border-2 border-[#4B5DD3] hover:bg-[#4B5DD3] hover:text-white transition-all',
  ghost: 'bg-transparent text-[#263238] hover:bg-gray-100 transition-all',
  gradient: 'bg-gradient-to-r from-[#4B5DD3] to-[#3A4BC2] text-white hover:shadow-lg transform hover:scale-105 transition-all',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-sm font-medium',
  lg: 'px-8 py-3 text-base font-semibold',
  icon: 'p-2.5',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

export default Button;
