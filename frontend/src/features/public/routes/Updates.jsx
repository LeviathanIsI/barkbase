/**
 * Updates/Changelog Page - Coming Soon
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const Updates = () => (
  <PublicPageLayout>
    <section className="py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
        >
          <Sparkles className="h-10 w-10" style={{ color: 'var(--bb-color-accent)' }} />
        </div>

        <Badge variant="accent" className="mb-6">Coming Soon</Badge>

        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
          Product Updates
        </h1>

        <p className="text-lg mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
          We're actively building and improving Barkbase. Once we launch, you'll find our changelog
          and product updates here. Stay tuned!
        </p>

        <Link to="/">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Back to Home
          </Button>
        </Link>
      </div>
    </section>
  </PublicPageLayout>
);

export default Updates;
