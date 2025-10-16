import { cn } from '@/lib/cn';

const Label = ({ className, ...props }) => (
  <label
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#263238]',
      className
    )}
    {...props}
  />
);

export { Label };
export default Label;
