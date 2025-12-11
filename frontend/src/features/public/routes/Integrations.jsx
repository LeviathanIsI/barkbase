/**
 * Integrations Page - Planned integrations
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, CreditCard, Mail, MessageSquare, Calendar, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const plannedIntegrations = [
  {
    category: 'Payments',
    items: [
      { name: 'Stripe', description: 'Accept credit cards and manage subscriptions', icon: CreditCard },
      { name: 'Square', description: 'In-person and online payments', icon: CreditCard },
    ],
  },
  {
    category: 'Communication',
    items: [
      { name: 'Twilio', description: 'SMS notifications and reminders', icon: MessageSquare },
      { name: 'SendGrid', description: 'Transactional email delivery', icon: Mail },
    ],
  },
  {
    category: 'Scheduling',
    items: [
      { name: 'Google Calendar', description: 'Sync bookings with your calendar', icon: Calendar },
      { name: 'Apple Calendar', description: 'iCal integration', icon: Calendar },
    ],
  },
  {
    category: 'Accounting',
    items: [
      { name: 'QuickBooks', description: 'Sync invoices and payments', icon: FileText },
      { name: 'Xero', description: 'Automated bookkeeping', icon: FileText },
    ],
  },
];

const Integrations = () => (
  <PublicPageLayout>
    {/* Hero */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="accent" className="mb-6">Integrations</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
          Integrations on the Roadmap
        </h1>
        <p className="max-w-2xl mx-auto text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
          We're planning to integrate with the tools you already use. Here's what's on our roadmap.
          Have a specific integration request? Let us know!
        </p>
      </div>
    </section>

    {/* Planned Integrations Grid */}
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {plannedIntegrations.map((category) => (
          <div key={category.category}>
            <h2 className="text-2xl font-bold mb-8" style={{ color: 'var(--bb-color-text-primary)' }}>
              {category.category}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.items.map((item) => (
                <div
                  key={item.name}
                  className="p-6 rounded-xl border"
                  style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                    >
                      <item.icon className="h-6 w-6" style={{ color: 'var(--bb-color-accent)' }} />
                    </div>
                    <Badge variant="neutral" size="sm">Planned</Badge>
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {item.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Request Integration */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-4xl mx-auto text-center">
        <Zap className="h-12 w-12 mx-auto mb-6" style={{ color: 'var(--bb-color-accent)' }} />
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Need a specific integration?
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
          We're building integrations based on customer feedback. Let us know what tools you use and
          we'll prioritize accordingly.
        </p>
        <Link to="/contact">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Request an Integration
          </Button>
        </Link>
      </div>
    </section>
  </PublicPageLayout>
);

export default Integrations;
