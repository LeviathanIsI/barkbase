/**
 * Careers Page
 */

import React from 'react';
import { MapPin, Clock, DollarSign, Heart, Zap, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const benefits = [
  { icon: Heart, title: 'Health & Wellness', description: 'Comprehensive health, dental, and vision coverage' },
  { icon: DollarSign, title: 'Competitive Pay', description: 'Salary + equity packages that reward your contributions' },
  { icon: Clock, title: 'Flexible Hours', description: 'Work when you\'re most productive, from anywhere' },
  { icon: Users, title: 'Great Team', description: 'Work with passionate, talented people who love pets' },
  { icon: Zap, title: 'Learning Budget', description: '$1,500 annual budget for courses and conferences' },
  { icon: MapPin, title: 'Remote-First', description: 'Work from anywhere in the US' },
];


const Careers = () => (
  <PublicPageLayout>
    {/* Hero */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="accent" className="mb-6">Careers</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
          Join our pack
        </h1>
        <p className="max-w-2xl mx-auto text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
          Help us build the future of pet care management. We're looking for passionate people
          who want to make a difference in the lives of pets and the people who care for them.
        </p>
      </div>
    </section>

    {/* Why Join Us */}
    <section className="py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
          Why work at Barkbase?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="p-6 rounded-xl border"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <benefit.icon className="h-8 w-8 mb-4" style={{ color: 'var(--bb-color-accent)' }} />
              <h3 className="font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>{benefit.title}</h3>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Culture */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
          Our Culture
        </h2>
        <div className="space-y-8">
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Remote-First, Human-Always
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We believe great work can happen anywhere. Our team is distributed across the US,
              but we stay connected through regular video calls, async communication, and annual team retreats.
            </p>
          </div>
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Ownership & Impact
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Every team member has real ownership over their work. We're a small team where your
              contributions directly impact the product and the business. No bureaucracy, no red tape.
            </p>
          </div>
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Continuous Learning
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We're committed to helping you grow. Whether it's attending conferences, taking courses,
              or learning from teammates, we invest in your development.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          No open positions right now
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
          We're not actively hiring at the moment, but we're always interested in hearing from talented people.
          Send your resume to <a href="mailto:careers@barkbase.com" className="underline" style={{ color: 'var(--bb-color-accent)' }}>careers@barkbase.com</a> and we'll keep you in mind for future opportunities.
        </p>
      </div>
    </section>
  </PublicPageLayout>
);

export default Careers;
