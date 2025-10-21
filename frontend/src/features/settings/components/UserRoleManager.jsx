import { useState } from 'react';
import { Shield, Plus, X, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useRoles } from '@/features/roles/api';
import apiClient from '@/lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function UserRoleManager({ user, onClose }) {
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: rolesData } = useRoles({ includeInactive: false });
  const roles = rolesData?.roles || [];
  
  // Get user's current roles
  const [userRoles, setUserRoles] = useState(user.roles || []);

  const handleAddRole = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    try {
      await apiClient.post(`/api/v1/user-permissions/${user.recordId}/roles`, {
        roleIds: [selectedRole]
      });
      
      const role = roles.find(r => r.recordId === selectedRole);
      setUserRoles([...userRoles, role]);
      setSelectedRole('');
      toast.success('Role assigned successfully');
      queryClient.invalidateQueries(['members']);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveRole = async (roleId) => {
    setIsLoading(true);
    try {
      await apiClient.delete(`/api/v1/user-permissions/${user.recordId}/roles`, {
        data: { roleIds: [roleId] }
      });
      
      setUserRoles(userRoles.filter(r => r.recordId !== roleId));
      toast.success('Role removed successfully');
      queryClient.invalidateQueries(['members']);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove role');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out already assigned roles
  const availableRoles = roles.filter(
    role => !userRoles.some(ur => ur.recordId === role.recordId)
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Assign or remove roles for {user.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current Roles */}
          <div>
            <h4 className="text-sm font-medium mb-2">Current Roles</h4>
            {userRoles.length === 0 ? (
              <p className="text-sm text-muted">No roles assigned</p>
            ) : (
              <div className="space-y-2">
                {userRoles.map(role => (
                  <div key={role.recordId} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted" />
                      <div>
                        <p className="text-sm font-medium">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-muted">{role.description}</p>
                        )}
                      </div>
                    </div>
                    {!role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRole(role.recordId)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Role */}
          {availableRoles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Add Role</h4>
              <div className="flex gap-2">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.recordId} value={role.recordId}>
                        <div>
                          <p>{role.name}</p>
                          {role.isSystem && (
                            <Badge variant="secondary" className="ml-2 text-xs">System</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddRole} 
                  disabled={!selectedRole || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Legacy Role Info */}
          {user.legacyRole && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Legacy Role: <Badge variant="outline">{user.legacyRole}</Badge>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This user's legacy role is maintained for backward compatibility
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

