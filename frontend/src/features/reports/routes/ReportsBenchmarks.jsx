/**
 * ReportsBenchmarks - Industry Benchmarks tab
 * Premium feature coming soon - compare your facility to industry standards
 */

import { useState } from 'react';
import {
  Target,
  CheckCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  Award,
  Sparkles,
  Bell,
  ArrowRight,
  Shield,
  Globe,
  PieChart,
  Activity,
  Star,
  ChevronRight,
  Lock,
  Mail,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// Benchmark categories with sample metrics
const BENCHMARK_CATEGORIES = [
  {
    id: 'occupancy',
    title: 'Occupancy & Capacity',
    icon: Calendar,
    color: '#3B82F6',
    metrics: [
      { name: 'Average Occupancy Rate', yourValue: '68%', industry: '72%', trend: 'up' },
      { name: 'Peak Season Utilization', yourValue: '94%', industry: '89%', trend: 'up' },
      { name: 'Advance Booking Rate', yourValue: '45%', industry: '52%', trend: 'down' },
    ],
  },
  {
    id: 'revenue',
    title: 'Revenue & Pricing',
    icon: DollarSign,
    color: '#10B981',
    metrics: [
      { name: 'Average Daily Rate', yourValue: '$42', industry: '$38', trend: 'up' },
      { name: 'Revenue Per Available Kennel', yourValue: '$28', industry: '$27', trend: 'up' },
      { name: 'Add-on Service Attach Rate', yourValue: '34%', industry: '41%', trend: 'down' },
    ],
  },
  {
    id: 'customers',
    title: 'Customer Metrics',
    icon: Users,
    color: '#8B5CF6',
    metrics: [
      { name: 'Customer Retention Rate', yourValue: '78%', industry: '71%', trend: 'up' },
      { name: 'Average Pets Per Owner', yourValue: '1.4', industry: '1.6', trend: 'neutral' },
      { name: 'Repeat Booking Rate', yourValue: '62%', industry: '58%', trend: 'up' },
    ],
  },
  {
    id: 'operations',
    title: 'Operational Efficiency',
    icon: Activity,
    color: '#F59E0B',
    metrics: [
      { name: 'Staff to Pet Ratio', yourValue: '1:8', industry: '1:10', trend: 'up' },
      { name: 'Check-in Time (avg)', yourValue: '4.2m', industry: '5.8m', trend: 'up' },
      { name: 'Incident Rate', yourValue: '0.3%', industry: '0.5%', trend: 'up' },
    ],
  },
];

// Percentile badges
const PERCENTILE_BADGES = [
  { label: 'Top 10%', color: '#10B981', icon: Award, description: 'Elite performer' },
  { label: 'Top 25%', color: '#3B82F6', icon: Star, description: 'Above average' },
  { label: 'Top 50%', color: '#F59E0B', icon: TrendingUp, description: 'On track' },
];

export default function ReportsBenchmarks() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeCategory, setActiveCategory] = useState('occupancy');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
    }
  };

  const selectedCategory = BENCHMARK_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="min-h-full bg-gradient-to-br from-[var(--bb-color-bg-default)] via-[var(--bb-color-bg-default)] to-blue-50/30 dark:to-blue-950/10">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        {/* Floating grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative px-6 py-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          {/* Animated icon container */}
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-xl opacity-30 animate-pulse" />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Target className="h-10 w-10 text-white" />
            </div>
            {/* Floating sparkle */}
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-bounce shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[var(--bb-color-text-primary)] mb-3">
            Industry Benchmarks
          </h1>
          <p className="text-lg text-[var(--bb-color-text-secondary)] max-w-2xl mx-auto mb-6">
            See how your facility stacks up against thousands of pet care businesses.
            Identify opportunities and celebrate your strengths with real industry data.
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200 dark:border-blue-800/50 rounded-full">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                In Development
              </span>
            </div>
            <span className="text-[var(--bb-color-text-muted)]">•</span>
            <span className="text-sm text-[var(--bb-color-text-secondary)]">
              Coming Q2 2026
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Left: Interactive Benchmark Preview */}
          <div className="bg-[var(--bb-color-bg-surface)] rounded-2xl border border-[var(--bb-color-border-subtle)] overflow-hidden shadow-sm">
            {/* Category Tabs */}
            <div className="flex border-b border-[var(--bb-color-border-subtle)] overflow-x-auto">
              {BENCHMARK_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all",
                      isActive
                        ? "border-b-2 text-[var(--bb-color-text-primary)]"
                        : "text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-text-secondary)]"
                    )}
                    style={{
                      borderBottomColor: isActive ? category.color : 'transparent',
                    }}
                  >
                    <Icon size={16} style={{ color: isActive ? category.color : undefined }} />
                    {category.title}
                  </button>
                );
              })}
            </div>

            {/* Benchmark Comparison Preview */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--bb-color-text-primary)]">
                  {selectedCategory?.title} Metrics
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="text-[var(--bb-color-text-muted)]">Your Facility</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" />
                    <span className="text-[var(--bb-color-text-muted)]">Industry Avg</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {selectedCategory?.metrics.map((metric, index) => {
                  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
                  const trendColor = metric.trend === 'up' ? 'text-emerald-500' : metric.trend === 'down' ? 'text-red-500' : 'text-gray-400';

                  return (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--bb-color-text-secondary)]">
                          {metric.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {metric.yourValue}
                          </span>
                          <TrendIcon size={14} className={trendColor} />
                        </div>
                      </div>
                      {/* Comparison bar */}
                      <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gray-300 dark:bg-gray-600 rounded-full"
                          style={{ width: `${50 + Math.random() * 30}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                          style={{ width: `${40 + Math.random() * 40}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-[var(--bb-color-text-muted)]">0%</span>
                        <span className="text-xs text-[var(--bb-color-text-muted)]">Industry: {metric.industry}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Locked overlay */}
              <div className="absolute inset-0 bg-[var(--bb-color-bg-surface)]/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-b-2xl">
                <div className="text-center p-4">
                  <div className="h-12 w-12 rounded-full bg-[var(--bb-color-bg-elevated)] flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-6 w-6 text-[var(--bb-color-text-muted)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                    Real benchmarks coming soon
                  </p>
                  <p className="text-xs text-[var(--bb-color-text-muted)]">
                    This is a preview of the interface
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Features & Benefits */}
          <div className="space-y-6">
            {/* Percentile Rankings Preview */}
            <div className="bg-[var(--bb-color-bg-surface)] rounded-2xl border border-[var(--bb-color-border-subtle)] p-5">
              <h3 className="font-semibold text-[var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Earn Percentile Badges
              </h3>
              <div className="grid gap-3">
                {PERCENTILE_BADGES.map((badge, index) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]"
                    >
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${badge.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: badge.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[var(--bb-color-text-primary)]">
                          {badge.label}
                        </div>
                        <div className="text-xs text-[var(--bb-color-text-muted)]">
                          {badge.description}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-[var(--bb-color-text-muted)]" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Privacy Notice */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 p-5">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                    Privacy-First Benchmarking
                  </h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    All benchmarks are calculated from anonymized, aggregated data.
                    Your specific numbers are never shared. Opt-in only for participants.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-[var(--bb-color-text-primary)] text-center mb-6">
            What You'll Be Able to Compare
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: BarChart3,
                title: 'Industry Averages',
                description: 'Compare your metrics against regional and national averages',
                color: '#3B82F6',
              },
              {
                icon: PieChart,
                title: 'Percentile Ranking',
                description: 'See exactly where you stand among peer facilities',
                color: '#8B5CF6',
              },
              {
                icon: TrendingUp,
                title: 'Trend Tracking',
                description: 'Monitor if you\'re improving or declining over time',
                color: '#10B981',
              },
              {
                icon: Globe,
                title: 'Regional Insights',
                description: 'Filter benchmarks by region, size, or facility type',
                color: '#F59E0B',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-[var(--bb-color-bg-surface)] rounded-xl border border-[var(--bb-color-border-subtle)] p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: feature.color }} />
                  </div>
                  <h3 className="font-semibold text-[var(--bb-color-text-primary)] mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--bb-color-text-muted)]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Email Signup */}
        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-center text-white shadow-lg">
            <Bell className="h-8 w-8 mx-auto mb-3 opacity-90" />
            <h3 className="text-xl font-bold mb-2">Get Early Access</h3>
            <p className="text-blue-100 mb-5 text-sm">
              Be the first to know when Industry Benchmarks launches.
              Early adopters get 3 months free of the premium tier.
            </p>

            {isSubscribed ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/20 rounded-xl">
                <Check className="h-5 w-5" />
                <span className="font-medium">You're on the list! We'll be in touch.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  Notify Me
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
