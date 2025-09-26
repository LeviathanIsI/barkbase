import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CheckCircle, Circle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const FEATURE_LABELS = {
  billingPortal: 'Billing portal',
  auditLog: 'Audit log',
  advancedReports: 'Advanced reports',
};

const renderProgressBar = (percent) => {
  const clamped = Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : 0;
  return (
    <div className="relative h-2 w-full max-w-md overflow-hidden rounded-full bg-border/60">
      <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
};

const OnboardingChecklist = ({ status, onDismiss, isMutating }) => {
  const navigate = useNavigate();

  if (!status) {
    return null;
  }

  const { checklist = [], progress = {}, plan = {} } = status;
  const total = progress.total ?? checklist.length ?? 0;
  const completed = progress.completed ?? checklist.filter((item) => item.done).length;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  const featureEntries = Object.entries(FEATURE_LABELS).map(([key, label]) => ({
    key,
    label,
    enabled: Boolean(plan.features?.[key]),
  }));

  return (
    <Card
      className="border-primary/25 bg-primary/5"
      header={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Workspace onboarding</p>
            <div>
              <h3 className="text-lg font-semibold text-text">Let’s get your team ready</h3>
              <p className="text-sm text-muted">
                Complete these quick steps to unlock the full BarkBase experience across bookings, pets, and reporting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="neutral" className="uppercase">
              Plan {plan.name ?? 'FREE'}
            </Badge>
            <span className="text-xs font-medium text-muted">
              {completed} / {total} complete
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex w-full flex-wrap items-center gap-3">
          {renderProgressBar(percentComplete)}
          <span className="text-xs text-muted">{percentComplete}% complete</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto text-muted hover:text-text"
            disabled={isMutating}
            onClick={() => onDismiss?.(true)}
          >
            {isMutating ? 'Dismissing…' : 'Hide checklist'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          {checklist.map((item) => {
            const Icon = item.done ? CheckCircle : Circle;
            return (
              <div
                key={item.id}
                className={cn(
                  'flex flex-col gap-2 rounded-lg border border-border/60 bg-surface/95 p-4 shadow-sm transition-colors',
                  item.done && 'border-success/50 bg-success/5',
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('mt-0.5 h-5 w-5 text-muted', item.done && 'text-success')} />
                  <div className="flex-1">
                    <p className="font-medium text-text">{item.label}</p>
                    {item.description ? <p className="text-sm text-muted">{item.description}</p> : null}
                  </div>
                  {item.done ? (
                    <Badge variant="success">Complete</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={() => navigate(item.href ?? '/dashboard')}
                    >
                      Go <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-4 rounded-lg border border-border/60 bg-surface/95 p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Plan overview</p>
            <h4 className="mt-1 text-base font-semibold text-text">What’s included today</h4>
          </div>
          <ul className="space-y-2 text-sm">
            {featureEntries.map((feature) => (
              <li key={feature.key} className="flex items-center justify-between gap-3">
                <span>{feature.label}</span>
                <Badge variant={feature.enabled ? 'success' : 'neutral'}>
                  {feature.enabled ? 'Included' : 'Locked'}
                </Badge>
              </li>
            ))}
          </ul>
          {plan.upgradeAvailable ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => navigate('/settings/billing')}
            >
              Compare plans
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export default OnboardingChecklist;
