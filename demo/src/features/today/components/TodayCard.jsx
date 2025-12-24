import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const TodayCard = ({ children, className }) => {
  return (
    <Card
      className={cn('p-[var(--bb-space-6,1.5rem)]', className)}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      {children}
    </Card>
  );
};

export default TodayCard;

