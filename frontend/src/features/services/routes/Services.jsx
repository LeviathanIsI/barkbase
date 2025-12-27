import { useState } from 'react';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { useServicesQuery, useCreateServiceMutation, useUpdateServiceMutation, useDeleteServiceMutation } from '../api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const Services = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceCents: 0,
    category: 'BOARDING',
    isActive: true
  });

  const { data: services, isLoading } = useServicesQuery();
  const createMutation = useCreateServiceMutation();
  const updateMutation = useUpdateServiceMutation();
  const deleteMutation = useDeleteServiceMutation();

  const handleOpenForm = (service = null) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        priceCents: service.priceCents,
        category: service.category,
        isActive: service.isActive
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        priceCents: 0,
        category: 'BOARDING',
        isActive: true
      });
    }
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingService) {
        await updateMutation.mutateAsync({
          serviceId: editingService.recordId,
          updates: formData
        });
        toast.success('Service updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Service created successfully');
      }
      setFormOpen(false);
    } catch (error) {
      toast.error('Failed to save service');
    }
  };

  const handleDelete = async (serviceId) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await deleteMutation.mutateAsync(serviceId);
      toast.success('Service deleted');
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const getCategoryBadge = (category) => {
    const variants = {
      BOARDING: 'primary',
      DAYCARE: 'info',
      GROOMING: 'purple',
      TRAINING: 'cyan',
      OTHER: 'neutral'
    };
    return <Badge variant={variants[category] || 'neutral'}>{category}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        <PageHeader
          breadcrumbs={[
            { label: 'Administration' },
            { label: 'Services' }
          ]}
          title="Services & Add-ons"
          description="Manage services and add-ons for bookings"
        />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <PageHeader
        breadcrumbs={[
          { label: 'Administration' },
          { label: 'Services' }
        ]}
        title="Services & Add-ons"
        description="Manage services and add-ons for bookings"
        actions={
          <Button variant="primary" onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            New Service
          </Button>
        }
      />

      <div className="grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-2 lg:grid-cols-3">
        {services?.map((service) => (
          <Card key={service.recordId}>
            <div className="flex items-start justify-between mb-[var(--bb-space-4,1rem)]">
              <div className="flex-1 min-w-0">
                <h3 className="font-[var(--bb-font-weight-semibold,600)] text-[var(--bb-font-size-md,1rem)] text-[color:var(--bb-color-text-primary)] mb-1 truncate">
                  {service.name}
                </h3>
                {service.description && (
                  <p className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)] mb-[var(--bb-space-2,0.5rem)] line-clamp-2">
                    {service.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleOpenForm(service)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(service.recordId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-[var(--bb-space-3,0.75rem)]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">Category</span>
                {getCategoryBadge(service.category)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Price
                </span>
                <span className="font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)]">
                  {formatCurrency(service.priceCents)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">Status</span>
                <Badge variant={service.isActive ? 'success' : 'neutral'}>
                  {service.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </Card>
        ))}

        {services?.length === 0 && (
          <div className="col-span-full">
            <Card>
              <div className="text-center py-[var(--bb-space-12,3rem)]">
                <DollarSign className="h-12 w-12 mx-auto mb-[var(--bb-space-4,1rem)]" style={{ color: 'var(--bb-color-text-muted)' }} />
                <h3 className="text-[var(--bb-font-size-lg,1.25rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] mb-[var(--bb-space-2,0.5rem)]">
                  No Services Yet
                </h3>
                <p className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)] mb-[var(--bb-space-4,1rem)]">
                  Create services that can be added to bookings
                </p>
                <Button variant="primary" onClick={() => handleOpenForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Service
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Service Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingService ? 'Edit Service' : 'New Service'}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Grooming, Training Session"
            required
          />

          <Textarea
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the service"
            rows={3}
          />

          <Input
            label="Price (in cents)"
            type="number"
            min="0"
            step="100"
            value={formData.priceCents}
            onChange={(e) => setFormData({ ...formData, priceCents: parseInt(e.target.value) || 0 })}
            helper={formatCurrency(formData.priceCents)}
            required
          />

          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: 'BOARDING', label: 'Boarding' },
              { value: 'DAYCARE', label: 'Daycare' },
              { value: 'GROOMING', label: 'Grooming' },
              { value: 'TRAINING', label: 'Training' },
              { value: 'OTHER', label: 'Other' },
            ]}
            menuPortalTarget={document.body}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <span className="text-sm">Active (available for bookings)</span>
          </label>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isLoading || updateMutation.isLoading}>
              {editingService ? 'Update Service' : 'Create Service'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Services;

