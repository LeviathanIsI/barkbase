/**
 * ReportsPredictive - Predictive Analytics tab
 * AI-powered forecasting feature coming soon
 */

import { useState } from 'react';
import {
  TrendingUp,
  Zap,
  Brain,
  Sparkles,
  Bell,
  ArrowRight,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  LineChart,
  BarChart3,
  Target,
  Lightbulb,
  ChevronRight,
  Mail,
  Check,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Shield,
  Bot,
  Cpu,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// AI Prediction categories
const PREDICTION_FEATURES = [
  {
    id: 'revenue',
    title: 'Revenue Forecasting',
    icon: DollarSign,
    color: '#10B981',
    description: 'Project future income with confidence intervals',
    preview: {
      current: '$12,450',
      predicted: '$14,200',
      change: '+14%',
      trend: 'up',
      confidence: '87%',
    },
  },
  {
    id: 'demand',
    title: 'Demand Prediction',
    icon: Calendar,
    color: '#3B82F6',
    description: 'Anticipate busy periods before they happen',
    preview: {
      current: '68%',
      predicted: '92%',
      change: '+24%',
      trend: 'up',
      confidence: '91%',
    },
  },
  {
    id: 'churn',
    title: 'Churn Risk Alerts',
    icon: AlertTriangle,
    color: '#EF4444',
    description: 'Identify at-risk customers before they leave',
    preview: {
      current: '12',
      predicted: '5',
      change: '-58%',
      trend: 'down',
      confidence: '79%',
    },
  },
];

// Sample forecast data points for visualization
const FORECAST_PREVIEW = [
  { month: 'Jan', actual: 45, predicted: null },
  { month: 'Feb', actual: 52, predicted: null },
  { month: 'Mar', actual: 48, predicted: null },
  { month: 'Apr', actual: 61, predicted: null },
  { month: 'May', actual: 58, predicted: null },
  { month: 'Jun', actual: null, predicted: 65 },
  { month: 'Jul', actual: null, predicted: 72 },
  { month: 'Aug', actual: null, predicted: 78 },
];

// AI insight examples
const AI_INSIGHTS = [
  {
    icon: TrendingUp,
    title: 'Demand Spike Expected',
    description: 'Based on historical patterns, expect 35% higher bookings in the next 2 weeks',
    confidence: '92%',
    color: '#3B82F6',
  },
  {
    icon: AlertTriangle,
    title: 'Churn Risk Detected',
    description: '3 high-value customers haven\'t booked in 45+ days. Consider outreach.',
    confidence: '85%',
    color: '#EF4444',
  },
  {
    icon: DollarSign,
    title: 'Revenue Opportunity',
    description: 'Adding grooming services could increase revenue by ~18% based on demand analysis',
    confidence: '78%',
    color: '#10B981',
  },
  {
    icon: Calendar,
    title: 'Capacity Planning',
    description: 'Consider hiring temp staff for July 4th weekend - predicted 95% capacity',
    confidence: '89%',
    color: '#8B5CF6',
  },
];

export default function ReportsPredictive() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeFeature, setActiveFeature] = useState('revenue');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
    }
  };

  const selectedFeature = PREDICTION_FEATURES.find(f => f.id === activeFeature);

  return (
    <div className="min-h-full bg-gradient-to-br from-[var(--bb-color-bg-default)] via-[var(--bb-color-bg-default)] to-purple-50/30 dark:to-purple-950/10">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        {/* Neural network pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02] dark:opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="50" cy="50" r="2" fill="currentColor" />
              <circle cx="0" cy="0" r="1" fill="currentColor" />
              <circle cx="100" cy="0" r="1" fill="currentColor" />
              <circle cx="0" cy="100" r="1" fill="currentColor" />
              <circle cx="100" cy="100" r="1" fill="currentColor" />
              <line x1="50" y1="50" x2="0" y2="0" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
              <line x1="50" y1="50" x2="100" y2="0" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
              <line x1="50" y1="50" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
              <line x1="50" y1="50" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural)" />
        </svg>
      </div>

      <div className="relative px-6 py-8 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          {/* Animated AI icon container */}
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl blur-xl opacity-30 animate-pulse" />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Brain className="h-10 w-10 text-white" />
            </div>
            {/* AI sparkle */}
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center animate-bounce shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
              <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-purple-400" />
            </div>
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
              <div className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-cyan-400" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-200 dark:border-purple-800/50 rounded-full mb-4">
            <Bot className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
              Powered by Machine Learning
            </span>
          </div>

          <h1 className="text-3xl font-bold text-[var(--bb-color-text-primary)] mb-3">
            Predictive Analytics
          </h1>
          <p className="text-lg text-[var(--bb-color-text-secondary)] max-w-2xl mx-auto mb-6">
            AI-powered forecasting that learns from your data to predict revenue,
            anticipate demand, and prevent customer churn before it happens.
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-200 dark:border-purple-800/50 rounded-full">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-purple-500 animate-pulse" />
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                Training Models
              </span>
            </div>
            <span className="text-[var(--bb-color-text-muted)]">•</span>
            <span className="text-sm text-[var(--bb-color-text-secondary)]">
              Coming Q3 2026
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-5 gap-8 mb-10">
          {/* Left: Feature Selection */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--bb-color-text-secondary)] uppercase tracking-wider mb-3">
              Prediction Capabilities
            </h3>
            {PREDICTION_FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;
              const TrendIcon = feature.preview.trend === 'up' ? ArrowUpRight : feature.preview.trend === 'down' ? ArrowDownRight : Minus;

              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all",
                    isActive
                      ? "bg-[var(--bb-color-bg-surface)] border-purple-300 dark:border-purple-700 shadow-sm"
                      : "bg-[var(--bb-color-bg-surface)]/50 border-[var(--bb-color-border-subtle)] hover:bg-[var(--bb-color-bg-surface)]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${feature.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: feature.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--bb-color-text-primary)] mb-0.5">
                        {feature.title}
                      </div>
                      <div className="text-sm text-[var(--bb-color-text-muted)]">
                        {feature.description}
                      </div>
                    </div>
                  </div>

                  {/* Preview stats */}
                  {isActive && (
                    <div className="mt-4 pt-4 border-t border-[var(--bb-color-border-subtle)] grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-xs text-[var(--bb-color-text-muted)] mb-1">Current</div>
                        <div className="font-semibold text-[var(--bb-color-text-primary)]">
                          {feature.preview.current}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[var(--bb-color-text-muted)] mb-1">Predicted</div>
                        <div className="font-semibold" style={{ color: feature.color }}>
                          {feature.preview.predicted}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-[var(--bb-color-text-muted)] mb-1">Change</div>
                        <div className={cn(
                          "font-semibold flex items-center justify-center gap-1",
                          feature.preview.trend === 'up' ? 'text-emerald-500' : feature.preview.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                        )}>
                          <TrendIcon size={14} />
                          {feature.preview.change}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Confidence indicator */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-cyan-50 dark:from-purple-950/30 dark:to-cyan-950/30 border border-purple-200 dark:border-purple-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                  Prediction Confidence
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-purple-100 dark:bg-purple-900/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                    style={{ width: selectedFeature?.preview.confidence }}
                  />
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {selectedFeature?.preview.confidence}
                </span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                Confidence improves as we learn from your data patterns
              </p>
            </div>
          </div>

          {/* Right: Forecast Visualization Preview */}
          <div className="lg:col-span-3">
            <div className="bg-[var(--bb-color-bg-surface)] rounded-2xl border border-[var(--bb-color-border-subtle)] overflow-hidden shadow-sm h-full">
              {/* Chart Header */}
              <div className="p-4 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--bb-color-text-primary)]">
                    {selectedFeature?.title} Forecast
                  </h3>
                  <p className="text-sm text-[var(--bb-color-text-muted)]">
                    Historical data + 3-month prediction
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1 rounded-full bg-purple-500" />
                    <span className="text-[var(--bb-color-text-muted)]">Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1 rounded-full bg-cyan-500 opacity-70" style={{ borderStyle: 'dashed' }} />
                    <span className="text-[var(--bb-color-text-muted)]">Predicted</span>
                  </div>
                </div>
              </div>

              {/* Stylized Chart Preview */}
              <div className="p-6 relative">
                <div className="h-48 flex items-end justify-between gap-2 relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-[var(--bb-color-text-muted)] -ml-1">
                    <span>100</span>
                    <span>75</span>
                    <span>50</span>
                    <span>25</span>
                    <span>0</span>
                  </div>

                  {/* Chart bars */}
                  <div className="flex-1 flex items-end justify-between gap-2 ml-6">
                    {FORECAST_PREVIEW.map((point, index) => {
                      const value = point.actual || point.predicted;
                      const isPredicted = point.predicted !== null;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className={cn(
                              "w-full rounded-t-lg transition-all",
                              isPredicted
                                ? "bg-gradient-to-t from-cyan-500/40 to-cyan-400/60 border-2 border-dashed border-cyan-400"
                                : "bg-gradient-to-t from-purple-600 to-purple-400"
                            )}
                            style={{ height: `${value * 1.8}px` }}
                          />
                          <span className="text-xs text-[var(--bb-color-text-muted)]">
                            {point.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confidence band visualization */}
                <div className="absolute right-20 top-8 text-right">
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 rounded text-xs text-cyan-700 dark:text-cyan-400">
                    <Activity size={12} />
                    Confidence Band: 80-95%
                  </div>
                </div>
              </div>

              {/* AI Insight */}
              <div className="px-6 pb-6">
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-950/30 dark:to-cyan-950/30 border border-purple-200 dark:border-purple-800/50">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
                        AI Insight
                      </div>
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        "Based on seasonal patterns and recent bookings, expect {selectedFeature?.preview.change} in {selectedFeature?.title.toLowerCase()} over the next quarter. Consider adjusting staffing."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Preview */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-[var(--bb-color-text-primary)] text-center mb-2">
            Proactive AI Recommendations
          </h2>
          <p className="text-center text-[var(--bb-color-text-muted)] mb-6">
            Get actionable insights delivered to your dashboard automatically
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {AI_INSIGHTS.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div
                  key={index}
                  className="bg-[var(--bb-color-bg-surface)] rounded-xl border border-[var(--bb-color-border-subtle)] p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${insight.color}15` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: insight.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-[var(--bb-color-text-primary)]">
                          {insight.title}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-muted)]">
                          {insight.confidence} confident
                        </span>
                      </div>
                      <p className="text-sm text-[var(--bb-color-text-muted)]">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--bb-color-border-subtle)] flex items-center justify-between">
                    <span className="text-xs text-[var(--bb-color-text-muted)] flex items-center gap-1">
                      <Clock size={12} />
                      Updated 2h ago
                    </span>
                    <button className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Take Action
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-[var(--bb-color-text-primary)] text-center mb-6">
            How Our AI Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                title: 'Learn From Your Data',
                description: 'Our models analyze your historical bookings, revenue, and customer behavior patterns',
                icon: Brain,
              },
              {
                step: '2',
                title: 'Identify Patterns',
                description: 'We detect seasonality, trends, and correlations unique to your business',
                icon: Activity,
              },
              {
                step: '3',
                title: 'Generate Predictions',
                description: 'Get accurate forecasts with confidence intervals you can rely on',
                icon: LineChart,
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative inline-flex mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center">
                    <step.icon className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </div>
                </div>
                <h3 className="font-semibold text-[var(--bb-color-text-primary)] mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--bb-color-text-muted)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Privacy */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 p-5">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                  Your Data Stays Yours
                </h4>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Predictions are generated using your data only. We never share, sell, or train
                  cross-tenant models with your business information. All AI processing happens securely
                  within your tenant boundary.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Signup */}
        <div className="max-w-xl mx-auto">
          <div className="bg-gradient-to-br from-purple-500 via-violet-500 to-cyan-500 rounded-2xl p-6 text-center text-white shadow-lg">
            <div className="relative inline-flex mb-3">
              <Bell className="h-8 w-8 opacity-90" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4" />
            </div>
            <h3 className="text-xl font-bold mb-2">Be an Early Adopter</h3>
            <p className="text-purple-100 mb-5 text-sm">
              Join the waitlist for Predictive Analytics. First 100 signups get
              6 months free when we launch.
            </p>

            {isSubscribed ? (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/20 rounded-xl">
                <Check className="h-5 w-5" />
                <span className="font-medium">You're on the list! We'll be in touch.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/30"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2"
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
