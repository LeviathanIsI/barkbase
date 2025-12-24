/**
 * Pet Detail Page - Demo Version
 * Simplified pet detail view with mock data.
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
  PawPrint, Edit, Trash2, Calendar, Syringe, User, Phone, Mail,
  Plus, AlertTriangle, Clock, ChevronRight, ArrowLeft, AlertCircle,
  Dog, Cat, CheckCircle, Weight, Palette, Hash, Utensils, FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import Modal from '@/components/ui/Modal';
import LoadingState from '@/components/ui/LoadingState';
import { usePetQuery, usePetVaccinationsQuery, useDeletePetMutation } from '../api';
import PetFormModal from '../components/PetFormModal';
import { cn } from '@/lib/cn';
import { formatAgeFromBirthdate, getBirthdateFromPet } from '../utils/pet-date-utils';
import vaccinationsData from '@/data/vaccinations.json';

// Helper functions
const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return format(date, formatStr);
  } catch {
    return '—';
  }
};

const PetDetail = () => {
  const { petId } = useParams();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // API Queries
  const { data: pet, isLoading, error } = usePetQuery(petId);
  const deletePetMutation = useDeletePetMutation();

  // Get vaccinations for this pet
  const petVaccinations = useMemo(() => {
    return vaccinationsData.filter((v) => v.petId === petId);
  }, [petId]);

  // Calculate vaccination summary
  const vaccinationSummary = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let current = 0;
    let expiringSoon = 0;
    let expired = 0;

    petVaccinations.forEach((v) => {
      const expirationDate = new Date(v.expirationDate);
      if (expirationDate < now) {
        expired++;
      } else if (expirationDate <= thirtyDaysFromNow) {
        expiringSoon++;
      } else {
        current++;
      }
    });

    return { current, expiringSoon, expired, total: petVaccinations.length };
  }, [petVaccinations]);

  // Handlers
  const handleDelete = async () => {
    try {
      await deletePetMutation.mutateAsync({ petId });
      navigate('/pets');
    } catch (err) {
      console.error('Failed to delete pet:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col flex-grow w-full min-h-[calc(100vh-180px)] items-center justify-center">
        <LoadingState label="Loading pet details…" variant="mascot" />
      </div>
    );
  }

  // Error/Not found state
  if (error || !pet) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <PawPrint className="w-16 h-16 mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Pet not found
        </h2>
        <p className="mt-2" style={{ color: 'var(--bb-color-text-muted)' }}>
          This pet may have been deleted or doesn't exist.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate('/pets')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pets
        </Button>
      </div>
    );
  }

  const SpeciesIcon = pet.species?.toLowerCase() === 'cat' ? Cat : Dog;
  const petAge = formatAgeFromBirthdate(getBirthdateFromPet(pet));
  const petDescription = [pet.breed, pet.species].filter(Boolean).join(' • ');
  const hasNotes = pet.feedingInstructions || pet.medications || pet.allergies || pet.behaviorNotes;

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
                <Link to="/pets" className="flex items-center gap-1 hover:text-[color:var(--bb-color-text-primary)] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Pets
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span style={{ color: 'var(--bb-color-text-primary)' }}>{pet.name}</span>
              </nav>

              {/* Title & Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold truncate" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {pet.name}
                </h1>
                <Badge variant={pet.status === 'active' ? 'success' : 'neutral'}>{pet.status === 'active' ? 'Active' : 'Inactive'}</Badge>
                {hasNotes && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Notes
                  </Badge>
                )}
              </div>

              {/* Subtitle */}
              <p className="mt-1 text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                {petDescription} {petAge && `• ${petAge}`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button variant="ghost" onClick={() => setDeleteDialogOpen(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-[380px] min-w-[380px] flex-shrink-0 border-r overflow-y-auto p-4 space-y-4" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            {/* About */}
            <PropertyCard title="About" icon={PawPrint}>
              <PropertyList
                properties={[
                  { label: 'Species', value: pet.species || 'Dog' },
                  { label: 'Breed', value: pet.breed },
                  { label: 'Gender', value: pet.gender },
                  { label: 'Age', value: petAge },
                  { label: 'Date of Birth', value: safeFormatDate(pet.dateOfBirth) },
                ]}
              />
            </PropertyCard>

            {/* Physical */}
            <PropertyCard title="Physical" icon={Weight}>
              <PropertyList
                properties={[
                  { label: 'Weight', value: pet.weight ? `${pet.weight} lbs` : null },
                  { label: 'Color', value: pet.color },
                  { label: 'Microchip #', value: pet.microchipId },
                ]}
              />
            </PropertyCard>

            {/* Owner */}
            {pet.owner && (
              <PropertyCard title="Owner" icon={User}>
                <div className="space-y-3">
                  <Link
                    to={`/owners/${pet.owner.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:border-[color:var(--bb-color-accent)]"
                    style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                      {pet.owner.name?.charAt(0).toUpperCase() || 'O'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[color:var(--bb-color-text-primary)] truncate">{pet.owner.name}</p>
                      {pet.owner.email && <p className="text-xs text-[color:var(--bb-color-text-muted)] truncate">{pet.owner.email}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                  </Link>

                  {pet.owner.phone && (
                    <a
                      href={`tel:${pet.owner.phone}`}
                      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:border-[color:var(--bb-color-accent)]"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      <Phone className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                      <span className="text-sm text-[color:var(--bb-color-text-primary)]">{pet.owner.phone}</span>
                    </a>
                  )}

                  {pet.owner.email && (
                    <a
                      href={`mailto:${pet.owner.email}`}
                      className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:border-[color:var(--bb-color-accent)]"
                      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                    >
                      <Mail className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                      <span className="text-sm text-[color:var(--bb-color-text-primary)]">{pet.owner.email}</span>
                    </a>
                  )}
                </div>
              </PropertyCard>
            )}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="health">Health & Vaccinations</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard icon={Syringe} label="Vaccinations" value={vaccinationSummary.total} subtitle={vaccinationSummary.expired > 0 ? `${vaccinationSummary.expired} expired` : 'All up to date'} variant={vaccinationSummary.expired > 0 ? 'warning' : 'success'} />
                  <StatCard icon={Calendar} label="Last Visit" value="—" subtitle="No visit recorded" />
                  <StatCard icon={SpeciesIcon} label="Species" value={pet.species || 'Dog'} subtitle={pet.breed || 'Unknown breed'} />
                </div>

                {/* Notes Sections */}
                {hasNotes && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pet.feedingInstructions && (
                      <NoteCard icon={Utensils} title="Feeding Instructions" content={pet.feedingInstructions} />
                    )}
                    {pet.medications && <NoteCard icon={Syringe} title="Medications" content={pet.medications} />}
                    {pet.allergies && <NoteCard icon={AlertCircle} title="Allergies" content={pet.allergies} variant="warning" />}
                    {pet.behaviorNotes && <NoteCard icon={FileText} title="Behavior Notes" content={pet.behaviorNotes} />}
                  </div>
                )}

                {!hasNotes && (
                  <Card className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
                    <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">No Notes</h3>
                    <p className="text-sm text-[color:var(--bb-color-text-muted)]">No feeding instructions, medications, allergies, or behavior notes have been recorded for this pet.</p>
                  </Card>
                )}
              </TabsContent>

              {/* Health Tab */}
              <TabsContent value="health" className="space-y-6">
                {/* Vaccination Summary */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] flex items-center gap-2">
                      <Syringe className="h-5 w-5" />
                      Vaccination Records
                    </h3>
                    <Button size="sm" onClick={() => toast.success('Add vaccination feature coming soon!')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Record
                    </Button>
                  </div>

                  {/* Summary Pills */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <SummaryPill icon={CheckCircle} label="Current" value={vaccinationSummary.current} variant="success" />
                    <SummaryPill icon={Clock} label="Expiring Soon" value={vaccinationSummary.expiringSoon} variant="warning" />
                    <SummaryPill icon={AlertCircle} label="Expired" value={vaccinationSummary.expired} variant="danger" />
                  </div>

                  {/* Vaccination List */}
                  {petVaccinations.length > 0 ? (
                    <div className="space-y-3">
                      {petVaccinations.map((vacc) => {
                        const expirationDate = new Date(vacc.expirationDate);
                        const now = new Date();
                        const isExpired = expirationDate < now;
                        const isExpiringSoon = !isExpired && expirationDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                        return (
                          <div
                            key={vacc.id}
                            className="flex items-center justify-between p-4 rounded-lg border"
                            style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', isExpired ? 'bg-red-100 dark:bg-red-900/30' : isExpiringSoon ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30')}>
                                <Syringe className={cn('h-5 w-5', isExpired ? 'text-red-600 dark:text-red-400' : isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')} />
                              </div>
                              <div>
                                <p className="font-medium text-[color:var(--bb-color-text-primary)]">{vacc.vaccineName}</p>
                                <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                                  Administered: {safeFormatDate(vacc.dateAdministered)} • By: {vacc.veterinarian || 'Unknown'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={isExpired ? 'danger' : isExpiringSoon ? 'warning' : 'success'}>{isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Current'}</Badge>
                              <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">Expires: {safeFormatDate(vacc.expirationDate)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Syringe className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
                      <p className="text-[color:var(--bb-color-text-muted)]">No vaccination records on file</p>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Edit Modal */}
      <PetFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        pet={pet}
        onSubmit={async () => {
          toast.success('Pet updated successfully');
          setEditModalOpen(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Pet"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-[color:var(--bb-color-text-primary)]">
          Are you sure you want to delete <strong>{pet.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
};

// Property Card Component
const PropertyCard = ({ title, icon: Icon, children }) => (
  <Card className="p-4">
    <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-3 flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4" />}
      {title}
    </h3>
    {children}
  </Card>
);

// Property List Component
const PropertyList = ({ properties }) => (
  <div className="space-y-2">
    {properties.map(({ label, value }) => (
      <div key={label} className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--bb-color-text-muted)]">{label}</span>
        <span className="text-[color:var(--bb-color-text-primary)] font-medium">{value || '—'}</span>
      </div>
    ))}
  </div>
);

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subtitle, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800',
    success: 'bg-emerald-100 dark:bg-emerald-900/40',
    warning: 'bg-amber-100 dark:bg-amber-900/40',
    danger: 'bg-red-100 dark:bg-red-900/40',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', variants[variant])}>
          <Icon className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
        </div>
        <div>
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">{label}</p>
          <p className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">{value}</p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
};

// Summary Pill Component
const SummaryPill = ({ icon: Icon, label, value, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  };

  return (
    <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium', variants[variant])}>
      <Icon className="h-4 w-4" />
      <span>{value}</span>
      <span>{label}</span>
    </div>
  );
};

// Note Card Component
const NoteCard = ({ icon: Icon, title, content, variant = 'default' }) => {
  const variants = {
    default: { bg: 'var(--bb-color-bg-surface)', border: 'var(--bb-color-border-subtle)' },
    warning: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)' },
  };

  const style = variants[variant] || variants.default;

  return (
    <Card className="p-4" style={{ backgroundColor: style.bg, borderColor: style.border }}>
      <h4 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <p className="text-sm text-[color:var(--bb-color-text-muted)] whitespace-pre-wrap">{content}</p>
    </Card>
  );
};

export default PetDetail;
