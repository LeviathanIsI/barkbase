import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { can } from '@/lib/acl';
import UpgradeWizard from '../components/UpgradeWizard';
import SettingsPage from '../components/SettingsPage';

const formatLimit = (value, { unit = '', unlimitedLabel = 'Unlimited' } = {}) => {
  if (value == null) {
    return unlimitedLabel;
  }
  if (!Number.isFinite(value)) {
    return unlimitedLabel;
  }
  const formatted = value.toLocaleString();
  return unit ? `${formatted} ${unit}` : formatted;
};

const formatStorage = (storageMb) => {
  if (storageMb == null || !Number.isFinite(storageMb)) {
    return 'Unlimited';
  }
  if (storageMb >= 1024) {
    return `${(storageMb / 1024).toFixed(1)} GB`;
  }
  return `${storageMb} MB`;
};

const formatRetention = (days) => {
  if (days == null || !Number.isFinite(days) || days <= 0) {
    return 'Not retained';
  }
  if (days >= 365) {
    return `${(days / 365).toFixed(1)} years`;
  }
  if (days >= 30 && days % 30 === 0) {
    const months = Math.round(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return `${days} day${days > 1 ? 's' : ''}`;
};

const renderToggleRow = (label, enabled) => (
  <li key={label} className="flex items-center justify-between">
    <span className="text-text">{label}</span>
    <Badge variant={enabled ? 'success' : 'warning'}>{enabled ? 'Included' : 'Upgrade'}</Badge>
  </li>
);

const Billing = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const role = useAuthStore((state) => state.role);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const planFeatures = tenant?.features ?? {};
  const plan = tenant?.plan ?? 'FREE';
  const storageProviderLabel = 'Supabase Cloud';
  const dbProviderLabel = 'Supabase Postgres';
  const migrationState = tenant?.migrationState ?? 'IDLE';
  const migrationInfo = tenant?.migrationInfo ?? null;
  const migrationStateLabel = (() => {
    if (!migrationState || migrationState === 'IDLE') return 'Idle';
    const friendly = migrationState.toLowerCase().replace(/_/g, ' ');
    return friendly.charAt(0).toUpperCase() + friendly.slice(1);
  })();
  const migrationInProgress = ['STAGING', 'DUALWRITE', 'CUTOVER', 'VERIFY'].includes(migrationState);

  const permissionContext = {
    role,
    plan: tenant?.plan,
    features: tenant?.features,
    featureFlags: tenant?.featureFlags,
  };

  const canManageBilling = can(permissionContext, 'manageBilling');
  const usage = tenant?.usage ?? {};

  const handlePortalClick = () => {
    toast('Billing portal integration coming soon.', {
      icon: '💳',
    });
  };

  const bookingUsage = usage.bookings;
  const seatUsage = usage.seats;
  const inviteUsage = usage.invites;

  const capabilityRows = [
    ['Customer portal self-service', planFeatures.portalSelfService],
    ['Integrated payments, deposits & refunds', planFeatures.paymentsIntegrated],
    ['Realtime staff sync', planFeatures.realtime],
    ['Waitlist & no-show workflows', planFeatures.waitlistPromotion],
    ['Email automations', planFeatures.automationsEmail],
    ['SMS automations', planFeatures.automationsSms],
    ['Theme editor & custom branding', planFeatures.themeEditor],
    ['White-label portal & domains', planFeatures.whiteLabel],
  ];

  const integrationRows = [
    [
      'API access',
      planFeatures.api,
      planFeatures.api && Number.isFinite(planFeatures.apiRps)
        ? `${planFeatures.apiRps} req/sec avg`
        : null,
    ],
    [
      'Webhooks',
      planFeatures.webhooks,
      planFeatures.webhooks && Number.isFinite(planFeatures.webhooksDaily)
        ? `${planFeatures.webhooksDaily.toLocaleString()} deliveries/day`
        : null,
    ],
    ['SSO (SAML / OIDC)', planFeatures.sso],
    ['SCIM user provisioning', planFeatures.scim],
    ['Custom roles & RBAC', planFeatures.customRoles],
    ['Self-service backups & restore', planFeatures.backups],
    ['Data residency controls', planFeatures.dataResidency],
  ];

  const supportLines = [
    ['Support channel', planFeatures.supportLevel ?? 'community docs'],
    ['Email support', planFeatures.supportEmail ? 'Included' : 'Community only'],
    ['In-product chat', planFeatures.supportChat ? 'Included' : 'Upgrade required'],
    ['Priority response SLA', planFeatures.supportPriority ? 'Same-day' : '48h / Community'],
  ];

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      blurb: 'Launch bookings with drag-and-drop board, offline queue, and preset themes.',
      highlights: ['1 location • 2 seats', '100 active pets', 'Record-only payments', 'CSV exports'],
    },
    {
      name: 'Pro',
      price: '$79–$149',
      blurb: 'Everything teams need for daily ops: realtime sync, waitlists, deposits, and automations.',
      highlights: ['3 locations • 5 seats', '2,500 bookings / month', 'Integrated payments & refunds', 'API + webhooks (100/day)'],
    },
    {
      name: 'Enterprise',
      price: '$399+',
      blurb: 'For multi-site compliance: SSO, SCIM, white-label portals, and 365-day audit trails.',
      highlights: ['Unlimited locations & seats', 'Unlimited bookings', 'SSO + custom RBAC', 'Priority support & sandbox'],
    },
  ];

  return (
    <SettingsPage
      title="Billing & Subscription"
      description="Review plan benefits, track usage, and explore upgrade paths for your workspace."
      actions={
        canManageBilling ? (
          <Button onClick={handlePortalClick}>Billing Portal</Button>
        ) : null
      }
      contentClassName="space-y-6"
    >
      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card
          title="Storage & hosting"
          description="Control where BarkBase stores files and how migrations run."
        >
          <div className="flex flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted">Primary storage</span>
                <Badge variant="neutral">{storageProviderLabel}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted">Database</span>
                <Badge variant="neutral">{dbProviderLabel}</Badge>
              </div>
              {migrationState && migrationState !== 'IDLE' ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted">Migration</span>
                  <Badge variant={migrationInProgress ? 'warning' : migrationState === 'COMPLETE' ? 'success' : 'neutral'}>
                    {migrationStateLabel}
                  </Badge>
                </div>
              ) : null}
              {migrationInfo?.startedAt ? (
                <p className="text-xs text-muted">Started {new Date(migrationInfo.startedAt).toLocaleString()}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Button onClick={() => setUpgradeOpen(true)}>Upgrade storage & hosting</Button>
              {migrationInProgress ? (
                <span className="text-xs text-warning">Migration is running. You can monitor progress below.</span>
              ) : null}
            </div>
          </div>
        </Card>
        <Card
          title="Current plan"
          description="Track usage, included capabilities, and support coverage for your subscription."
        >
          <div className="flex flex-col gap-6 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="neutral" className="uppercase">
                {plan}
              </Badge>
              <span className="text-muted">
                {planFeatures.supportLevel === 'priority'
                  ? 'Priority support partner'
                  : planFeatures.supportLevel === 'standard'
                    ? 'Standard email & chat support'
                    : 'Community support tier'}
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Usage & caps</h4>
                <ul className="mt-2 space-y-2">
                  <li className="flex items-center justify-between">
                    <span>Bookings this month</span>
                    <span className="font-medium text-text">
                      {bookingUsage
                        ? `${bookingUsage.used.toLocaleString()} / ${formatLimit(bookingUsage.limit, {
                            unlimitedLabel: 'Unlimited',
                          })}`
                        : formatLimit(planFeatures.bookingsPerMonth, { unlimitedLabel: 'Unlimited' })}
                    </span>
                  </li>
                  <li className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <span>Seats</span>
                      <span className="font-medium text-text">
                        {seatUsage
                          ? `${seatUsage.used + (seatUsage.pendingInvites ?? 0)} / ${formatLimit(planFeatures.seats, {
                              unlimitedLabel: 'Unlimited',
                            })}`
                          : formatLimit(planFeatures.seats, { unlimitedLabel: 'Unlimited' })}
                      </span>
                    </div>
                    {seatUsage?.pendingInvites ? (
                      <span className="text-xs text-muted">{seatUsage.pendingInvites} pending invite(s)</span>
                    ) : null}
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Invites this month</span>
                    <span className="font-medium text-text">
                      {inviteUsage
                        ? `${inviteUsage.used} / ${formatLimit(planFeatures.invitesPerMonth, {
                            unlimitedLabel: 'Unlimited',
                          })}`
                        : formatLimit(planFeatures.invitesPerMonth, { unlimitedLabel: 'Unlimited' })}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Active pets</span>
                    <span className="font-medium text-text">
                      {formatLimit(planFeatures.activePets, { unlimitedLabel: 'Unlimited' })}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Locations</span>
                    <span className="font-medium text-text">
                      {formatLimit(planFeatures.locations, { unlimitedLabel: 'Unlimited' })}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Storage pool</span>
                    <span className="font-medium text-text">{formatStorage(planFeatures.storageMb)}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Audit log retention</span>
                    <span className="font-medium text-text">{formatRetention(planFeatures.auditRetentionDays)}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Capabilities</h4>
                <ul className="mt-2 space-y-2">
                  {capabilityRows.map(([label, enabled]) => renderToggleRow(label, Boolean(enabled)))}
                </ul>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Integrations & compliance</h4>
                <ul className="mt-2 space-y-2">
                  {integrationRows.map(([label, enabled, detail]) => (
                    <li key={label} className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-text">{label}</span>
                        {detail ? <span className="text-xs text-muted">{detail}</span> : null}
                      </div>
                      <Badge variant={enabled ? 'success' : 'warning'}>{enabled ? 'Included' : 'Upgrade'}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Support</h4>
                <ul className="mt-2 space-y-2">
                  {supportLines.map(([label, value]) => (
                    <li key={label} className="flex items-center justify-between gap-3">
                      <span className="text-text">{label}</span>
                      <span className="font-medium text-text">{value}</span>
                    </li>
                  ))}
                </ul>
                {canManageBilling ? (
                  <div className="mt-4 rounded-lg border border-border/70 bg-surface/60 p-4 text-xs text-muted">
                    Manage billing details and invoices from the hosted portal.
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-warning/60 bg-warning/10 p-4 text-xs text-warning">
                    Upgrade to BarkBase Pro to unlock billing management tools and email support.
                  </div>
                )}
                <Button
                  className="mt-3 w-full"
                  onClick={handlePortalClick}
                  disabled={!canManageBilling}
                  variant={canManageBilling ? 'default' : 'outline'}
                >
                  Go to billing portal
                </Button>
              </div>
            </div>
          </div>
        </Card>
        <Card title="Plan comparison" description="See what each tier unlocks.">
          <div className="space-y-4 text-sm">
            {tiers.map((tier) => (
              <div key={tier.name} className="rounded-xl border border-border/60 bg-surface/95 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text">{tier.name}</p>
                    <p className="text-xs text-muted">{tier.price} / tenant / month</p>
                  </div>
                  {tenant?.plan === tier.name.toUpperCase() ? (
                    <Badge variant="success">Current</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toast(`Contact sales to upgrade to ${tier.name}.`, { icon: '✨' })}
                    >
                      Learn more
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted">{tier.blurb}</p>
                <ul className="mt-3 space-y-1 text-xs text-text">
                  {tier.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <UpgradeWizard open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </SettingsPage>
  );
};

export default Billing;
