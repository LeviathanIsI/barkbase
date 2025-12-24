import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, HelpCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { usePageView, useCTATracking } from '@/hooks/useTelemetry';

/**
 * Placeholder page component for MVP features
 * Provides consistent structure with breadcrumbs, empty state, and telemetry
 */
const PlaceholderPage = ({
  title,
  breadcrumbs = [],
  description,
  illustration: IllustrationIcon,
  primaryCTA,
  secondaryCTA,
  badge,
  learnMoreUrl,
  pageName,
}) => {
  const trackCTA = useCTATracking(pageName);
  usePageView(pageName);

  // Set document title
  useEffect(() => {
    document.title = `${title} | BarkBase`;
    return () => {
      document.title = 'BarkBase';
    };
  }, [title]);

  const handlePrimaryCTA = () => {
    if (primaryCTA?.onClick) {
      trackCTA(primaryCTA.label);
      primaryCTA.onClick();
    }
  };

  const handleSecondaryCTA = () => {
    if (secondaryCTA?.onClick) {
      trackCTA(secondaryCTA.label);
      secondaryCTA.onClick();
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="mb-4 flex items-center gap-2 text-sm text-muted">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="hover:text-primary transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-text">{title}</h1>
          {badge && (
            <Badge variant={badge.variant || 'secondary'}>
              {badge.label}
            </Badge>
          )}
        </div>
        {primaryCTA && (
          <Button onClick={handlePrimaryCTA} disabled={primaryCTA.disabled}>
            {primaryCTA.icon && <primaryCTA.icon className="h-4 w-4" />}
            {primaryCTA.label}
          </Button>
        )}
      </div>

      {/* Empty State */}
      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-md text-center space-y-6">
          {IllustrationIcon && (
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <IllustrationIcon className="h-16 w-16 text-primary" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-text">{title}</h2>
            <p className="text-sm text-muted">{description}</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            {primaryCTA && (
              <Button onClick={handlePrimaryCTA} disabled={primaryCTA.disabled} size="lg">
                {primaryCTA.icon && <primaryCTA.icon className="h-4 w-4" />}
                {primaryCTA.label}
              </Button>
            )}

            {secondaryCTA && (
              <Button
                onClick={handleSecondaryCTA}
                variant="ghost"
                size="sm"
              >
                {secondaryCTA.icon && <secondaryCTA.icon className="h-4 w-4" />}
                {secondaryCTA.label}
              </Button>
            )}

            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <HelpCircle className="h-4 w-4" />
                Learn more
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
