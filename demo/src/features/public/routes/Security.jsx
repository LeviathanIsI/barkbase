/**
 * Security Page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Server, Key, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const securityFeatures = [
  {
    icon: Lock,
    title: 'Encryption',
    description: 'Data is encrypted in transit using TLS/SSL. We use industry-standard security practices.',
  },
  {
    icon: Server,
    title: 'Cloud Infrastructure',
    description: 'Hosted on AWS with reliable infrastructure and regular backups.',
  },
  {
    icon: Key,
    title: 'Authentication',
    description: 'Secure authentication powered by AWS Cognito with password hashing and session management.',
  },
  {
    icon: Shield,
    title: 'Access Control',
    description: 'Role-based permissions to control who can access different parts of your account.',
  },
];

const Security = () => (
  <PublicPageLayout>
    {/* Hero */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="accent" className="mb-6">Security</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
          Security at Barkbase
        </h1>
        <p className="max-w-2xl mx-auto text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
          We take the security of your data seriously. Here's how we work to keep your information safe.
        </p>
      </div>
    </section>

    {/* Security Features */}
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {securityFeatures.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <feature.icon className="h-10 w-10 mb-4" style={{ color: 'var(--bb-color-accent)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                {feature.title}
              </h3>
              <p style={{ color: 'var(--bb-color-text-muted)' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Our Approach */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
          Our Approach to Security
        </h2>
        <div className="space-y-8">
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Data Protection
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Your data is stored securely on AWS infrastructure. We use encryption for data in transit
              and follow security best practices for data storage and access.
            </p>
          </div>
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Secure Development
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We follow secure coding practices and regularly update our dependencies to address
              known vulnerabilities. Our code goes through review before deployment.
            </p>
          </div>
          <div
            className="p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Continuous Improvement
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Security is an ongoing process. We're committed to improving our security posture
              as we grow and will continue to invest in protecting your data.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Contact */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Security Questions?
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
          If you have questions about our security practices or want to report a concern,
          please reach out to us.
        </p>
        <Link to="/contact">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Contact Us
          </Button>
        </Link>
      </div>
    </section>
  </PublicPageLayout>
);

export default Security;
