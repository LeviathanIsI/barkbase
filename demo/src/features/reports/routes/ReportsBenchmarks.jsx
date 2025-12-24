/**
 * ReportsBenchmarks - Industry Benchmarks tab
 * Coming Soon placeholder
 */

import { Target, CheckCircle, Zap } from 'lucide-react';

const ComingSoonState = (props) => {
  const { icon: Icon, title, subtitle, features = [] } = props;
  return (
    <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-6 text-center">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      <p className="text-xs text-muted mb-4 max-w-sm mx-auto">{subtitle}</p>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium mb-4">
        <Zap className="h-3 w-3" />
        Coming Soon
      </div>
      {features.length > 0 && (
        <div className="max-w-xs mx-auto text-left">
          <div className="space-y-1">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted">
                <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ReportsBenchmarks = () => (
  <ComingSoonState
    icon={Target}
    title="Industry Benchmarks"
    subtitle="Compare performance"
    features={['Industry averages', 'Percentile ranking', 'Trend tracking']}
  />
);

export default ReportsBenchmarks;
