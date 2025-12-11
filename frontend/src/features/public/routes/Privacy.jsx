/**
 * Privacy Policy Page
 */

import React from 'react';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const Privacy = () => (
  <PublicPageLayout>
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Badge variant="accent" className="mb-6">Legal</Badge>
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Privacy Policy
        </h1>
        <p className="text-sm mb-12" style={{ color: 'var(--bb-color-text-muted)' }}>
          Last updated: December 1, 2024
        </p>

        <div className="prose prose-lg max-w-none space-y-8" style={{ color: 'var(--bb-color-text-primary)' }}>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Barkbase ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our pet care management platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <h3 className="text-lg font-semibold mb-2">Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>Account information (name, email, password)</li>
              <li>Business information (company name, address, phone)</li>
              <li>Customer and pet data you enter into the platform</li>
              <li>Payment information (processed securely by Stripe)</li>
              <li>Communications with our support team</li>
            </ul>

            <h3 className="text-lg font-semibold mb-2 mt-6">Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
              <li>Usage patterns and feature interactions</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>Provide and maintain our services</li>
              <li>Process transactions and send billing information</li>
              <li>Send administrative communications</li>
              <li>Respond to customer support requests</li>
              <li>Improve and personalize our services</li>
              <li>Analyze usage trends and platform performance</li>
              <li>Protect against fraud and unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Sharing</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li><strong>Service providers:</strong> Third parties that help us operate our platform (hosting, payment processing, email delivery)</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>256-bit SSL/TLS encryption for data in transit</li>
              <li>AES-256 encryption for data at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>Multi-factor authentication options</li>
              <li>Daily automated backups</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>Access and receive a copy of your data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Object to certain processing activities</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Cookies</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We use cookies and similar technologies to enhance your experience. You can control cookie preferences through your browser settings. Essential cookies required for platform functionality cannot be disabled.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Our services are not directed to individuals under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              For privacy-related questions, please contact us at:
            </p>
            <p className="mt-4" style={{ color: 'var(--bb-color-text-muted)' }}>
              Email: privacy@barkbase.com<br />
              Address: 123 Pet Care Lane, Austin, TX 78701
            </p>
          </section>
        </div>
      </div>
    </section>
  </PublicPageLayout>
);

export default Privacy;
