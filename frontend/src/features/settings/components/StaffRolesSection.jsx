/**
 * Staff Roles Management Section
 *
 * Allows tenants to configure custom staff roles with colors.
 * Used in Settings > Users & Teams page.
 */

import { useState } from 'react';
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  Star,
  Check,
  X,
  Loader2,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { useTenantStore } from '@/stores/tenant';
import {
  useStaffRoles,
  roleColorPresets,
  generateRoleId,
  validateRole,
  defaultStaffRoles,
} from '@/lib/useStaffRoles';

const StaffRolesSection = () => {
  const staffRoles = useStaffRoles();
  const setStaffRoles = useTenantStore((state) => state.setStaffRoles);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    isDefault: false,
  });
  const [formError, setFormError] = useState(null);

  const resetForm = () => {
    setFormData({ name: '', color: '#3B82F6', isDefault: false });
    setFormError(null);
  };

  const openAddModal = () => {
    resetForm();
    setEditingRole(null);
    setShowAddModal(true);
  };

  const openEditModal = (role) => {
    setFormData({
      name: role.name,
      color: role.color,
      isDefault: role.isDefault,
    });
    setFormError(null);
    setEditingRole(role);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingRole(null);
    resetForm();
  };

  const handleSaveRole = async () => {
    const validation = validateRole(formData, staffRoles, editingRole?.id);
    if (!validation.valid) {
      setFormError(validation.error);
      return;
    }

    setIsSaving(true);
    try {
      let updatedRoles;

      if (editingRole) {
        // Update existing role
        updatedRoles = staffRoles.map((r) => {
          if (r.id === editingRole.id) {
            return { ...r, name: formData.name, color: formData.color, isDefault: formData.isDefault };
          }
          // If this role is now default, remove default from others
          if (formData.isDefault && r.isDefault && r.id !== editingRole.id) {
            return { ...r, isDefault: false };
          }
          return r;
        });
      } else {
        // Add new role
        const newRole = {
          id: generateRoleId(formData.name),
          name: formData.name,
          color: formData.color,
          isDefault: formData.isDefault,
        };

        // If new role is default, remove default from others
        if (formData.isDefault) {
          updatedRoles = staffRoles.map((r) => ({ ...r, isDefault: false }));
          updatedRoles.push(newRole);
        } else {
          updatedRoles = [...staffRoles, newRole];
        }
      }

      // TODO: Save to API
      // await apiClient.put('/api/v1/settings/staff-roles', { staffRoles: updatedRoles });

      setStaffRoles(updatedRoles);
      closeModal();
    } catch (error) {
      console.error('Failed to save role:', error);
      setFormError('Failed to save role. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (staffRoles.length <= 1) {
      alert('You must have at least one role');
      return;
    }

    setIsSaving(true);
    try {
      const roleToDelete = staffRoles.find((r) => r.id === roleId);
      let updatedRoles = staffRoles.filter((r) => r.id !== roleId);

      // If we deleted the default role, make the first remaining role default
      if (roleToDelete?.isDefault && updatedRoles.length > 0) {
        updatedRoles = updatedRoles.map((r, i) => ({
          ...r,
          isDefault: i === 0,
        }));
      }

      // TODO: Save to API
      // await apiClient.delete(`/api/v1/settings/staff-roles/${roleId}`);

      setStaffRoles(updatedRoles);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (roleId) => {
    const updatedRoles = staffRoles.map((r) => ({
      ...r,
      isDefault: r.id === roleId,
    }));

    // TODO: Save to API
    setStaffRoles(updatedRoles);
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all roles to defaults? This will remove any custom roles.')) {
      setStaffRoles(defaultStaffRoles);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Staff Roles
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Define roles that can be assigned to staff members
          </p>
        </div>
        <Button size="sm" onClick={openAddModal}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Role
        </Button>
      </div>

      {/* Roles List */}
      <div className="space-y-2">
        {staffRoles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-3 p-3 bg-surface-alt/50 border border-border rounded-lg hover:bg-surface-alt transition-colors group"
          >
            {/* Color Dot */}
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white/20"
              style={{ backgroundColor: role.color }}
            />

            {/* Name */}
            <span className="text-sm font-medium text-text flex-1">{role.name}</span>

            {/* Default Badge */}
            {role.isDefault && (
              <span className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                <Star className="w-3 h-3" />
                Default
              </span>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!role.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(role.id)}
                  className="p-1.5 text-muted hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                  title="Set as default"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => openEditModal(role)}
                className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
                title="Edit role"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(role)}
                className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                title="Delete role"
                disabled={staffRoles.length <= 1}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end mt-4 pt-3 border-t border-border">
        <Button variant="ghost" size="sm" onClick={handleResetToDefaults}>
          Reset to Defaults
        </Button>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showAddModal}
        onClose={closeModal}
        title={editingRole ? 'Edit Role' : 'Add Role'}
        size="sm"
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          {/* Role Name */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Role Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Vet Tech, Bather, Front Desk"
              maxLength={50}
            />
            <p className="text-xs text-muted mt-1">{formData.name.length}/50 characters</p>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {roleColorPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: preset.value })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.color === preset.value
                      ? 'border-white ring-2 ring-primary scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
            {/* Custom Color Input */}
            <div className="flex items-center gap-2 mt-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1 px-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Default Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
            />
            <span className="text-sm text-text">Set as default for new staff</span>
          </label>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">Preview</label>
            <div className="flex items-center gap-2 p-2 bg-surface-alt rounded-lg">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm font-medium text-text">
                {formData.name || 'Role Name'}
              </span>
              {formData.isDefault && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Star className="w-3 h-3" />
                  Default
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isSaving || !formData.name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {editingRole ? 'Update Role' : 'Add Role'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            Are you sure you want to delete the role "{deleteConfirm?.name}"?
          </p>

          {deleteConfirm?.isDefault && (
            <div className="flex items-start gap-2 text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                This is the default role. Another role will be set as default after deletion.
              </span>
            </div>
          )}

          {/* TODO: Show count of staff using this role and require reassignment */}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteRole(deleteConfirm?.id)}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Role
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default StaffRolesSection;
