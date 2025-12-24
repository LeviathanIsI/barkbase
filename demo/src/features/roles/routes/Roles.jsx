import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Users,
  Lock,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import { useRoles, useDeleteRole, useCloneRole, useInitializeSystemRoles, useCreateRole } from '../api';
import RoleTemplateSelector from '../components/RoleTemplateSelector';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreVertical } from 'lucide-react';

export default function Roles() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [deleteRole, setDeleteRole] = useState(null);
  const [cloneRole, setCloneRole] = useState(null);
  const [cloneName, setCloneName] = useState('');

  const { data, isLoading, error } = useRoles({ includeInactive: showInactive });
  const deleteRoleMutation = useDeleteRole();
  const cloneRoleMutation = useCloneRole();
  const initializeSystemRolesMutation = useInitializeSystemRoles();
  const createRoleMutation = useCreateRole();

  const roles = data?.roles || [];
  const templates = data?.templates || {};

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (deleteRole) {
      await deleteRoleMutation.mutateAsync(deleteRole.recordId);
      setDeleteRole(null);
    }
  };

  const handleClone = async () => {
    if (cloneRole && cloneName) {
      await cloneRoleMutation.mutateAsync({
        id: cloneRole.recordId,
        name: cloneName
      });
      setCloneRole(null);
      setCloneName('');
    }
  };

  const handleCreateFromTemplate = async (templateKey) => {
    // Import the templates here
    const { KENNEL_ROLE_TEMPLATES } = await import('../components/RoleTemplateSelector');
    const template = KENNEL_ROLE_TEMPLATES[templateKey];

    if (template) {
      try {
        await createRoleMutation.mutateAsync({
          name: template.name,
          description: template.description,
          permissions: template.permissions,
          isSystem: false,
          isActive: true,
          templateKey
        });

        // Success toast will be shown by the mutation
        // The page will automatically re-render with the new role
      } catch (error) {
        console.error('Failed to create role from template:', error);
        toast.error('Failed to create role from template');
      }
    }
  };

  const handleCreateNew = () => {
    navigate('/settings/team/roles/new');
  };

  const handleEdit = (roleId) => {
    navigate(`/settings/team/roles/${roleId}`);
  };

  const handleViewUsers = (roleId) => {
    navigate(`/settings/team/roles/${roleId}/users`);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted">Failed to load roles</p>
          <p className="text-sm text-muted mt-2">{error.message}</p>
          {String(error.message || '').includes('Forbidden') && (
            <p className="mt-3 text-sm text-muted">
              You do not have permission to manage roles. Ask an admin for the MANAGE_ROLES permission.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
          <p className="text-muted">Manage user roles and their permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Show inactive</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Pre-defined Role Templates
          </CardTitle>
          <CardDescription>
            Start with a template and customize permissions as needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleTemplateSelector onSelect={handleCreateFromTemplate} />
        </CardContent>
      </Card>

      {/* Roles Grid */}
      {!isLoading && (
        <>
          {/* System Roles */}
          {filteredRoles.filter(r => r.isSystem).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                System Roles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoles.filter(r => r.isSystem).map(role => (
                  <Card key={role.recordId} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {role.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {role.description}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(role.recordId)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewUsers(role.recordId)}>
                              <Users className="h-4 w-4 mr-2" />
                              View Users
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {role._count?.userRoles || 0} users
                        </Badge>
                        {!role.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Custom Roles */}
          {filteredRoles.filter(r => !r.isSystem).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Custom Roles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoles.filter(r => !r.isSystem).map(role => (
                  <Card key={role.recordId} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {role.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {role.description}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(role.recordId)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewUsers(role.recordId)}>
                              <Users className="h-4 w-4 mr-2" />
                              View Users
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setCloneRole(role);
                              setCloneName(`${role.name} (Copy)`);
                            }}>
                              <Copy className="h-4 w-4 mr-2" />
                              Clone
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteRole(role)}
                              disabled={role._count?.userRoles > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {role._count?.userRoles || 0} users
                        </Badge>
                        {!role.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredRoles.length === 0 && !searchTerm && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted mb-4" />
                <p className="text-lg font-medium">No roles yet</p>
                <p className="text-muted text-center mt-2">
                  Create your first custom role to get started
                </p>
                <Button onClick={handleCreateNew} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </CardContent>
            </Card>
          )}

          {filteredRoles.length === 0 && searchTerm && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted mb-4" />
                <p className="text-lg font-medium">No roles found</p>
                <p className="text-muted text-center mt-2">
                  Try adjusting your search criteria
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{deleteRole?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Dialog */}
      <AlertDialog open={!!cloneRole} onOpenChange={() => {
        setCloneRole(null);
        setCloneName('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone Role</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the cloned role
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Role name"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClone}
              disabled={!cloneName.trim()}
            >
              Clone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

