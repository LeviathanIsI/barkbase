import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

/**
 * TodayCard - Wrapper card for Today/Dashboard sections
 * Uses the standardized Card component with consistent styling
 */
const TodayCard = ({ children, className, noPadding = false, ...props }) => {
  return (
    <Card
      variant="outlined"
      size="lg"
      noPadding={noPadding}
      className={cn(className)}
      {...props}
    >
      {children}
    </Card>
  );
};

export default TodayCard;

