import { useState, useRef, useEffect } from 'react';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import PetHoverPreview from '@/components/ui/PetHoverPreview';
import OwnerHoverPreview from '@/components/ui/OwnerHoverPreview';
import {
  Mail,
  Phone,
  Shield,
  Heart,
  CalendarPlus,
  MessageSquare,
  Edit,
  MoreVertical,
  PawPrint,
  DollarSign,
  Calendar,
  Bookmark,
  ChevronDown,
  Trash2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * UnifiedOwnerCard Component
 * enterprise-grade CRM card for displaying owner and pet information
 */
const UnifiedOwnerCard = ({ owner, getVaccinationStatus, viewMode = 'grid' }) => {
  const tz = useTimezoneUtils();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const showAllByDefault = owner.pets?.length <= 2;
  const displayPets = showAllByDefault || expanded ? owner.pets : owner.pets?.slice(0, 2);
  const hiddenPetCount = owner.pets?.length - 2;

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={cn(
        'group rounded-xl border transition-all duration-200',
        'hover:shadow-lg hover:border-[color:var(--bb-color-accent-soft)]',
        'focus-within:ring-2 focus-within:ring-[var(--bb-color-accent)] focus-within:ring-offset-2'
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)',
      }}
    >
      {/* Owner Header Block */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Avatar + Contact Info */}
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold shadow-sm"
              style={{
                backgroundColor: 'var(--bb-color-accent)',
                color: 'var(--bb-color-text-on-accent)',
              }}
            >
              {owner.name?.charAt(0)?.toUpperCase() || owner.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-[color:var(--bb-color-text-primary)] truncate">
                <OwnerHoverPreview owner={owner}>
                  {owner.name || 'Unknown Owner'}
                </OwnerHoverPreview>
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
                {owner.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{owner.email}</span>
                  </span>
                )}
                {owner.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {owner.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Status + Customer Since */}
          <div className="text-right shrink-0">
            <Badge variant={owner.activePets?.length > 0 ? 'success' : 'neutral'}>
              {owner.activePets?.length > 0 ? 'Active' : 'Inactive'}
            </Badge>
            <p className="mt-1 text-xs text-[color:var(--bb-color-text-muted)]">
              Customer since {new Date(owner.createdAt || Date.now()).getFullYear()}
            </p>
          </div>
        </div>

        {/* Details Row with Icons */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <DetailItem icon={PawPrint} value={owner.pets?.length || 0} label="pets" />
          <DetailItem icon={DollarSign} value={`$${owner.totalSpent || 0}`} label="spent" />
          <DetailItem
            icon={Calendar}
            value={owner.lastVisit ? tz.formatShortDate(owner.lastVisit) : 'Never'}
            label="last visit"
          />
          <DetailItem icon={Bookmark} value={owner.totalBookings || 0} label="bookings" />
        </div>
      </div>

      {/* Pet List Section */}
      <div
        className="border-t px-5 py-4"
        style={{ borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
            Pets ({owner.pets?.length || 0})
          </h4>
          {!showAllByDefault && owner.pets?.length > 2 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-medium text-[color:var(--bb-color-accent)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)] rounded"
              aria-expanded={expanded}
              aria-label={expanded ? 'Show fewer pets' : 'Show all pets'}
            >
              {expanded ? 'Show Less' : `Show All (${hiddenPetCount} more)`}
              <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
            </button>
          )}
        </div>

        {owner.pets?.length > 0 ? (
          <div className="space-y-2">
            {displayPets?.map((pet, index) => (
              <PetRow
                key={pet.id || pet.recordId || index}
                pet={pet}
                getVaccinationStatus={getVaccinationStatus}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <PawPrint className="mx-auto mb-2 h-8 w-8 text-[color:var(--bb-color-text-muted)] opacity-30" />
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">No pets registered</p>
          </div>
        )}
      </div>

      {/* Actions Row */}
      <div
        className="flex items-center justify-end gap-2 border-t px-5 py-3"
        style={{
          borderColor: 'var(--bb-color-border-subtle)',
          backgroundColor: 'var(--bb-color-bg-elevated)',
        }}
      >
        <Button size="sm" className="gap-1.5">
          <CalendarPlus className="h-3.5 w-3.5" />
          New Booking
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Message
        </Button>

        {/* Kebab Menu */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="More actions"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {menuOpen && (
            <div
              className="absolute right-0 bottom-full mb-1 w-44 rounded-lg border shadow-lg z-20"
              style={{
                backgroundColor: 'var(--bb-color-bg-surface)',
                borderColor: 'var(--bb-color-border-subtle)',
              }}
            >
              <div className="py-1">
                <MenuButton icon={Edit} label="Edit Owner" onClick={() => setMenuOpen(false)} />
                <MenuButton icon={FileText} label="View History" onClick={() => setMenuOpen(false)} />
                <MenuButton icon={PawPrint} label="Add Pet" onClick={() => setMenuOpen(false)} />
                <div className="my-1 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }} />
                <MenuButton icon={Trash2} label="Archive" variant="danger" onClick={() => setMenuOpen(false)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Detail Item Component
const DetailItem = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-1.5 text-[color:var(--bb-color-text-muted)]">
    <Icon className="h-3.5 w-3.5 opacity-60" />
    <span>
      <strong className="font-semibold text-[color:var(--bb-color-text-primary)]">{value}</strong>
      <span className="ml-0.5 opacity-80">{label}</span>
    </span>
  </div>
);

// Pet Row Component
const PetRow = ({ pet, getVaccinationStatus }) => {
  const vaccStatus = getVaccinationStatus(pet);

  const vaccStyles = {
    current: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
    'due-soon': { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40' },
    expired: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
    missing: { color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  };

  const vaccLabels = {
    current: 'Up to date',
    'due-soon': 'Due soon',
    expired: 'Expired',
    missing: 'Missing',
  };

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]"
      style={{ backgroundColor: 'var(--bb-color-bg-body)' }}
    >
      <PetAvatar pet={pet} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-[color:var(--bb-color-text-primary)] truncate">
            <PetHoverPreview pet={pet}>{pet.name}</PetHoverPreview>
          </p>
          {pet.status === 'inactive' && (
            <Badge variant="neutral" className="text-xs shrink-0">Inactive</Badge>
          )}
          {pet.hasMedicalAlerts && (
            <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" title="Medical alerts" />
          )}
        </div>
        <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">
          {pet.breed || 'Unknown breed'} • {pet.age ? `${pet.age}y` : 'Age unknown'}
        </p>
      </div>

      {/* Vaccination Badge */}
      <div className="flex items-center gap-2 shrink-0">
        {vaccStatus === 'missing' || vaccStatus === 'expired' ? (
          <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', vaccStyles[vaccStatus].bg, vaccStyles[vaccStatus].color)}>
            <AlertTriangle className="h-3 w-3" />
            {vaccLabels[vaccStatus]}
          </div>
        ) : (
          <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', vaccStyles[vaccStatus].bg, vaccStyles[vaccStatus].color)}>
            <Shield className="h-3 w-3" />
            {vaccLabels[vaccStatus]}
          </div>
        )}

        {/* Pet Quick Actions - Reduced visual weight */}
        <div className="hidden sm:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="p-1.5 rounded-md text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
            aria-label={`Book appointment for ${pet.name}`}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded-md text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
            aria-label={`Edit ${pet.name}`}
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Menu Button Component
const MenuButton = ({ icon: Icon, label, onClick, variant = 'default' }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
      'hover:bg-[color:var(--bb-color-bg-elevated)]',
      'focus:outline-none focus-visible:bg-[color:var(--bb-color-bg-elevated)]',
      variant === 'danger' && 'text-red-600 dark:text-red-400'
    )}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

export default UnifiedOwnerCard;
