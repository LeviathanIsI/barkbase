/**
 * Features Page - Detailed product features
 */

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  ArrowRight,
  BarChart3, Bell,
  Calendar,
  Check,
  Clock,
  Cloud,
  DollarSign,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicPageLayout from '../components/PublicPageLayout';

const features = [
  {
    icon: Calendar,
    title: 'Booking & Scheduling',
    description: 'Manage bookings for boarding, daycare, grooming, and training.',
    benefits: [
      'Visual calendar with drag-and-drop',
      'Kennel/run assignment view',
      'Multi-service booking support',
      'Check-in and check-out tracking',
    ],
  },
  {
    icon: Users,
    title: 'Pet & Owner Management',
    description: 'Keep all your customer and pet information in one place.',
    benefits: [
      'Detailed pet profiles',
      'Owner contact information',
      'Vaccination record tracking',
      'Notes and special instructions',
    ],
  },
  {
    icon: DollarSign,
    title: 'Invoicing',
    description: 'Create and manage invoices for your services.',
    benefits: [
      'Invoice generation',
      'Payment tracking',
      'Service-based pricing',
      'Invoice history',
    ],
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Get insights into your business performance.',
    benefits: [
      'Occupancy reports',
      'Revenue tracking',
      'Booking statistics',
      'Export capabilities',
    ],
  },
  {
    icon: Bell,
    title: 'Daily Operations',
    description: 'Tools to manage your day-to-day activities.',
    benefits: [
      'Today view with arrivals/departures',
      'Task management',
      'Incident logging',
      'Staff scheduling',
    ],
  },
  {
    icon: Shield,
    title: 'Multi-Service Support',
    description: 'One platform for all your pet care services.',
    benefits: [
      'Boarding management',
      'Daycare scheduling',
      'Grooming appointments',
      'Training sessions',
    ],
  },
];

const additionalFeatures = [
  { icon: Cloud, title: 'Cloud-Based', description: 'Access from anywhere, any device' },
  { icon: Zap, title: 'Fast & Modern', description: 'Built with modern technology' },
  { icon: Clock, title: 'Always Improving', description: 'New features added regularly' },
];

const Features = () => (
  <PublicPageLayout>
    {/* Hero */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="accent" className="mb-6">Features</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
          Everything you need to run your pet care business
        </h1>
        <p className="max-w-2xl mx-auto text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
          Powerful, easy-to-use tools designed specifically for pet boarding facilities, daycares, and groomers.
        </p>
      </div>
    </section>

    {/* Feature Details */}
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-24">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
          >
            <div className="flex-1">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
              >
                <feature.icon className="h-7 w-7" style={{ color: 'var(--bb-color-accent)' }} />
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
                {feature.title}
              </h2>
              <p className="text-lg mb-6" style={{ color: 'var(--bb-color-text-muted)' }}>
                {feature.description}
              </p>
              <ul className="space-y-3">
                {feature.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--bb-color-status-positive)' }} />
                    <span style={{ color: 'var(--bb-color-text-primary)' }}>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="flex-1 h-80 rounded-2xl border"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              {/* Placeholder for feature screenshot/illustration */}
              <div className="h-full flex items-center justify-center">
                <feature.icon className="h-24 w-24 opacity-20" style={{ color: 'var(--bb-color-text-muted)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Additional Features Grid */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
          Built for the modern web
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {additionalFeatures.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border text-center"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <feature.icon className="h-8 w-8 mx-auto mb-4" style={{ color: 'var(--bb-color-accent)' }} />
              <h3 className="font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>{feature.title}</h3>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          All of this, free to start
        </h2>
        <p className="text-lg mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
          Get up to 20 kennels, unlimited bookings, and full access to core features — no credit card required.
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
          Unlike other kennel software, we don't charge you just to try it out.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Start Free — No Card Required
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="lg">
              See All Plans
            </Button>
          </Link>
        </div>
      </div>
    </section>
  </PublicPageLayout>
);

export default Features;
