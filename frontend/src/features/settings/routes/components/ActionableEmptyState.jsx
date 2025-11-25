/**
 * ActionableEmptyState - Rich empty state for services with quick start options
 * Uses design tokens for consistent styling
 */

import { BookOpen, Plus, Upload, Play } from 'lucide-react';
import Button from '@/components/ui/Button';

const ActionableEmptyState = ({
  category,
  onBrowseTemplates,
  onCreateService,
  onImportServices,
  onWatchTutorial
}) => {
  const getCategoryInfo = (cat) => {
    switch (cat) {
      case 'boarding':
        return {
          title: '🏨 Boarding Services',
          description: 'Overnight accommodations for pets',
        };
      case 'daycare':
        return {
          title: '🎾 Daycare Services',
          description: 'Daily care and play for pets',
        };
      case 'grooming':
        return {
          title: '✂️ Grooming Services',
          description: 'Professional pet grooming and spa',
        };
      case 'training':
        return {
          title: '🎯 Training Services',
          description: 'Professional pet training programs',
        };
      case 'add-ons':
        return {
          title: '⭐ Add-on Services',
          description: 'Optional extras for existing services',
        };
      case 'memberships':
        return {
          title: '🌟 Membership Plans',
          description: 'Recurring revenue through subscriptions',
        };
      default:
        return {
          title: '🏨 Pet Care Services',
          description: 'Professional pet care offerings',
        };
    }
  };

  const categoryInfo = getCategoryInfo(category);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-[var(--bb-color-bg-surface)] rounded-[var(--bb-radius-xl)] border border-[var(--bb-color-border-subtle)] p-[var(--bb-space-8)] text-center">
        <div className="mb-[var(--bb-space-6)]">
          <div className="w-16 h-16 bg-[var(--bb-color-status-info-soft)] rounded-full flex items-center justify-center mx-auto mb-[var(--bb-space-4)]">
            <BookOpen className="w-8 h-8 text-[var(--bb-color-status-info)]" />
          </div>
          <h2 className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
            No services configured yet
          </h2>
          <p className="text-[var(--bb-color-text-muted)] mb-[var(--bb-space-6)]">
            Services are the core of your business - boarding, daycare, grooming, and any other offerings you provide.
          </p>
        </div>

        {/* Quick Start Options */}
        <div className="bg-[var(--bb-color-status-info-soft)] border border-[var(--bb-color-status-info)] border-opacity-30 rounded-[var(--bb-radius-lg)] p-[var(--bb-space-6)] mb-[var(--bb-space-8)]">
          <h3 className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-4)] text-center">
            QUICK START OPTIONS:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--bb-space-4)]">
            <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-[var(--bb-radius-lg)] p-[var(--bb-space-4)] hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-3)]">
                <div className="w-10 h-10 bg-[var(--bb-color-status-info-soft)] rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[var(--bb-color-status-info)]" />
                </div>
                <div className="text-left">
                  <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">Use Industry Templates</h4>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Start with pre-configured services for {categoryInfo.description.toLowerCase()}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-[var(--bb-radius-lg)] p-[var(--bb-space-4)] hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-3)]">
                <div className="w-10 h-10 bg-[var(--bb-color-status-positive-soft)] rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[var(--bb-color-status-positive)]" />
                </div>
                <div className="text-left">
                  <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">Create First Service</h4>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Build your service catalog from scratch</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-[var(--bb-radius-lg)] p-[var(--bb-space-4)] hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-3)]">
                <div className="w-10 h-10 bg-[var(--bb-color-purple-soft)] rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[var(--bb-color-purple)]" />
                </div>
                <div className="text-left">
                  <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">Import from Spreadsheet</h4>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Upload your existing pricing (CSV/Excel)</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)] rounded-[var(--bb-radius-lg)] p-[var(--bb-space-4)] hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-[var(--bb-space-3)] mb-[var(--bb-space-3)]">
                <div className="w-10 h-10 bg-[var(--bb-color-status-warning-soft)] rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-[var(--bb-color-status-warning)]" />
                </div>
                <div className="text-left">
                  <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">Watch Tutorial (3:45)</h4>
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">Learn how to set up services and pricing</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-[var(--bb-space-4)] justify-center mb-[var(--bb-space-8)]">
          <Button onClick={onBrowseTemplates} className="flex items-center gap-[var(--bb-space-2)]">
            <BookOpen className="w-4 h-4" />
            Browse Templates
          </Button>
          <Button variant="outline" onClick={onCreateService} className="flex items-center gap-[var(--bb-space-2)]">
            <Plus className="w-4 h-4" />
            Create First Service
          </Button>
          <Button variant="outline" onClick={onImportServices} className="flex items-center gap-[var(--bb-space-2)]">
            <Upload className="w-4 h-4" />
            Import Services
          </Button>
          <Button variant="outline" onClick={onWatchTutorial} className="flex items-center gap-[var(--bb-space-2)]">
            <Play className="w-4 h-4" />
            Watch Tutorial
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
            Need help getting started? Check out our{' '}
            <a href="#" className="text-[var(--bb-color-accent)] hover:underline">documentation</a>
            {' '}or{' '}
            <a href="#" className="text-[var(--bb-color-accent)] hover:underline">contact support</a>
            {' '}for personalized guidance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActionableEmptyState;
