import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const TodayCard = ({ children, className }) => {
  return (
    <Card className={cn('p-6', className)}>
      {children}
    </Card>
  );
};

export default TodayCard;

