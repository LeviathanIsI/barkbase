import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SettingsPage from '../components/SettingsPage';
import UpgradeBanner from '@/components/ui/UpgradeBanner';
import {
  Globe,
  Link2,
  Copy,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Mail,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useDomainSettingsQuery,
  useUpdateDomainSettingsMutation,
  useVerifyDomainMutation,
  useDomainStatusQuery,
} from '../api';
import { useTimezoneUtils } from '@/lib/timezone';

const Domain = () => {
  const tz = useTimezoneUtils();
  const { data, isLoading, error } = useDomainSettingsQuery();
  const { data: statusData, refetch: refetchStatus } = useDomainStatusQuery();
  const updateMutation = useUpdateDomainSettingsMutation();
  const verifyMutation = useVerifyDomainMutation();

  const [customDomain, setCustomDomain] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (data?.settings?.customDomain) {
      setCustomDomain(data.settings.customDomain);
    }
  }, [data]);

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  const handleSaveDomain = async () => {
    try {
      await updateMutation.mutateAsync({ customDomain: customDomain || null });
      toast.success(customDomain ? 'Custom domain saved. Please configure your DNS.' : 'Domain settings saved.');
    } catch (error) {
      console.error('Error saving domain:', error);
      toast.error(error?.response?.data?.message || 'Failed to save domain settings');
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyMutation.mutateAsync();
      if (result.verified) {
        toast.success('Domain verified successfully!');
      } else {
        toast.error(result.error || 'Domain verification failed. Please check your DNS settings.');
      }
      refetchStatus();
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    try {
      await updateMutation.mutateAsync({ customDomain: null });
      setCustomDomain('');
      toast.success('Custom domain removed.');
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Failed to remove domain');
    }
  };

  if (isLoading) {
    return (
      <SettingsPage title="Domain & SSL" description="Configure your custom domain and SSL certificates">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </SettingsPage>
    );
  }

  if (error) {
    return (
      <SettingsPage title="Domain & SSL" description="Configure your custom domain and SSL certificates">
        <Card>
          <div className="text-center py-8 text-red-500">
            Failed to load domain settings. Please try again.
          </div>
        </Card>
      </SettingsPage>
    );
  }

  const settings = data?.settings || {};
  const defaultUrl = data?.defaultUrl || `https://book.barkbase.com/${settings.urlSlug || ''}`;
  const customDomainAvailable = data?.customDomainAvailable;
  const tenantPlan = data?.tenantPlan || 'free';

  const formatDateDisplay = (dateString) => {
    if (!dateString) return null;
    return tz.formatDate(new Date(dateString), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeSince = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return formatDateDisplay(dateString);
  };

  return (
    <SettingsPage
      title="Domain & SSL"
      description="Configure your custom domain and SSL certificates"
    >
      {/* Current Domain Status */}
      <Card
        title="Your Booking Portal"
        description="Your current booking portal URL"
        icon={<Globe className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default URL:</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
              <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-mono text-gray-900 dark:text-text-primary flex-1 truncate">
                {defaultUrl}
              </span>
              <Button variant="ghost" size="sm" onClick={() => copyUrl(defaultUrl)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status:</span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Active
            </span>
          </div>

          {data?.customUrl && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Custom Domain URL:</label>
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm font-mono text-green-700 dark:text-green-300 flex-1 truncate">
                  {data.customUrl}
                </span>
                <Button variant="ghost" size="sm" onClick={() => copyUrl(data.customUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Custom Domain */}
      <Card
        title="Custom Domain"
        description="Use your own domain for the booking portal"
        icon={<Globe className="w-5 h-5" />}
        headerAction={
          !customDomainAvailable && (
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              PRO
            </span>
          )
        }
      >
        {!customDomainAvailable ? (
          <div className="space-y-4">
            <UpgradeBanner
              title="Custom Domains"
              description="Use your own domain like book.yourkennel.com instead of book.barkbase.com. Available on Pro and Enterprise plans."
              feature="custom_domain"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Custom Domain</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                  placeholder="book.yourkennel.com"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
                <Button
                  onClick={handleSaveDomain}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>

            {settings.customDomain && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Status:</span>
                  {settings.domainVerified ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Circle className="w-4 h-4" />
                      Not Configured
                    </span>
                  )}
                </div>

                {!settings.domainVerified && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">To connect your domain:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-text-secondary">
                      <li>Add a CNAME record pointing to: <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-surface-secondary rounded font-mono text-xs">cname.barkbase.com</code></li>
                      <li>Click "Verify Domain" once DNS propagates (up to 48 hours)</li>
                    </ol>

                    <Button
                      onClick={handleVerifyDomain}
                      disabled={isVerifying}
                      className="mt-4"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Verify Domain
                        </>
                      )}
                    </Button>

                    <div className="mt-4 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg border border-gray-200 dark:border-surface-border">
                      <h5 className="text-sm font-medium mb-2">DNS Configuration</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-mono">CNAME</span>
                        <span className="text-gray-500">Host:</span>
                        <span className="font-mono">{customDomain.split('.')[0]} (or your subdomain)</span>
                        <span className="text-gray-500">Value:</span>
                        <span className="font-mono">cname.barkbase.com</span>
                        <span className="text-gray-500">TTL:</span>
                        <span className="font-mono">3600</span>
                      </div>
                    </div>
                  </div>
                )}

                {settings.domainVerified && (
                  <div className="border-t pt-4">
                    <Button variant="outline" size="sm" onClick={handleRemoveDomain}>
                      Remove Custom Domain
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* SSL Certificate Status */}
      <Card
        title="SSL Certificate"
        description="Your booking portal is secured with SSL"
        icon={<Lock className="w-5 h-5" />}
      >
        <div className="space-y-4">
          {/* Default Domain SSL */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium">Default Domain</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">{defaultUrl}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Secured (SSL Active)
                </span>
                <span className="text-sm text-gray-500">• Auto-renewed</span>
              </div>
            </div>
          </div>

          {/* Custom Domain SSL */}
          {settings.customDomain && (
            <div className={`flex items-start gap-4 p-4 rounded-lg ${
              settings.sslProvisioned
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
              {settings.sslProvisioned ? (
                <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="text-sm font-medium">Custom Domain</h4>
                <p className="text-sm text-gray-600 dark:text-text-secondary">{settings.customDomain}</p>
                <div className="flex items-center gap-2 mt-2">
                  {settings.sslProvisioned ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Secured (SSL Active)
                    </span>
                  ) : settings.domainVerified ? (
                    <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      SSL Certificate Provisioning...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                      <AlertCircle className="w-4 h-4" />
                      Pending Domain Verification
                    </span>
                  )}
                </div>
                {!settings.sslProvisioned && settings.domainVerified && (
                  <p className="text-xs text-gray-500 mt-1">
                    SSL is automatically provisioned after domain verification. This may take a few minutes.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Domain Verification Status */}
      {settings.customDomain && !settings.domainVerified && statusData && (
        <Card
          title="Domain Verification"
          description="Track your domain verification progress"
          icon={<Shield className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Domain:</span>
              <span className="text-sm font-mono">{settings.customDomain}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {statusData.checks?.dnsRecordFound ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                <span className="text-sm">DNS Record Found</span>
              </div>

              <div className="flex items-center gap-3">
                {statusData.checks?.cnameCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                <span className="text-sm">Pointing to correct CNAME</span>
              </div>

              <div className="flex items-center gap-3">
                {statusData.checks?.sslProvisioned ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : statusData.checks?.cnameCorrect ? (
                  <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                <span className="text-sm">SSL Certificate Provisioning</span>
              </div>

              <div className="flex items-center gap-3">
                {statusData.checks?.domainActive ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                <span className="text-sm">Domain Active</span>
              </div>
            </div>

            {statusData.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {statusData.error}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStatus()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
              {statusData.lastChecked && (
                <span className="text-xs text-gray-500">
                  Last checked: {getTimeSince(statusData.lastChecked)}
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Email Domain */}
      <Card
        title="Email Sending Domain"
        description="Send emails from your own domain"
        icon={<Mail className="w-5 h-5" />}
        headerAction={
          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            ENTERPRISE
          </span>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Current:</label>
            <p className="text-sm text-gray-600 dark:text-text-secondary font-mono">
              notifications@barkbase.com
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <p className="text-sm text-gray-600 dark:text-text-secondary">
              Custom email domain requires additional DNS setup (SPF, DKIM, DMARC records).
              Contact support to enable this feature.
            </p>
          </div>

          <Button variant="outline" onClick={() => window.open('mailto:support@barkbase.com?subject=Custom Email Domain Request', '_blank')}>
            <Mail className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Domain;
