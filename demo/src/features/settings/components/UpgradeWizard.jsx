import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { PLAN_FEATURES } from '@/features';
import { useTenantStore } from '@/stores/tenant';

const storageSummary = Object.entries(PLAN_FEATURES).map(([plan, features]) => ({
  plan,
  storageMb: features.storageMb,
  auditRetentionDays: features.auditRetentionDays,
}));

const formatStorage = (mb) => {
  if (mb == null || !Number.isFinite(mb)) {
    return 'Unlimited';
  }
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
};

const formatRetention = (days) => {
  if (!Number.isFinite(days) || days <= 0) {
    return 'Snapshots only';
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

const UpgradeWizard = ({ open, onClose }) => {
  const tenant = useTenantStore((state) => state.tenant);
  const currentPlan = tenant?.plan ?? 'FREE';
  const currentFeatures = tenant?.features ?? PLAN_FEATURES.FREE;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upgrade storage & retention"
      className="max-w-2xl"
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted">
            BarkBase now hosts every workspace on AWS. Upgrading increases your managed storage limit and extends
            audit retention—no more manual backups or custom S3 buckets.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Badge variant="neutral" className="uppercase">{currentPlan}</Badge>
            <span>
              {formatStorage(currentFeatures.storageMb)} storage • {formatRetention(currentFeatures.auditRetentionDays)} audit log
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {storageSummary.map((tier) => (
            <div
              key={tier.plan}
              className="rounded-lg border border-border/60 bg-surface/90 p-4 text-sm shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-text">{tier.plan}</h3>
                {tier.plan === currentPlan ? (
                  <Badge variant="success">Current</Badge>
                ) : (
                  <Badge variant="neutral">Available</Badge>
                )}
              </div>
              <dl className="mt-3 space-y-2 text-xs text-muted">
                <div className="flex items-center justify-between">
                  <dt>AWS storage</dt>
                  <dd className="font-medium text-text">{formatStorage(tier.storageMb)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Audit retention</dt>
                  <dd className="font-medium text-text">{formatRetention(tier.auditRetentionDays)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm text-muted">
          <p className="font-medium text-text">How upgrades work</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>We lift your AWS quotas within minutes of checkout.</li>
            <li>Backups remain automated—no migration downtime or credential juggling.</li>
            <li>Need even more space? Contact support for custom AWS limits.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradeWizard;