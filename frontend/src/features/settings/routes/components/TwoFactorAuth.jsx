import { useState } from 'react';
import { Shield, Smartphone, Mail, QrCode, Key, AlertTriangle, CheckCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth';

const TwoFactorAuth = () => {
  const user = useAuthStore((state) => state.user);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const methods = [
    {
      id: 'authenticator',
      name: 'Authenticator App',
      description: 'Use Google Authenticator, Authy, or 1Password',
      details: 'Works offline, most secure',
      icon: Smartphone,
      recommended: true
    },
    {
      id: 'sms',
      name: 'SMS Text Message',
      description: 'Get codes via text to (555) 123-4567',
      details: 'Requires cell signal',
      icon: Smartphone,
    },
    {
      id: 'email',
      name: 'Email',
      description: `Get codes via email to ${user?.email || 'your email'}`,
      details: 'Least secure, but better than nothing',
      icon: Mail,
    }
  ];

  const backupCodes = [
    '1234-5678', '2345-6789', '3456-7890',
    '4567-8901', '5678-9012'
  ];

  const handleEnable2FA = () => {
    setShowSetupModal(true);
    setSetupStep(1);
  };

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    setSetupStep(2);
  };

  const handleVerifyCode = () => {
    // Mock verification
    setTwoFactorEnabled(true);
    setShowSetupModal(false);
    setSetupStep(1);
    setSelectedMethod('');
    setVerificationCode('');
  };

  const handleDisable2FA = () => {
    setTwoFactorEnabled(false);
  };

  return (
    <>
      <Card title="Two-Factor Authentication (2FA)" icon={Shield}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-text-secondary mb-1">Add an extra layer of security to your account</p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-text-secondary">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span>Why enable 2FA?</span>
              </div>
              <ul className="text-sm text-gray-600 dark:text-text-secondary mt-1 space-y-1 ml-6">
                <li>• Protects against password theft</li>
                <li>• Required for PCI compliance (if processing payments)</li>
                <li>• Industry best practice for business accounts</li>
              </ul>
            </div>
            <div className="text-right">
              <Badge variant={twoFactorEnabled ? 'success' : 'error'} className="mb-2">
                {twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
              </Badge>
              {!twoFactorEnabled ? (
                <Button onClick={handleEnable2FA}>
                  Enable Two-Factor Authentication
                </Button>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 dark:text-text-secondary mb-1">Method: Authenticator App</p>
                  <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">Enabled: Jan 15, 2025</p>
                  <Button variant="outline" size="sm" onClick={handleDisable2FA}>
                    Disable 2FA
                  </Button>
                </div>
              )}
            </div>
          </div>

          {twoFactorEnabled && (
            <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Backup Codes</h4>
              <p className="text-sm text-green-800 mb-3">
                Use these codes if you lose access to your authenticator app.
                Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                {backupCodes.map((code, index) => (
                  <div key={index} className="bg-white dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded px-2 py-1 text-center text-sm font-mono">
                    {code}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm">
                Download Backup Codes
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* 2FA Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-surface-border">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
                {setupStep === 1 ? 'Set Up Two-Factor Authentication' : 'Scan QR Code'}
              </h2>
              <button
                onClick={() => setShowSetupModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {setupStep === 1 ? (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4">Step 1: Choose Your Method</h3>

                  {methods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => handleMethodSelect(method.id)}
                        className="w-full p-4 border border-gray-200 dark:border-surface-border rounded-lg hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 text-gray-600 dark:text-text-secondary mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-text-primary">{method.name}</span>
                              {method.recommended && (
                                <Badge variant="primary" className="text-xs">Recommended</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-text-secondary mb-1">{method.description}</p>
                            <p className="text-xs text-gray-500 dark:text-text-secondary">{method.details}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4">Step 2: Scan QR Code</h3>

                    {/* Mock QR Code */}
                    <div className="bg-gray-100 dark:bg-surface-secondary border-2 border-dashed border-gray-300 dark:border-surface-border rounded-lg p-8 mx-auto w-48 h-48 flex items-center justify-center mb-4">
                      <QrCode className="w-24 h-24 text-gray-400 dark:text-text-tertiary" />
                    </div>

                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">
                      1. Download authenticator app (Google Authenticator, Authy)
                    </p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">
                      2. Scan the QR code above with your app
                    </p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                      3. Enter the 6-digit code from your app
                    </p>

                    <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded p-3 mb-4">
                      <p className="text-xs text-gray-600 dark:text-text-secondary mb-1">Or enter this code manually:</p>
                      <p className="font-mono text-sm bg-white dark:bg-surface-primary px-2 py-1 rounded border">
                        JBSW Y3DP EHPK 3PXP
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                        Enter 6-digit code from your app:
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        maxLength="6"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
              <Button
                variant="outline"
                onClick={() => setShowSetupModal(false)}
              >
                Cancel
              </Button>
              {setupStep === 2 && (
                <Button
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6}
                >
                  Verify & Enable
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TwoFactorAuth;
