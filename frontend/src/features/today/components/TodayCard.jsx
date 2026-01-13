import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

/**
 * TodayCard - Premium wrapper card for Today/Dashboard sections
 * Uses glass variant for frosted glassmorphism effect
 */
const TodayCard = ({ children, className, noPadding = false, ...props }) => {
  return (
    <Card
      variant="glass"
      size="lg"
      noPadding={noPadding}
      className={cn(
        // Ensure rounded corners match premium aesthetic
        'rounded-2xl',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
};

export default TodayCard;

