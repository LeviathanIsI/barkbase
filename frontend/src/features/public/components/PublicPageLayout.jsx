/**
 * PublicPageLayout - Shared layout for public-facing pages
 * Includes navigation and footer consistent with landing page
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Button from '@/components/ui/Button';

// Navigation Component (shared with Home)
export const PublicNavigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b" style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bb-color-accent)' }}>
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>Barkbase</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium transition-colors hover:text-[var(--bb-color-accent)]"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">Get Started Free</Button>
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium px-2 py-1"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="w-full">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" className="w-full">Get Started Free</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// Footer Component (shared with Home)
export const PublicFooter = () => (
  <footer className="border-t py-12 px-4 sm:px-6 lg:px-8" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bb-color-accent)' }}>
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--bb-color-text-primary)' }}>Barkbase</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            The all-in-one platform for pet boarding success.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3" style={{ color: 'var(--bb-color-text-primary)' }}>Product</h4>
          <ul className="space-y-2">
            {[
              { name: 'Features', href: '/features' },
              { name: 'Pricing', href: '/pricing' },
              { name: 'Integrations', href: '/integrations' },
              { name: 'Updates', href: '/updates' },
            ].map((item) => (
              <li key={item.name}>
                <Link to={item.href} className="text-sm hover:underline" style={{ color: 'var(--bb-color-text-muted)' }}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3" style={{ color: 'var(--bb-color-text-primary)' }}>Company</h4>
          <ul className="space-y-2">
            {[
              { name: 'About', href: '/about' },
              { name: 'Blog', href: '/blog' },
              { name: 'Careers', href: '/careers' },
              { name: 'Contact', href: '/contact' },
            ].map((item) => (
              <li key={item.name}>
                <Link to={item.href} className="text-sm hover:underline" style={{ color: 'var(--bb-color-text-muted)' }}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3" style={{ color: 'var(--bb-color-text-primary)' }}>Legal</h4>
          <ul className="space-y-2">
            {[
              { name: 'Privacy', href: '/privacy' },
              { name: 'Terms', href: '/terms' },
              { name: 'Security', href: '/security' },
              { name: 'Compliance', href: '/compliance' },
            ].map((item) => (
              <li key={item.name}>
                <Link to={item.href} className="text-sm hover:underline" style={{ color: 'var(--bb-color-text-muted)' }}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="pt-8 border-t text-center" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
          © {new Date().getFullYear()} Barkbase. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

// Main Layout Wrapper
const PublicPageLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bb-color-bg-base)' }}>
    <PublicNavigation />
    <main className="flex-1 pt-16">
      {children}
    </main>
    <PublicFooter />
  </div>
);

export default PublicPageLayout;
