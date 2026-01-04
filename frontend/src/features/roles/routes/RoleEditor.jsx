import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Save, 
  ArrowLeft, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import { 
  useRole, 
  useCreateRole, 
  useUpdateRole, 
  useUpdateRolePermissions 
} from '../api';
import { PERMISSION_CATEGORIES } from '@/lib/permissions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
// Replaced with LoadingState (mascot) for page-level loading
import LoadingState from '@/components/ui/LoadingState';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import RoleTemplateSelector from '../components/RoleTemplateSelector';

export default function RoleEditor() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  // When route is /settings/team/roles/new there is no :roleId param,
  // so treat missing roleId as a new role as well.
  const isNew = !roleId || roleId === 'new';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    permissions: {}
  });
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: role, isLoading } = useRole(roleId, { skip: isNew });
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const updatePermissionsMutation = useUpdateRolePermissions();

  useEffect(() => {
    if (role && !isNew) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        isActive: role.isActive !== false,
        permissions: role.permissions || {}
      });
    }
  }, [role, isNew]);

  const handleSave = async () => {
    try {
      if (isNew) {
        const created = await createRoleMutation.mutateAsync(formData);
        if (created?.recordId) {
          navigate(`/settings/team/roles/${created.recordId}`);
        } else {
          navigate('/settings/team/roles');
        }
      } else {
        // Update basic info
        await updateRoleMutation.mutateAsync({
          id: roleId,
          name: formData.name,
          description: formData.description,
          isActive: formData.isActive
        });
        
        // Update permissions separately if they changed
        if (JSON.stringify(formData.permissions) !== JSON.stringify(role.permissions)) {
          await updatePermissionsMutation.mutateAsync({
            roleId,
            permissions: formData.permissions
          });
        }
        
        navigate('/settings/team/roles');
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleAllInCategory = (category, permissions) => {
    const allChecked = Object.keys(permissions).every(
      p => formData.permissions[p] === true
    );
    
    const newPermissions = { ...formData.permissions };
    Object.keys(permissions).forEach(p => {
      newPermissions[p] = !allChecked;
    });
    
    setFormData(prev => ({
      ...prev,
      permissions: newPermissions
    }));
  };

  const selectAll = () => {
    const allPermissions = {};
    Object.values(PERMISSION_CATEGORIES).forEach(category => {
      Object.keys(category.permissions).forEach(p => {
        allPermissions[p] = true;
      });
    });
    setFormData(prev => ({ ...prev, permissions: allPermissions }));
  };

  const clearAll = () => {
    setFormData(prev => ({ ...prev, permissions: {} }));
  };

  const handleTemplateSelect = (template) => {
    setFormData({
      name: template.name,
      description: template.description,
      isActive: true,
      permissions: template.permissions
    });
    setShowTemplates(false);
  };

  if (isLoading && !isNew) {
    return <LoadingState label="Loading role…" variant="mascot" />;
  }

  if (!isNew && !isLoading && !role) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-medium">Role not found</p>
          <Button
            variant="outline"
            onClick={() => navigate('/settings/team/roles')}
            className="mt-4"
          >
            Back to Roles
          </Button>
        </div>
      </div>
    );
  }

  if (!isNew && isLoading) {
    return <LoadingState label="Loading role…" variant="mascot" />;
  }

  const isSystemRole = role?.isSystem;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings/team/roles')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              {isNew ? 'Create Role' : 'Edit Role'}
            </h1>
            <p className="text-muted">
              {isNew 
                ? 'Define a new role with specific permissions' 
                : `Editing ${role?.name || 'role'}`}
            </p>
          </div>
        </div>
        <Button 
          onClick={handleSave}
          disabled={
            !formData.name || 
            createRoleMutation.isPending || 
            updateRoleMutation.isPending ||
            updatePermissionsMutation.isPending
          }
        >
          {(createRoleMutation.isPending || 
            updateRoleMutation.isPending || 
            updatePermissionsMutation.isPending) && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          <Save className="h-4 w-4 mr-2" />
          {isNew ? 'Create Role' : 'Save Changes'}
        </Button>
      </div>

      {(
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Role Details</CardTitle>
                <CardDescription>
                  Basic information about this role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Receptionist"
                    disabled={isSystemRole}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this role is for..."
                    rows={3}
                    disabled={isSystemRole}
                  />
                </div>
                
                {!isNew && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="active">Active</Label>
                    <Switch
                      id="active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, isActive: checked }))
                      }
                      disabled={isSystemRole}
                    />
                  </div>
                )}

                {isSystemRole && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      This is a system role. Basic details cannot be modified.
                    </p>
                  </div>
                )}

                {isNew && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowTemplates(true)}
                  >
                    Choose from Template
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Permissions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Permissions</CardTitle>
                    <CardDescription>
                      Select the permissions this role should have
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 md:shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary hover:text-white"
                      onClick={selectAll}
                      disabled={isSystemRole}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary hover:text-white"
                      onClick={clearAll}
                      disabled={isSystemRole}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isSystemRole && (
                  <div className="p-3 bg-muted rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      System role permissions cannot be modified.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => {
                    const isExpanded = expandedCategories[categoryKey] !== false;
                    const permissions = category.permissions;
                    const checkedCount = Object.keys(permissions).filter(
                      p => formData.permissions[p] === true
                    ).length;
                    const totalCount = Object.keys(permissions).length;
                    const allChecked = checkedCount === totalCount;
                    const someChecked = checkedCount > 0 && checkedCount < totalCount;

                    return (
                      <div key={categoryKey} className="border rounded-lg">
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleCategory(categoryKey)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allChecked}
                              indeterminate={someChecked}
                              onCheckedChange={() => toggleAllInCategory(categoryKey, permissions)}
                              onClick={(e) => e.stopPropagation()}
                              disabled={isSystemRole}
                            />
                            <div>
                              <h3 className="font-medium">{category.label}</h3>
                              <p className="text-sm text-muted">
                                {checkedCount} of {totalCount} permissions
                              </p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted" />
                          )}
                        </div>
                        
                        {isExpanded && (
                          <div className="border-t px-4 py-3 space-y-2">
                            {Object.entries(permissions).map(([permKey, permLabel]) => (
                              <label
                                key={permKey}
                                className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded"
                              >
                                <Checkbox
                                  checked={formData.permissions[permKey] === true}
                                  onCheckedChange={(checked) => 
                                    handlePermissionChange(permKey, checked)
                                  }
                                  disabled={isSystemRole}
                                />
                                <span className="text-sm flex-1">{permLabel}</span>
                                {formData.permissions[permKey] === true ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <X className="h-4 w-4 text-muted" />
                                )}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

