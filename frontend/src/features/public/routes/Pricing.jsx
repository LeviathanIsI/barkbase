/**
 * Pricing Page - Detailed pricing plans
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, HelpCircle, Zap, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PublicPageLayout from '../components/PublicPageLayout';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 0, yearly: 0 },
    description: 'A generous free tier to run your business. No tricks.',
    features: {
      'Kennels/Runs': 'Up to 20',
      'Users': '1',
      'Bookings': 'Unlimited',
      'Pet & owner profiles': true,
      'Booking calendar': true,
      'Check-in/check-out': true,
      'Basic reports': true,
      'Email support': true,
      'SMS notifications': false,
      'Advanced analytics': false,
      'Custom branding': false,
      'API access': false,
      'Priority support': false,
      'Multi-location': false,
    },
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Professional',
    price: { monthly: 89, yearly: 71 },
    description: 'For growing businesses ready to scale',
    features: {
      'Kennels/Runs': 'Unlimited',
      'Users': 'Up to 10',
      'Bookings': 'Unlimited',
      'Pet & owner profiles': true,
      'Booking calendar': true,
      'Check-in/check-out': true,
      'Basic reports': true,
      'Email support': true,
      'SMS notifications': true,
      'Advanced analytics': true,
      'Custom branding': true,
      'API access': false,
      'Priority support': true,
      'Multi-location': false,
    },
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: 199, yearly: 159 },
    description: 'For multi-location businesses with advanced needs',
    features: {
      'Kennels/Runs': 'Unlimited',
      'Users': 'Unlimited',
      'Bookings': 'Unlimited',
      'Pet & owner profiles': true,
      'Booking calendar': true,
      'Check-in/check-out': true,
      'Basic reports': true,
      'Email support': true,
      'SMS notifications': true,
      'Advanced analytics': true,
      'Custom branding': true,
      'API access': true,
      'Priority support': true,
      'Multi-location': true,
    },
    cta: 'Contact Us',
    popular: false,
  },
];

const faqs = [
  {
    question: 'Is the free tier really free?',
    answer: 'Yes! Our Starter plan is free forever with no credit card required. You get up to 20 kennels, unlimited bookings, and full access to core features. No trial period, no hidden catches.',
  },
  {
    question: 'How does Barkbase compare to other software?',
    answer: 'Most kennel software starts at $70-150/month with no free option. We\'re the only platform with a generous free tier, and our paid plans still undercut competitors like Gingr ($105-155), PetExec ($105), and Kennel Connection ($149-199).',
  },
  {
    question: 'Do you charge per-user fees?',
    answer: 'No. Unlike many competitors, we don\'t nickel-and-dime you with per-user fees. Professional includes up to 10 users, Enterprise is unlimited.',
  },
  {
    question: 'Do you force me to use a specific payment processor?',
    answer: 'No. You choose your own payment processor. We don\'t lock you into a specific provider or take a cut of your transactions.',
  },
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes. Upgrade instantly when you need more features, or downgrade if your needs change. We prorate billing automatically.',
  },
  {
    question: 'What happens when I hit free tier limits?',
    answer: 'You\'ll see a friendly prompt to upgrade. We won\'t suddenly lock you out or delete your data. Your business keeps running.',
  },
];

// BarkBase tiers table data
const tierData = [
  { feature: 'Price', free: '$0/mo', pro: '$89/mo', enterprise: '$199/mo' },
  { feature: 'Staff', free: '1', pro: '10', enterprise: 'Unlimited' },
  { feature: 'SMS', free: 'x', pro: 'check', enterprise: 'check' },
  { feature: 'Multi-Location', free: 'x', pro: 'x', enterprise: 'check' },
  { feature: 'API Access', free: 'x', pro: 'x', enterprise: 'check' },
];

// Why BarkBase comparison data
const competitorData = [
  { feature: 'Free Tier', barkbase: 'check', gingr: 'x', propet: 'x', kc: 'x' },
  { feature: 'SMS Included', barkbase: 'Pro+', barkbaseIcon: 'check', gingr: '+$Extra', propet: '+$Extra', kc: '+$50/mo' },
  { feature: 'Processor Choice', barkbase: 'check', gingr: 'Penalized', gingrIcon: 'warn', propet: 'check', kc: 'check' },
  { feature: 'Starting Price', barkbase: '$0', gingr: '$105', propet: '$70', kc: '$89' },
];

// Helper to render cell with icon
const TableCell = ({ value }) => {
  if (value === 'check') {
    return <Check className="h-5 w-5 mx-auto" style={{ color: 'var(--bb-color-status-positive)' }} />;
  }
  if (value === 'x') {
    return <X className="h-5 w-5 mx-auto" style={{ color: 'var(--bb-color-status-negative)' }} />;
  }
  return <span style={{ color: 'var(--bb-color-text-primary)' }}>{value}</span>;
};

const CompetitorCell = ({ value, icon }) => {
  if (value === 'check') {
    return <Check className="h-5 w-5 mx-auto" style={{ color: 'var(--bb-color-status-positive)' }} />;
  }
  if (value === 'x') {
    return <X className="h-5 w-5 mx-auto" style={{ color: 'var(--bb-color-status-negative)' }} />;
  }
  if (icon === 'check') {
    return (
      <span className="inline-flex items-center gap-1.5 justify-center">
        <Check className="h-4 w-4" style={{ color: 'var(--bb-color-status-positive)' }} />
        <span style={{ color: 'var(--bb-color-text-muted)' }}>{value}</span>
      </span>
    );
  }
  if (icon === 'warn') {
    return (
      <span className="inline-flex items-center gap-1.5 justify-center">
        <AlertTriangle className="h-4 w-4" style={{ color: 'var(--bb-color-status-warning)' }} />
        <span style={{ color: 'var(--bb-color-text-muted)' }}>{value}</span>
      </span>
    );
  }
  return <span style={{ color: 'var(--bb-color-text-muted)' }}>{value}</span>;
};

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <PublicPageLayout>
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="accent" className="mb-6">Pricing</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
            The only kennel software with a real free tier
          </h1>
          <p className="max-w-2xl mx-auto text-lg mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
            Start free forever. When you're ready to grow, we're still cheaper than everyone else.
          </p>
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No credit card required • No forced payment processors • No per-user fees
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8 mb-4">
            <span className={`text-sm font-medium ${!isYearly ? 'text-[var(--bb-color-text-primary)]' : 'text-[var(--bb-color-text-muted)]'}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-7 rounded-full transition-colors"
              style={{ backgroundColor: isYearly ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)' }}
            >
              <span
                className="absolute top-1 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: isYearly ? '2rem' : '0.25rem' }}
              />
            </button>
            <span className={`text-sm font-medium ${isYearly ? 'text-[var(--bb-color-text-primary)]' : 'text-[var(--bb-color-text-muted)]'}`}>
              Yearly
            </span>
            {isYearly && (
              <Badge variant="success" size="sm">Save 20%</Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl border relative ${plan.popular ? 'ring-2 ring-[var(--bb-color-accent)]' : ''}`}
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: plan.popular ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
                }}
              >
                {plan.popular && (
                  <Badge variant="accent" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-5xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>
                      ${isYearly ? plan.price.yearly : plan.price.monthly}
                    </span>
                    {plan.price.monthly > 0 && (
                      <span style={{ color: 'var(--bb-color-text-muted)' }}>/month</span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {Object.entries(plan.features).map(([feature, value]) => (
                    <li key={feature} className="flex items-center gap-3">
                      {value === true ? (
                        <Check className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--bb-color-status-positive)' }} />
                      ) : value === false ? (
                        <X className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }} />
                      ) : (
                        <Check className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--bb-color-status-positive)' }} />
                      )}
                      <span style={{ color: value === false ? 'var(--bb-color-text-muted)' : 'var(--bb-color-text-primary)' }}>
                        {feature}{typeof value === 'string' ? `: ${value}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.name === 'Enterprise' ? '/contact' : '/register'}>
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plan Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Compare Plans
            </h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              See what's included at each tier
            </p>
          </div>

          <div
            className="overflow-x-auto rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bb-color-border-subtle)' }}>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}></th>
                  <th className="text-center p-4 font-semibold" style={{ color: 'var(--bb-color-accent)' }}>Free</th>
                  <th className="text-center p-4 font-semibold" style={{ color: 'var(--bb-color-accent)' }}>Pro</th>
                  <th className="text-center p-4 font-semibold" style={{ color: 'var(--bb-color-accent)' }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {tierData.map((row, index) => (
                  <tr
                    key={row.feature}
                    style={{ borderBottom: index < tierData.length - 1 ? '1px solid var(--bb-color-border-subtle)' : 'none' }}
                  >
                    <td className="p-4 font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>{row.feature}</td>
                    <td className="p-4 text-center"><TableCell value={row.free} /></td>
                    <td className="p-4 text-center"><TableCell value={row.pro} /></td>
                    <td className="p-4 text-center"><TableCell value={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why BarkBase Competitor Comparison */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Why BarkBase
            </h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              See how we stack up against other kennel software
            </p>
          </div>

          <div
            className="overflow-x-auto rounded-xl border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bb-color-border-subtle)' }}>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}></th>
                  <th className="text-center p-4 font-semibold" style={{ color: 'var(--bb-color-accent)' }}>BarkBase</th>
                  <th className="text-center p-4 font-semibold" style={{ color: 'var(--bb-color-text-muted)' }}>Gingr</th>
                  <th className="text-center p-4 font-semibold" style={{ color: 'var(--bb-color-text-muted)' }}>ProPet</th>
                  <th className="text-center p-4 font-semibold" style={{ color: 'var(--bb-color-text-muted)' }}>Kennel Connection</th>
                </tr>
              </thead>
              <tbody>
                {competitorData.map((row, index) => (
                  <tr
                    key={row.feature}
                    style={{ borderBottom: index < competitorData.length - 1 ? '1px solid var(--bb-color-border-subtle)' : 'none' }}
                  >
                    <td className="p-4 font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>{row.feature}</td>
                    <td className="p-4 text-center">
                      <CompetitorCell value={row.barkbase} icon={row.barkbaseIcon} />
                    </td>
                    <td className="p-4 text-center">
                      <CompetitorCell value={row.gingr} icon={row.gingrIcon} />
                    </td>
                    <td className="p-4 text-center">
                      <CompetitorCell value={row.propet} icon={row.propetIcon} />
                    </td>
                    <td className="p-4 text-center">
                      <CompetitorCell value={row.kc} icon={row.kcIcon} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Upgrade Triggers */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Zap className="h-10 w-10 mx-auto mb-4" style={{ color: 'var(--bb-color-accent)' }} />
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
              Grow at your own pace
            </h2>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              The free tier handles most small businesses. Upgrade when you naturally need more.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div
              className="p-6 rounded-xl border text-center"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>More Staff?</div>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                Free = 1 user<br />
                Pro = 10 users<br />
                Enterprise = Unlimited
              </p>
            </div>
            <div
              className="p-6 rounded-xl border text-center"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>More Kennels?</div>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                Free = 20 kennels<br />
                Pro = Unlimited<br />
                Enterprise = Unlimited
              </p>
            </div>
            <div
              className="p-6 rounded-xl border text-center"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>Need SMS?</div>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                Free = Email only<br />
                Pro = SMS included<br />
                Enterprise = SMS included
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'var(--bb-color-text-primary)' }}>
            Frequently asked questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-semibold mb-2 flex items-start gap-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                  <HelpCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--bb-color-accent)' }} />
                  {faq.question}
                </h3>
                <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
            Ready to get started?
          </h2>
          <p className="text-lg mb-8" style={{ color: 'var(--bb-color-text-muted)' }}>
            Join the only kennel software that lets you start free and grow without getting nickel-and-dimed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" size="lg">Start Free — No Card Required</Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg">Talk to Us</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default Pricing;
