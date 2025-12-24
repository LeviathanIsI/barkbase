/**
 * EmailConnectionModal - Multi-step flow for connecting external email accounts
 *
 * Steps:
 * 1. Enter email address
 * 2. Provider recommendation (auto-detect from domain)
 * 3. Manual provider selection (if unknown or user wants to choose)
 */

import { useState, useEffect } from 'react';
import { X, Mail, ChevronRight, ArrowLeft, Check, HelpCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

// Provider detection based on email domain
const detectProvider = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (['gmail.com', 'googlemail.com'].includes(domain)) return 'google';
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'microsoft';
  return 'unknown';
};

// Provider info
const PROVIDERS = {
  google: {
    name: 'Gmail',
    fullName: 'Google',
    color: '#EA4335',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    hoverColor: 'hover:border-red-400 dark:hover:border-red-600',
  },
  microsoft: {
    name: 'Outlook',
    fullName: 'Microsoft',
    color: '#0078D4',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    hoverColor: 'hover:border-blue-400 dark:hover:border-blue-600',
  },
  exchange: {
    name: 'Exchange',
    fullName: 'Microsoft Exchange',
    color: '#0078D4',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    hoverColor: 'hover:border-blue-400 dark:hover:border-blue-600',
  },
};

// Simple email icon components (brand-colored)
const GmailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M22 6L12 13L2 6V4L12 11L22 4V6Z" fill="#EA4335"/>
    <path d="M22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6" stroke="#EA4335" strokeWidth="2" fill="none"/>
    <path d="M2 6L12 13L22 6" stroke="#EA4335" strokeWidth="2" fill="none"/>
  </svg>
);

const OutlookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="#0078D4" strokeWidth="2" fill="none"/>
    <path d="M2 8L12 14L22 8" stroke="#0078D4" strokeWidth="2"/>
  </svg>
);

const ExchangeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0078D4" strokeWidth="2" fill="none"/>
    <path d="M3 9L12 14L21 9" stroke="#0078D4" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="#0078D4" strokeWidth="1.5" fill="none"/>
  </svg>
);

const ProviderIcon = ({ provider, className = "w-8 h-8" }) => {
  switch (provider) {
    case 'google':
      return <GmailIcon className={className} />;
    case 'microsoft':
      return <OutlookIcon className={className} />;
    case 'exchange':
      return <ExchangeIcon className={className} />;
    default:
      return <Mail className={className} />;
  }
};

const EmailConnectionModal = ({ isOpen, onClose, onConnect }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [detectedProvider, setDetectedProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setDetectedProvider(null);
      setIsConnecting(false);
    }
  }, [isOpen]);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailSubmit = () => {
    if (!isValidEmail(email)) return;
    const provider = detectProvider(email);
    setDetectedProvider(provider);
    setStep(provider === 'unknown' ? 3 : 2);
  };

  const handleProviderConnect = async (provider) => {
    setIsConnecting(true);

    const providerName = PROVIDERS[provider]?.name || provider;

    // Only Google is supported via OAuth for now
    if (provider === 'google') {
      try {
        // Call the OAuth start endpoint to get the authorization URL
        const response = await apiClient.get('/api/v1/auth/oauth/google/start');
        const { authUrl } = response.data;

        if (authUrl) {
          // Redirect to Google OAuth - callback will handle the rest
          window.location.href = authUrl;
          return;
        } else {
          throw new Error('No authorization URL received');
        }
      } catch (error) {
        console.error('[EmailConnection] OAuth start failed:', error);
        setIsConnecting(false);
        toast.error(error.response?.data?.message || 'Failed to start Gmail connection');
        return;
      }
    }

    // Microsoft and Exchange not yet implemented
    toast.success(`${providerName} integration coming soon`);
    setIsConnecting(false);
    onClose();
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(detectedProvider === 'unknown' ? 1 : 2);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-surface-primary rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleBack}
                className="-ml-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <h2 className="text-lg font-semibold text-text">
              {step === 1 && 'Set up your email account'}
              {step === 2 && 'Connect your email'}
              {step === 3 && 'Choose your email provider'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Enter Email */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Enter your address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="text"
                    readOnly
                    onFocus={(e) => e.target.removeAttribute('readOnly')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    placeholder="yours@example.com"
                    className="w-full pl-10 pr-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    autoFocus
                    autoComplete="off-xyz"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                </div>
              </div>
              <Button
                onClick={handleEmailSubmit}
                disabled={!isValidEmail(email)}
                className="w-full"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Provider Recommendation */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Email pill */}
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-lg w-fit">
                <Mail className="w-4 h-4 text-muted" />
                <span className="text-sm text-text">{email}</span>
              </div>

              {/* Provider recommendation */}
              <div className="p-4 bg-surface-secondary rounded-lg">
                <div className="flex items-start gap-3">
                  <ProviderIcon provider={detectedProvider} className="w-10 h-10 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-text">
                      Your email is hosted by <strong>{PROVIDERS[detectedProvider]?.fullName}</strong>.
                      We recommend connecting to {PROVIDERS[detectedProvider]?.name}.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleProviderConnect(detectedProvider)}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  'Connecting...'
                ) : (
                  <>
                    Connect to {PROVIDERS[detectedProvider]?.name}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <Button
                variant="link"
                size="sm"
                onClick={() => setStep(3)}
                className="w-full"
              >
                I want to choose my email provider myself
              </Button>
            </div>
          )}

          {/* Step 3: Manual Provider Selection */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Email pill if we have one */}
              {email && (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-lg w-fit">
                  <Mail className="w-4 h-4 text-muted" />
                  <span className="text-sm text-text">{email}</span>
                </div>
              )}

              {/* Provider cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'google', label: 'Gmail' },
                  { id: 'microsoft', label: 'Outlook' },
                  { id: 'exchange', label: 'Exchange' },
                ].map((provider) => (
                  <Button
                    key={provider.id}
                    variant="outline"
                    onClick={() => handleProviderConnect(provider.id)}
                    disabled={isConnecting}
                    className={`
                      flex flex-col items-center gap-2 p-4 h-auto border-2
                      ${PROVIDERS[provider.id].bgColor}
                      ${PROVIDERS[provider.id].borderColor}
                      ${PROVIDERS[provider.id].hoverColor}
                      hover:shadow-md
                    `}
                  >
                    <ProviderIcon provider={provider.id} className="w-10 h-10" />
                    <span className="text-sm font-medium text-text">{provider.label}</span>
                  </Button>
                ))}
              </div>

              <Button
                variant="link"
                size="sm"
                onClick={() => toast('Google = Gmail or Google Workspace\nMicrosoft = Outlook.com, Hotmail, Live\nExchange = Corporate Microsoft servers', { duration: 5000 })}
                className="mx-auto"
                leftIcon={<HelpCircle className="w-4 h-4" />}
              >
                Not sure which to choose?
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailConnectionModal;
