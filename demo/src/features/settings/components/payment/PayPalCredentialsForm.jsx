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
 * PayPalCredentialsForm - Form for entering PayPal API credentials
 */
const PayPalCredentialsForm = ({
  credentials,
  onChange,
  onTest,
  onConnect,
  isConnected,
  isSandbox,
  onToggleSandbox,
  isTesting,
  isConnecting,
  testError,
  testSuccess,
  existingClientId,
  existingClientSecretMasked,
}) => {
  const [showClientSecret, setShowClientSecret] = useState(false);

  const handleChange = (field, value) => {
    onChange({ ...credentials, [field]: value });
  };

  const isClientIdValid = (id) => {
    if (!id) return null;
    // PayPal client IDs are typically 80+ characters
    return id.length >= 20;
  };

  const isClientSecretValid = (secret) => {
    if (!secret) return null;
    return secret.length >= 20;
  };

  const clientIdValid = isClientIdValid(credentials.clientId);
  const clientSecretValid = isClientSecretValid(credentials.clientSecret);

  const canTest = credentials.clientId && credentials.clientSecret && clientIdValid !== false && clientSecretValid !== false;

  return (
    <div className="space-y-4">
      {/* Help text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-2">
          Where to find your PayPal credentials
        </h4>
        <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
          <li>
            Log in to{' '}
            <a
              href="https://developer.paypal.com/dashboard/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline inline-flex items-center gap-1"
            >
              PayPal Developer Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Go to Apps & Credentials</li>
          <li>Create a new app or select an existing one</li>
          <li>Copy the Client ID and Secret</li>
        </ol>
      </div>

      {/* Sandbox Mode Toggle */}
      <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <div>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Sandbox Mode
            </span>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {isSandbox ? 'Using sandbox credentials (no real charges)' : 'Using live credentials (real charges)'}
            </p>
          </div>
        </div>
        <Switch
          checked={isSandbox}
          onChange={onToggleSandbox}
          disabled={isConnected}
        />
      </div>

      {/* Client ID */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Key className="w-4 h-4 inline mr-1" />
          Client ID
        </label>
        <Input
          type="text"
          value={credentials.clientId}
          onChange={(e) => handleChange('clientId', e.target.value)}
          placeholder="AZDxjDScFp..."
          className={clientIdValid === false ? 'border-red-500' : ''}
        />
        {clientIdValid === false && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Client ID should be at least 20 characters
          </p>
        )}
        {!clientIdValid && existingClientId && (
          <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
            Current: {existingClientId.substring(0, 20)}...
          </p>
        )}
      </div>

      {/* Client Secret */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Key className="w-4 h-4 inline mr-1" />
          Client Secret
        </label>
        <div className="relative">
          <Input
            type={showClientSecret ? 'text' : 'password'}
            value={credentials.clientSecret}
            onChange={(e) => handleChange('clientSecret', e.target.value)}
            placeholder="EBWKjlELxxxxxxxxxxxxxxxxxxxxxxxx"
            className={`pr-10 ${clientSecretValid === false ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowClientSecret(!showClientSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {clientSecretValid === false && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Client Secret should be at least 20 characters
          </p>
        )}
        {!clientSecretValid && existingClientSecretMasked && (
          <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
            Current: {existingClientSecretMasked}
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
            <span>PayPal connection verified successfully!</span>
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
              {isConnected ? 'Update Credentials' : 'Connect PayPal'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PayPalCredentialsForm;
