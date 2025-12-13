import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import {
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckCircle,
  Link as LinkIcon,
} from 'lucide-react';

/**
 * StripeCredentialsForm - Form for entering Stripe API credentials
 */
const StripeCredentialsForm = ({
  credentials,
  onChange,
  onTest,
  onConnect,
  isConnected,
  isTestMode,
  onToggleTestMode,
  isTesting,
  isConnecting,
  testError,
  testSuccess,
  existingPublishableKey,
  existingSecretKeyMasked,
}) => {
  const [showSecretKey, setShowSecretKey] = useState(false);

  const handleChange = (field, value) => {
    onChange({ ...credentials, [field]: value });
  };

  const isKeyValid = (key, type) => {
    if (!key) return null;
    const prefix = isTestMode ? `${type}_test_` : `${type}_live_`;
    return key.startsWith(prefix);
  };

  const publishableValid = isKeyValid(credentials.publishableKey, 'pk');
  const secretValid = isKeyValid(credentials.secretKey, 'sk');

  const canTest = credentials.publishableKey && credentials.secretKey && publishableValid !== false && secretValid !== false;

  return (
    <div className="space-y-4">
      {/* Help text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-2">
          Where to find your API keys
        </h4>
        <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
          <li>
            Log in to your{' '}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline inline-flex items-center gap-1"
            >
              Stripe Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Go to Developers → API Keys</li>
          <li>Copy your Publishable key and Secret key</li>
        </ol>
      </div>

      {/* Test Mode Toggle */}
      <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <div>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Test Mode
            </span>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {isTestMode ? 'Using test credentials (no real charges)' : 'Using live credentials (real charges)'}
            </p>
          </div>
        </div>
        <Switch
          checked={isTestMode}
          onChange={onToggleTestMode}
          disabled={isConnected}
        />
      </div>

      {/* Publishable Key */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Key className="w-4 h-4 inline mr-1" />
          Publishable Key
        </label>
        <Input
          type="text"
          value={credentials.publishableKey}
          onChange={(e) => handleChange('publishableKey', e.target.value)}
          placeholder={isTestMode ? 'pk_test_...' : 'pk_live_...'}
          className={publishableValid === false ? 'border-red-500' : ''}
        />
        {publishableValid === false && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Key should start with {isTestMode ? 'pk_test_' : 'pk_live_'}
          </p>
        )}
        {!publishableValid && existingPublishableKey && (
          <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
            Current: {existingPublishableKey}
          </p>
        )}
      </div>

      {/* Secret Key */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Key className="w-4 h-4 inline mr-1" />
          Secret Key
        </label>
        <div className="relative">
          <Input
            type={showSecretKey ? 'text' : 'password'}
            value={credentials.secretKey}
            onChange={(e) => handleChange('secretKey', e.target.value)}
            placeholder={isTestMode ? 'sk_test_...' : 'sk_live_...'}
            className={`pr-10 ${secretValid === false ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowSecretKey(!showSecretKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {secretValid === false && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Key should start with {isTestMode ? 'sk_test_' : 'sk_live_'}
          </p>
        )}
        {!secretValid && existingSecretKeyMasked && (
          <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
            Current: {existingSecretKeyMasked}
          </p>
        )}
      </div>

      {/* Error message */}
      {testError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{testError}</span>
          </p>
        </div>
      )}

      {/* Success message */}
      {testSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Stripe connection verified successfully!</span>
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onTest}
          disabled={!canTest || isTesting || isConnecting}
          className="flex-1"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Connection'
          )}
        </Button>
        <Button
          onClick={onConnect}
          disabled={!canTest || isTesting || isConnecting}
          className="flex-1"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4 mr-2" />
              {isConnected ? 'Update Keys' : 'Connect Stripe'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default StripeCredentialsForm;
