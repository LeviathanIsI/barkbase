/**
 * Compliance Page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Lock, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const dataRights = [
  { icon: FileText, title: 'Data Access', description: 'Request a copy of your stored data' },
  { icon: Lock, title: 'Data Deletion', description: 'Request deletion of your account and data' },
  { icon: Shield, title: 'Data Control', description: 'Control how your information is used' },
];

const Compliance = () => (
  <PublicPageLayout>
    {/* Hero */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="accent" className="mb-6">Compliance</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
          Data & Privacy
        </h1>
        <p className="max-w-2xl mx-auto text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
          We respect your privacy and are committed to handling your data responsibly.
        </p>
      </div>
    </section>

    {/* Data Rights */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Your Data Rights
        </h2>
        <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: 'var(--bb-color-text-muted)' }}>
          You have control over your personal data. Here's what you can do:
        </p>
        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {dataRights.map((right) => (
            <div
              key={right.title}
              className="p-6 rounded-xl border text-center"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <right.icon className="h-8 w-8 mx-auto mb-4" style={{ color: 'var(--bb-color-accent)' }} />
              <h3 className="font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>{right.title}</h3>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>{right.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Our Commitments */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
          Our Commitments
        </h2>
        <div className="space-y-8">
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Data Minimization
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We only collect the data necessary to provide our services. We don't sell your data
              to third parties or use it for purposes you haven't agreed to.
            </p>
          </div>
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Transparency
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Our Privacy Policy clearly explains what data we collect, why we collect it, and how
              we use it. If you have questions, we're happy to answer them.
            </p>
          </div>
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Your Control
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              You can request access to, correction of, or deletion of your personal data at any time.
              Just contact us and we'll help you.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Questions about your data?
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
          We're happy to answer any questions about how we handle your data.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/contact">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Contact Us
            </Button>
          </Link>
          <Link to="/privacy">
            <Button variant="outline" size="lg">View Privacy Policy</Button>
          </Link>
        </div>
      </div>
    </section>
  </PublicPageLayout>
);

export default Compliance;
