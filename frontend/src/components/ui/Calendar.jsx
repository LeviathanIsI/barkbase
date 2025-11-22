import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/cn';

const Calendar = ({ className, ...props }) => (
  <DayPicker
    className={cn(
      'rounded-lg border border-border bg-surface p-3 text-sm text-text shadow-sm',
      className,
    )}
    captionLayout="dropdown-buttons"
    {...props}
  />
);

export default Calendar;
