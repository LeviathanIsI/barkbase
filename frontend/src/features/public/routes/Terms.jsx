/**
 * Terms of Service Page
 */

import React from 'react';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const Terms = () => (
  <PublicPageLayout>
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Badge variant="accent" className="mb-6">Legal</Badge>
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Terms of Service
        </h1>
        <p className="text-sm mb-12" style={{ color: 'var(--bb-color-text-muted)' }}>
          Last updated: December 1, 2024
        </p>

        <div className="prose prose-lg max-w-none space-y-8" style={{ color: 'var(--bb-color-text-primary)' }}>
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              By accessing or using Barkbase, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Barkbase provides a cloud-based pet care management platform that enables businesses to manage bookings, customers, pets, invoicing, and related operations. Features vary by subscription plan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You must be at least 18 years old to create an account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-4" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Upload malicious code or attempt to compromise system security</li>
              <li>Use the service to send spam or unsolicited communications</li>
              <li>Resell or redistribute the service without authorization</li>
              <li>Attempt to reverse engineer or extract source code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Subscription and Billing</h2>
            <ul className="list-disc pl-6 space-y-2" style={{ color: 'var(--bb-color-text-muted)' }}>
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>Prices may change with 30 days' notice for existing customers</li>
              <li>Refunds are provided in accordance with our refund policy</li>
              <li>Failure to pay may result in service suspension or termination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Ownership</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              You retain ownership of all data you input into Barkbase. By using our service, you grant us a limited license to use this data solely to provide and improve our services. You are responsible for ensuring you have appropriate rights to any data you upload.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              The Barkbase platform, including its code, design, logos, and content, is owned by Barkbase and protected by intellectual property laws. Your subscription grants you a limited, non-exclusive license to use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Service Availability</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance when possible. We are not liable for downtime caused by factors outside our control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              To the maximum extent permitted by law, Barkbase shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              You agree to indemnify and hold harmless Barkbase and its employees from any claims, damages, or expenses arising from your use of the service or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Either party may terminate this agreement at any time. Upon termination, your access to the platform will be disabled. You may export your data for 30 days following termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              These terms are governed by the laws of the State of Texas. Any disputes shall be resolved in the courts of Travis County, Texas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact</h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              For questions about these terms, contact us at legal@barkbase.com.
            </p>
          </section>
        </div>
      </div>
    </section>
  </PublicPageLayout>
);

export default Terms;
