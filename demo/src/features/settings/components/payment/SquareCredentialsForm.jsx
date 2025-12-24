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
  MapPin,
} from 'lucide-react';

/**
 * SquareCredentialsForm - Form for entering Square API credentials
 */
const SquareCredentialsForm = ({
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
  connectedLocation,
  existingApplicationId,
  existingAccessTokenMasked,
  existingLocationId,
}) => {
  const [showAccessToken, setShowAccessToken] = useState(false);

  const handleChange = (field, value) => {
    onChange({ ...credentials, [field]: value });
  };

  const isAppIdValid = (id) => {
    if (!id) return null;
    // Square app IDs start with sq0 or sandbox-sq0
    return id.startsWith('sq0') || id.startsWith('sandbox-sq0');
  };

  const appIdValid = isAppIdValid(credentials.applicationId);

  const canTest = credentials.applicationId && credentials.accessToken && credentials.locationId && appIdValid !== false;

  return (
    <div className="space-y-4">
      {/* Help text */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <h4 className="font-medium text-green-800 dark:text-green-200 text-sm mb-2">
          Where to find your Square credentials
        </h4>
        <ol className="text-xs text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
          <li>
            Log in to{' '}
            <a
              href="https://developer.squareup.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline inline-flex items-center gap-1"
            >
              Square Developer Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Select your application (or create one)</li>
          <li>Find Application ID, Access Token, and Location ID</li>
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
              {isSandbox ? 'Using sandbox credentials (no real charges)' : 'Using production credentials (real charges)'}
            </p>
          </div>
        </div>
        <Switch
          checked={isSandbox}
          onChange={onToggleSandbox}
          disabled={isConnected}
        />
      </div>

      {/* Application ID */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Key className="w-4 h-4 inline mr-1" />
          Application ID
        </label>
        <Input
          type="text"
          value={credentials.applicationId}
          onChange={(e) => handleChange('applicationId', e.target.value)}
          placeholder="sq0idp-..."
          className={appIdValid === false ? 'border-red-500' : ''}
        />
        {appIdValid === false && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Application ID should start with sq0
          </p>
        )}
        {!appIdValid && existingApplicationId && (
          <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
            Current: {existingApplicationId}
          </p>
        )}
      </div>

      {/* Access Token */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <Key className="w-4 h-4 inline mr-1" />
          Access Token
        </label>
        <div className="relative">
          <Input
            type={showAccessToken ? 'text' : 'password'}
            value={credentials.accessToken}
            onChange={(e) => handleChange('accessToken', e.target.value)}
            placeholder="EAAAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowAccessToken(!showAccessToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {!credentials.accessToken && existingAccessTokenMasked && (
          <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
            Current: {existingAccessTokenMasked}
          </p>
        )}
      </div>

      {/* Location ID */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          <MapPin className="w-4 h-4 inline mr-1" />
          Location ID
        </label>
        <Input
          type="text"
          value={credentials.locationId}
          onChange={(e) => handleChange('locationId', e.target.value)}
          placeholder="LXXXXXXXXXXXXXXXXXX"
        />
        <p className="text-xs text-gray-500 dark:text-text-muted mt-1">
          Find this in Square Dashboard → Locations
        </p>
        {!credentials.locationId && existingLocationId && (
          <p className="text-xs text-gray-500 dark:text-text-muted">
            Current: {existingLocationId}
          </p>
        )}
      </div>

      {/* Connected Location Info */}
      {connectedLocation && isConnected && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Connected to: {connectedLocation.name || connectedLocation.businessName}
          </p>
        </div>
      )}

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
            <span>Square connection verified successfully!</span>
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
              {isConnected ? 'Update Credentials' : 'Connect Square'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SquareCredentialsForm;
