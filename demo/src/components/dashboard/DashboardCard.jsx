import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

/**
 * Wrapper for focus cards on dashboard
 * Provides consistent header with optional action button
 *
 * @param {string} title - Card title
 * @param {React.ReactNode} action - Optional action button/link
 * @param {React.ReactNode} children - Card content
 *
 * @example
 * <DashboardCard
 *   title="Today's Check-Ins"
 *   action={<Button size="sm">View All</Button>}
 * >
 *   <CheckInList limit={5} />
 * </DashboardCard>
 */
export function DashboardCard({
  title,
  action,
  children,
  className
}) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

DashboardCard.displayName = 'DashboardCard';
