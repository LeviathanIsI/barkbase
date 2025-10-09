import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, WifiOff, Wifi, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { cn } from '@/lib/cn';
import { can } from '@/lib/acl';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const Header = ({ onMenuToggle }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dismissedExportReminder, setDismissedExportReminder] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('barkbase-dismiss-export-reminder') === '1';
    } catch {
      return false;
    }
  });

  const tenant = useTenantStore((state) => state.tenant);
  const loadTenant = useTenantStore((state) => state.loadTenant);
  const setDevPlan = useTenantStore((state) => state.setDevPlan);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const offline = useUIStore((state) => state.offline);

  const permissionContext = {
    role,
    plan: tenant?.plan,
    features: tenant?.features,
    featureFlags: tenant?.featureFlags,
  };

  const bookingUsage = tenant?.usage?.bookings;
  const isUnlimitedBookings = bookingUsage?.limit == null;
  const bookingsRemaining = bookingUsage?.remaining ?? null;
  const bookingsVariant = (() => {
    if (!bookingUsage) return 'neutral';
    if (isUnlimitedBookings) return 'neutral';
    if (bookingsRemaining === 0) return 'danger';
    if (typeof bookingUsage.limit === 'number' && bookingUsage.limit > 0) {
      const percentRemaining = bookingsRemaining / bookingUsage.limit;
      if (percentRemaining <= 0.1) {
        return 'warning';
      }
    }
    return 'neutral';
  })();

  const bookingUsageLabel = (() => {
    if (!bookingUsage) {
      return null;
    }
    if (isUnlimitedBookings) {
      return `Bookings ${bookingUsage.used.toLocaleString()} / Unlimited`;
    }
    return `Bookings ${bookingUsage.used.toLocaleString()} / ${bookingUsage.limit.toLocaleString()}`;
  })();

  const storageProvider = tenant?.storageProvider ?? 'LOCAL';
  const storageVendor = tenant?.byo?.cloudVendor ?? null;
  const migrationState = tenant?.migrationState ?? 'IDLE';
  const storageLabel = (() => {
    if (storageProvider === 'HOSTED') {
      return 'Storage: BarkBase Cloud';
    }
    if (storageProvider === 'BYO') {
      const vendorLabel = storageVendor ? ` (${storageVendor.toUpperCase()})` : '';
      return `Storage: BYO${vendorLabel}`;
    }
    return 'Storage: Local • No Cloud Backups';
  })();
  const migrationLabel = (() => {
    if (!migrationState || migrationState === 'IDLE') return null;
    const friendly = migrationState.toLowerCase().replace(/_/g, ' ');
    return friendly.charAt(0).toUpperCase() + friendly.slice(1);
  })();
  const isMigrationActive = migrationState && !['IDLE', 'COMPLETE'].includes(migrationState);

  const storageModalContent = (() => {
    if (storageProvider === 'HOSTED') {
      return {
        title: 'BarkBase Cloud hosting',
        paragraphs: [
          'Your tenant is backed up in BarkBase-managed infrastructure with encryption at rest.',
          'Exports remain available if you want an extra copy outside of our retention window.',
        ],
        bullets: [
          'Changes write to redundant storage during migrations and dual-write windows.',
          'Reach out via support if you need a different region or retention schedule.',
        ],
      };
    }
    if (storageProvider === 'BYO') {
      const vendorDetails = storageVendor ? storageVendor.toUpperCase() : 'Your cloud';
      const vendorBullet = (() => {
        if (!storageVendor) return null;
        if (storageVendor === 'aws') {
          return 'The IAM user should keep s3:PutObject, s3:GetObject, s3:ListBucket, and s3:DeleteObject permissions.';
        }
        if (storageVendor === 'gcp') {
          return 'Service account needs storage.objects.{create,get,list,delete} on your bucket.';
        }
        if (storageVendor === 'azure') {
          return 'Connection string must include read/write access for the target container.';
        }
        return null;
      })();
      return {
        title: `Bring Your Own Cloud (${vendorDetails})`,
        paragraphs: [
          'Uploads and exports route to the bucket you connected. Credentials never leave this device.',
          'Rotate keys anytime from Settings → Billing → Upgrade.',
        ],
        bullets: [
          vendorBullet,
          'Monitor lifecycle policies and storage costs from your own cloud console.',
        ].filter(Boolean),
      };
    }
    return {
      title: 'Local storage & backups',
      paragraphs: ['BarkBase Free keeps everything on this device. We do not run cloud backups, so protecting your data is on you.'],
      bullets: [
        'Download periodic exports and store them somewhere safe (external drive or cloud storage you control).',
        'Exports include pets, owners, bookings, payments, audit logs, and membership consents.',
        'Our support team cannot restore Free plan data—keep exports and local backups handy.',
      ],
    };
  })();

  const storageModalTitle = storageModalContent.title;
  const storageModalParagraphs = storageModalContent.paragraphs ?? [];
  const storageModalBullets = storageModalContent.bullets ?? [];
  const storageModalCtaDescription = storageModalContent.ctaDescription ?? 'Need a fresh copy? Generate one anytime.';
  const storageModalCtaLabel = storageModalContent.ctaLabel ?? 'Download workspace export';

  const lastExportAt = tenant?.settings?.exports?.lastGeneratedAt;
  const showExportNudge = (() => {
    if (dismissedExportReminder) {
      return false;
    }
    if (!lastExportAt) return true;
    const last = new Date(lastExportAt).getTime();
    if (Number.isNaN(last)) {
      return true;
    }
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - last >= THIRTY_DAYS_MS;
  })();

  const closeMenu = () => setMenuOpen(false);

  const tenantSlug = tenant?.slug ?? 'default';

  const parseFilename = (headerValue) => {
    const fallback = `barkbase-export-${tenantSlug}.json`;
    if (!headerValue) return fallback;
    const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(headerValue);
    if (utfMatch?.[1]) {
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        return utfMatch[1];
      }
    }
    const stdMatch = /filename="?([^";]+)"?/i.exec(headerValue);
    if (stdMatch?.[1]) {
      return stdMatch[1];
    }
    return fallback;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/tenants/current/export`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Tenant': tenantSlug,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to export workspace data');
      }

      const blob = await response.blob();
      const filename = parseFilename(response.headers.get('Content-Disposition'));
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      try {
        await loadTenant(tenantSlug);
      } catch {
        // ignore refresh errors
      }
    } catch (error) {
      toast.error(error.message ?? 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePortalClick = () => {
    toast('Billing portal integration coming soon.', {
      icon: '💳',
    });
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/70 bg-surface/95 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex flex-1 items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">{tenant?.customDomain ?? tenant?.slug}</p>
          <h1 className="text-lg font-semibold text-text">{tenant?.name ?? 'BarkBase'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="neutral" className="uppercase">
            {tenant?.plan ?? 'FREE'}
          </Badge>
          {import.meta.env.DEV ? (
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="text-xs">
                DEV
              </Badge>
              <select
                value={tenant?.plan ?? 'FREE'}
                onChange={(e) => setDevPlan(e.target.value)}
                className="rounded-md border border-warning/50 bg-warning/10 px-2 py-1 text-xs font-medium text-warning focus:outline-none focus:ring-2 focus:ring-warning/40"
                aria-label="Development tier switcher"
              >
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
              <select
                value={tenant?.storageProvider ?? 'LOCAL'}
                onChange={(e) => setDevPlan(tenant?.plan ?? 'FREE', e.target.value)}
                className="rounded-md border border-warning/50 bg-warning/10 px-2 py-1 text-xs font-medium text-warning focus:outline-none focus:ring-2 focus:ring-warning/40"
                aria-label="Development storage provider switcher"
              >
                <option value="LOCAL">LOCAL</option>
                <option value="HOSTED">HOSTED</option>
                <option value="BYO">BYO</option>
              </select>
            </div>
          ) : null}
          {bookingUsageLabel ? (
            <Badge variant={bookingsVariant} className="hidden md:inline-flex">
              {bookingUsageLabel}
            </Badge>
          ) : null}
          <button
            type="button"
            onClick={() => setStorageModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-warning/50 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning transition hover:bg-warning/15 focus:outline-none focus:ring-2 focus:ring-warning/40"
          >
            {storageLabel}
          </button>
          {migrationLabel ? (
            <Badge variant={isMigrationActive ? 'warning' : 'success'} className="hidden md:inline-flex uppercase">
              {isMigrationActive ? `Migration: ${migrationLabel}` : `Migration ${migrationLabel}`}
            </Badge>
          ) : null}
          {showExportNudge ? (
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-warning/80">
              <span>Create an export now. That’s it—no cloud.</span>
              <button
                type="button"
                className="text-warning/60 hover:text-warning"
                onClick={() => {
                  setDismissedExportReminder(true);
                  if (typeof window !== 'undefined') {
                    try {
                      window.localStorage.setItem('barkbase-dismiss-export-reminder', '1');
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              >
                Dismiss
              </button>
            </div>
          ) : null}
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted',
              offline && 'border-warning/60 bg-warning/10 text-warning',
            )}
          >
            {offline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            {offline ? 'Offline' : 'Online'}
          </span>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-left text-xs hover:bg-surface"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/30 text-sm font-semibold text-primary">
                {user?.name ? user.name[0] : 'BB'}
              </div>
              <div className="hidden lg:block">
                <p className="font-semibold text-text">{user?.name ?? 'Guest User'}</p>
                <p className="text-muted">{role ?? 'OWNER'}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-border bg-surface p-2 shadow-lg">
                {can(permissionContext, 'manageMembers') ? (
                  <Link
                    to="/settings/members"
                    className="block rounded-md px-3 py-2 text-sm text-text hover:bg-primary/10"
                    onClick={closeMenu}
                  >
                    Members
                  </Link>
                ) : null}
                {can(permissionContext, 'manageBilling') ? (
                  <Link
                    to="/settings/billing"
                    className="block rounded-md px-3 py-2 text-sm text-text hover:bg-primary/10"
                    onClick={closeMenu}
                  >
                    Billing
                  </Link>
                ) : null}
                {can(permissionContext, 'viewAuditLog') ? (
                  <Link
                    to="/settings/audit-log"
                    className="block rounded-md px-3 py-2 text-sm text-text hover:bg-primary/10"
                    onClick={closeMenu}
                  >
                    Audit Log
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Modal open={storageModalOpen} onClose={() => setStorageModalOpen(false)} title={storageModalTitle}>
        {storageModalParagraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {storageModalBullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
            {storageModalBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>{storageModalCtaDescription}</span>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Preparing export…' : storageModalCtaLabel}
          </Button>
        </div>
      </Modal>
    </header>
  );
};

export default Header;
