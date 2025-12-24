/**
 * Contact Page
 */

import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import PublicPageLayout from '../components/PublicPageLayout';

const faqs = [
  { question: 'How do I reset my password?', answer: 'Click "Forgot Password" on the login page.' },
  { question: 'Can I import my existing data?', answer: 'Contact us and we can help with data migration.' },
  { question: 'Is there a free trial?', answer: 'Yes! You can try Barkbase free with no credit card required.' },
  { question: 'How do I cancel my account?', answer: 'You can cancel anytime from your account settings.' },
];

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'general',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear status when user starts editing
    if (submitStatus) {
      setSubmitStatus(null);
      setSubmitMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitStatus('success');
        setSubmitMessage(data.message || 'Thank you for your message! We\'ll get back to you soon.');
        // Reset form on success
        setFormData({
          name: '',
          email: '',
          company: '',
          subject: 'general',
          message: '',
        });
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
      setSubmitMessage('Failed to send message. Please try again or email us directly at hello@barkbase.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicPageLayout>
      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="accent" className="mb-6">Contact</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
            Get in touch
          </h1>
          <p className="max-w-2xl mx-auto text-lg" style={{ color: 'var(--bb-color-text-muted)' }}>
            Have questions about Barkbase? We'd love to hear from you. Send us a message and we'll respond as soon as we can.
          </p>
        </div>
      </section>

      {/* Email Contact */}
      <section className="pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div
            className="p-6 rounded-xl border text-center"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <Mail className="h-8 w-8 mx-auto mb-4" style={{ color: 'var(--bb-color-accent)' }} />
            <h3 className="font-semibold mb-1" style={{ color: 'var(--bb-color-text-primary)' }}>Email Us</h3>
            <a
              href="mailto:hello@barkbase.com"
              className="font-medium hover:underline"
              style={{ color: 'var(--bb-color-accent)' }}
            >
              hello@barkbase.com
            </a>
            <p className="text-sm mt-2" style={{ color: 'var(--bb-color-text-muted)' }}>
              We typically respond within 24-48 hours
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & FAQ */}
      <section className="py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <div
              className="p-8 rounded-xl border"
              style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
                Send us a message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Success/Error Messages */}
                {submitStatus && (
                  <div
                    className={`p-4 rounded-lg flex items-start gap-3 ${
                      submitStatus === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    {submitStatus === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm ${
                      submitStatus === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                      {submitMessage}
                    </p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 rounded-lg border text-[var(--bb-color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bb-color-bg-base)', borderColor: 'var(--bb-color-border-subtle)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 rounded-lg border text-[var(--bb-color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--bb-color-bg-base)', borderColor: 'var(--bb-color-border-subtle)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                    Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-lg border text-[var(--bb-color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--bb-color-bg-base)', borderColor: 'var(--bb-color-border-subtle)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                    Subject
                  </label>
                  <StyledSelect
                    options={[
                      { value: 'general', label: 'General Inquiry' },
                      { value: 'demo', label: 'Request a Demo' },
                      { value: 'support', label: 'Support Question' },
                      { value: 'feedback', label: 'Feedback' },
                    ]}
                    value={formData.subject}
                    onChange={(opt) => setFormData({ ...formData, subject: opt?.value || 'general' })}
                    isDisabled={isSubmitting}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border text-[var(--bb-color-text-primary)] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--bb-color-bg-base)', borderColor: 'var(--bb-color-border-subtle)' }}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                  rightIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--bb-color-text-primary)' }}>
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="p-6 rounded-xl border"
                    style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
                  >
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--bb-color-text-primary)' }}>
                      {faq.question}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default Contact;
