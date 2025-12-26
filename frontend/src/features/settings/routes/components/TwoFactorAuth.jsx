import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Smartphone, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

const TwoFactorAuth = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  // MFA status
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);

  // Setup state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [setupData, setSetupData] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Disable state
  const [isDisabling, setIsDisabling] = useState(false);

  // Fetch MFA status on mount
  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const fetchMfaStatus = async () => {
    setIsLoading(true);
    setStatusError(null);
    try {
      const response = await apiClient.get('/api/v1/auth/mfa');
      setMfaEnabled(response.data?.enabled || false);
    } catch (error) {
      console.error('[2FA] Failed to fetch MFA status:', error);
      setStatusError(error.message || 'Failed to check 2FA status');
      // Default to disabled on error
      setMfaEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setShowSetupModal(true);
    setSetupStep(1);
    setSetupData(null);
    setVerificationCode('');
    setVerifyError('');
  };

  const handleStartSetup = async () => {
    setIsSettingUp(true);
    setVerifyError('');
    try {
      const response = await apiClient.post('/api/v1/auth/mfa/setup');
      setSetupData({
        secretCode: response.data.secretCode,
        otpauthUri: response.data.otpauthUri,
      });
      setSetupStep(2);
    } catch (error) {
      console.error('[2FA] Setup failed:', error);
      toast.error(error.response?.data?.message || 'Failed to start 2FA setup');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setVerifyError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');
    try {
      await apiClient.post('/api/v1/auth/mfa/verify', { code: verificationCode });
      setMfaEnabled(true);
      setShowSetupModal(false);
      setSetupStep(1);
      setSetupData(null);
      setVerificationCode('');
      toast.success('Two-factor authentication enabled!');
    } catch (error) {
      console.error('[2FA] Verification failed:', error);
      setVerifyError(error.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    setIsDisabling(true);
    try {
      await apiClient.delete('/api/v1/auth/mfa');
      setMfaEnabled(false);
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      console.error('[2FA] Disable failed:', error);
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleCloseModal = () => {
    setShowSetupModal(false);
    setSetupStep(1);
    setSetupData(null);
    setVerificationCode('');
    setVerifyError('');
  };

  // Format secret for display (groups of 4 characters)
  const formatSecret = (secret) => {
    if (!secret) return '';
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  };

  if (isLoading) {
    return (
      <Card title="Two-Factor Authentication (2FA)" icon={Shield}>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted">Checking 2FA status...</span>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="Two-Factor Authentication (2FA)" icon={Shield}>
        <div className="space-y-4">
          {statusError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{statusError}</p>
            </div>
          )}

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
              <Badge variant={mfaEnabled ? 'success' : 'error'} className="mb-2">
                {mfaEnabled ? 'Enabled' : 'Not Enabled'}
              </Badge>
              {!mfaEnabled ? (
                <Button onClick={handleEnable2FA}>
                  Enable Two-Factor Authentication
                </Button>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 dark:text-text-secondary mb-1">Method: Authenticator App</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisable2FA}
                    disabled={isDisabling}
                  >
                    {isDisabling ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      'Disable 2FA'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {mfaEnabled && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900 dark:text-green-100">Two-Factor Authentication Active</h4>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your account is protected with an authenticator app. You'll need to enter a code from your app when signing in.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* 2FA Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md relative">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-surface-border">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
                {setupStep === 1 ? 'Set Up Two-Factor Authentication' : 'Scan QR Code'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary rounded-full text-gray-500"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {setupStep === 1 ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                    <Smartphone className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-text-primary">Authenticator App</h3>
                      <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
                        Use Google Authenticator, Authy, 1Password, or any TOTP-compatible app.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-text-tertiary mt-2">
                        Works offline • Most secure option
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-text-secondary">
                    You'll need to scan a QR code with your authenticator app and enter a verification code to complete setup.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    {/* QR Code */}
                    {setupData?.otpauthUri && (
                      <div className="inline-block p-4 bg-white rounded-lg border border-gray-200 mb-4">
                        <QRCodeSVG
                          value={setupData.otpauthUri}
                          size={180}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">
                      1. Open your authenticator app
                    </p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">
                      2. Scan the QR code above
                    </p>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
                      3. Enter the 6-digit code from your app
                    </p>

                    {/* Manual Entry */}
                    {setupData?.secretCode && (
                      <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded p-3 mb-4">
                        <p className="text-xs text-gray-600 dark:text-text-secondary mb-1">Or enter this code manually:</p>
                        <p className="font-mono text-sm bg-white dark:bg-surface-primary px-2 py-1 rounded border select-all">
                          {formatSecret(setupData.secretCode)}
                        </p>
                      </div>
                    )}

                    {/* Verification Code Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                        Enter 6-digit code from your app:
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={verificationCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setVerificationCode(value);
                          setVerifyError('');
                        }}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg font-mono tracking-widest"
                        autoFocus
                      />
                      {verifyError && (
                        <p className="mt-2 text-sm text-red-600">{verifyError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
              <Button
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              {setupStep === 1 ? (
                <Button
                  onClick={handleStartSetup}
                  disabled={isSettingUp}
                >
                  {isSettingUp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleVerifyCode}
                  disabled={isVerifying || verificationCode.length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Enable'
                  )}
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
