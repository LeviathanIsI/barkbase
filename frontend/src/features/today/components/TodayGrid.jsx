import { cn } from '@/lib/cn';

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 lg:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
};

const TodayGrid = ({ children, columns = 2, className }) => {
  return (
    <div
      className={cn(
        'grid gap-[var(--bb-space-6,1.5rem)]',
        columnClasses[columns] || columnClasses[2],
        className,
      )}
    >
      {children}
    </div>
  );
};

export default TodayGrid;

