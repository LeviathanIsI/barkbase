/**
 * ReportsScheduled - Scheduled Reports tab
 * Polished coming soon state with feature preview and mockup
 */

import { useState } from 'react';
import {
  Mail,
  CheckCircle,
  Zap,
  Calendar,
  Clock,
  FileText,
  Users,
  Bell,
  Play,
  Pause,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
  Send,
  FileSpreadsheet,
  CalendarClock,
  BarChart3,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Feature categories with detailed descriptions
const FEATURE_CATEGORIES = [
  {
    title: 'Scheduling Options',
    icon: CalendarClock,
    color: '#8B5CF6',
    features: [
      { name: 'Daily Summaries', description: 'Start each day with key metrics' },
      { name: 'Weekly Digests', description: 'End-of-week performance overview' },
      { name: 'Monthly Reports', description: 'Comprehensive monthly analytics' },
      { name: 'Custom Schedules', description: 'Set any day/time that works' },
    ],
  },
  {
    title: 'Delivery Methods',
    icon: Send,
    color: '#3B82F6',
    features: [
      { name: 'Email Delivery', description: 'Reports sent directly to inbox' },
      { name: 'Multiple Recipients', description: 'Share with your whole team' },
      { name: 'Attachment Options', description: 'Inline or as download links' },
      { name: 'Branded Templates', description: 'Your logo and colors' },
    ],
  },
  {
    title: 'Export Formats',
    icon: FileSpreadsheet,
    color: '#10B981',
    features: [
      { name: 'PDF Reports', description: 'Print-ready formatted documents' },
      { name: 'Excel Spreadsheets', description: 'Full data for analysis' },
      { name: 'CSV Data', description: 'Raw data for integrations' },
      { name: 'Interactive Dashboards', description: 'Live links to explore' },
    ],
  },
];

// Mock scheduled reports for preview
const MOCK_SCHEDULES = [
  {
    id: 1,
    name: 'Weekly Revenue Summary',
    type: 'Financial',
    icon: TrendingUp,
    frequency: 'Weekly',
    day: 'Monday',
    time: '8:00 AM',
    recipients: 3,
    status: 'active',
    nextRun: 'Jan 20, 2026',
  },
  {
    id: 2,
    name: 'Daily Occupancy Report',
    type: 'Operations',
    icon: BarChart3,
    frequency: 'Daily',
    day: null,
    time: '6:00 AM',
    recipients: 5,
    status: 'active',
    nextRun: 'Tomorrow',
  },
  {
    id: 3,
    name: 'Monthly Service Analysis',
    type: 'Analytics',
    icon: PieChart,
    frequency: 'Monthly',
    day: '1st',
    time: '9:00 AM',
    recipients: 2,
    status: 'paused',
    nextRun: 'Feb 1, 2026',
  },
];

const ReportsScheduled = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const handleNotifyMe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubscribed(true);
      // In real implementation, this would call an API
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Coming Soon Badge */}
      <div className="text-center py-6">
        {/* Animated icon container */}
        <div className="relative inline-flex mb-4">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Mail className="h-10 w-10 text-white" />
          </div>
          {/* Floating sparkle */}
          <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center animate-bounce shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[var(--bb-color-text-primary)] mb-2">
          Scheduled Reports
        </h2>
        <p className="text-[var(--bb-color-text-secondary)] max-w-md mx-auto mb-4">
          Automate your reporting workflow with scheduled delivery of key business insights
        </p>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-800 rounded-full">
          <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Coming Q2 2026
          </span>
        </div>
      </div>

      {/* Feature Categories */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-xl border border-[var(--bb-color-border-subtle)] overflow-hidden">
        {/* Category Tabs */}
        <div className="flex border-b border-[var(--bb-color-border-subtle)]">
          {FEATURE_CATEGORIES.map((category, idx) => {
            const Icon = category.icon;
            const isActive = activeCategory === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveCategory(idx)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)] border-b-2"
                    : "text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)]/50"
                )}
                style={isActive ? { borderBottomColor: category.color } : {}}
              >
                <Icon size={16} style={{ color: category.color }} />
                <span className="hidden sm:inline">{category.title}</span>
              </button>
            );
          })}
        </div>

        {/* Active Category Features */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURE_CATEGORIES[activeCategory].features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bb-color-bg-elevated)]/50 border border-[var(--bb-color-border-subtle)]"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${FEATURE_CATEGORIES[activeCategory].color}20` }}
                >
                  <CheckCircle
                    size={16}
                    style={{ color: FEATURE_CATEGORIES[activeCategory].color }}
                  />
                </div>
                <div>
                  <h4 className="font-medium text-[var(--bb-color-text-primary)]">
                    {feature.name}
                  </h4>
                  <p className="text-sm text-[var(--bb-color-text-muted)]">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Mockup */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-xl border border-[var(--bb-color-border-subtle)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--bb-color-text-primary)]">
                Preview: Your Scheduled Reports
              </h3>
              <p className="text-sm text-[var(--bb-color-text-muted)]">
                This is how your scheduled reports dashboard will look
              </p>
            </div>
          </div>
          <span className="text-xs text-[var(--bb-color-text-muted)] bg-[var(--bb-color-bg-elevated)] px-2 py-1 rounded">
            Preview Only
          </span>
        </div>

        {/* Mock Schedule List */}
        <div className="p-4">
          {/* Mock header */}
          <div className="flex items-center justify-between mb-4 opacity-60">
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-[var(--bb-color-accent)] rounded-lg flex items-center justify-center text-white text-sm font-medium">
                + New Schedule
              </div>
            </div>
            <div className="text-sm text-[var(--bb-color-text-muted)]">
              3 scheduled reports
            </div>
          </div>

          {/* Mock schedule cards */}
          <div className="space-y-3">
            {MOCK_SCHEDULES.map((schedule) => {
              const Icon = schedule.icon;
              const isActive = schedule.status === 'active';
              return (
                <div
                  key={schedule.id}
                  className={cn(
                    "relative rounded-lg border p-4 transition-all",
                    "bg-[var(--bb-color-bg-elevated)]/50",
                    isActive
                      ? "border-emerald-200 dark:border-emerald-800/50"
                      : "border-[var(--bb-color-border-subtle)] opacity-60"
                  )}
                >
                  {/* Status indicator */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: isActive ? '#10B981' : '#6B7280' }}
                  />

                  <div className="flex items-center justify-between pl-3">
                    <div className="flex items-center gap-4">
                      {/* Report icon */}
                      <div className="h-10 w-10 rounded-lg bg-[var(--bb-color-bg-surface)] flex items-center justify-center">
                        <Icon size={20} className="text-[var(--bb-color-accent)]" />
                      </div>

                      {/* Report info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-[var(--bb-color-text-primary)]">
                            {schedule.name}
                          </h4>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            isActive
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          )}>
                            {schedule.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[var(--bb-color-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {schedule.frequency}{schedule.day ? ` (${schedule.day})` : ''} at {schedule.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {schedule.recipients} recipients
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <p className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                          {schedule.nextRun}
                        </p>
                        <p className="text-xs text-[var(--bb-color-text-muted)]">next run</p>
                      </div>
                      <button className="p-2 rounded-lg hover:bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-muted)]">
                        {isActive ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button className="p-2 rounded-lg hover:bg-[var(--bb-color-bg-surface)] text-[var(--bb-color-text-muted)]">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blur overlay to indicate preview */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bb-color-bg-surface)] via-transparent to-transparent pointer-events-none" style={{ height: '100px', bottom: 0, top: 'auto', position: 'relative', marginTop: '-60px' }} />
        </div>
      </div>

      {/* Notify Me Section */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Icon and text */}
          <div className="flex items-center gap-4 flex-1">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/25">
              <Bell className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--bb-color-text-primary)] text-lg">
                Get Notified When Available
              </h3>
              <p className="text-sm text-[var(--bb-color-text-secondary)]">
                Be the first to know when scheduled reports launches. We'll send you a one-time notification.
              </p>
            </div>
          </div>

          {/* Email form */}
          {!isSubscribed ? (
            <form onSubmit={handleNotifyMe} className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={cn(
                  "flex-1 md:w-64 px-4 py-2.5 rounded-lg text-sm",
                  "bg-white dark:bg-[var(--bb-color-bg-elevated)]",
                  "border border-violet-200 dark:border-violet-700",
                  "text-[var(--bb-color-text-primary)]",
                  "placeholder:text-[var(--bb-color-text-muted)]",
                  "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                )}
                required
              />
              <button
                type="submit"
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-medium",
                  "bg-gradient-to-r from-violet-500 to-purple-600 text-white",
                  "hover:from-violet-600 hover:to-purple-700",
                  "shadow-md shadow-violet-500/25",
                  "transition-all"
                )}
              >
                Notify Me
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                You're on the list! We'll email you when it launches.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* What to Expect */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-xl border border-[var(--bb-color-border-subtle)] p-6">
        <h3 className="font-semibold text-[var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
          <FileText size={18} className="text-[var(--bb-color-accent)]" />
          What You'll Be Able to Schedule
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Revenue Reports', icon: TrendingUp, color: '#10B981' },
            { name: 'Occupancy Stats', icon: BarChart3, color: '#3B82F6' },
            { name: 'Service Analytics', icon: PieChart, color: '#8B5CF6' },
            { name: 'Staff Performance', icon: Users, color: '#F59E0B' },
          ].map((report, idx) => {
            const Icon = report.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bb-color-bg-elevated)]/50"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${report.color}20` }}
                >
                  <Icon size={16} style={{ color: report.color }} />
                </div>
                <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                  {report.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA to explore existing reports */}
        <div className="mt-6 pt-4 border-t border-[var(--bb-color-border-subtle)] flex items-center justify-between">
          <p className="text-sm text-[var(--bb-color-text-muted)]">
            In the meantime, explore our real-time and historical reports
          </p>
          <button className="flex items-center gap-1 text-sm font-medium text-[var(--bb-color-accent)] hover:underline">
            View Live Reports
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsScheduled;
