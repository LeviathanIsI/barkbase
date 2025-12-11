/**
 * About Page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Target, Users, Award, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const values = [
  {
    icon: Heart,
    title: 'Pet-First Approach',
    description: 'Everything we build starts with the well-being of pets in mind. We believe happy pets make happy businesses.',
  },
  {
    icon: Target,
    title: 'Simplicity',
    description: 'Powerful software doesn\'t have to be complicated. We focus on intuitive design that gets out of your way.',
  },
  {
    icon: Users,
    title: 'Customer Success',
    description: 'Your success is our success. We\'re committed to helping you grow your business every step of the way.',
  },
  {
    icon: Award,
    title: 'Excellence',
    description: 'We hold ourselves to the highest standards in security, reliability, and customer service.',
  },
];


const About = () => (
  <PublicPageLayout>
    {/* Hero */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <Badge variant="accent" className="mb-6">About Us</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
          Building the future of pet care management
        </h1>
        <p className="max-w-3xl mx-auto text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
          We started Barkbase because we saw pet care professionals struggling with outdated, clunky software.
          Our mission is to give every boarding facility, daycare, and groomer the tools they need to provide
          exceptional care while growing their business.
        </p>
      </div>
    </section>

    {/* Our Story */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
          Our Story
        </h2>
        <div className="space-y-6 text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
          <p>
            Barkbase was born from a simple observation: pet care professionals deserve better software. Our founders,
            having worked with dozens of boarding facilities, saw firsthand how outdated systems were holding businesses back.
          </p>
          <p>
            Paper booking logs, scattered spreadsheets, and frustrating software weren't just inconvenient—they were
            preventing passionate pet care professionals from focusing on what they do best: caring for animals.
          </p>
          <p>
            We also noticed something else: most software forces you to pick a lane. Buy the boarding module. Add grooming
            for an extra fee. Want training management? That's another subscription. It's exhausting—and it doesn't reflect
            how real pet care businesses actually work. Most facilities don't fit neatly into one box.
          </p>
          <p>
            So we built Barkbase differently. One platform. One price. Whether you run a boarding kennel, doggy daycare,
            grooming salon, training center—or all of the above—you get the complete toolkit. No nickel-and-diming. No
            feature gatekeeping. Just everything you need to run your business, right out of the box.
          </p>
          <p>
            We're still early in our journey, but we're building something we believe in—and we'd love for you to be part of it.
          </p>
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
          Our Values
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value) => (
            <div key={value.title} className="text-center">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
              >
                <value.icon className="h-7 w-7" style={{ color: 'var(--bb-color-accent)' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                {value.title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Ready to try Barkbase?
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
          Start free with up to 20 kennels. No credit card required. No forced payment processors.
        </p>
        <Link to="/register">
          <Button variant="primary" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Start Free — No Card Required
          </Button>
        </Link>
      </div>
    </section>
  </PublicPageLayout>
);

export default About;
