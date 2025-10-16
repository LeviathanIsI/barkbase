import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

// Query keys
const roleKeys = {
  all: ['roles'],
  lists: () => [...roleKeys.all, 'list'],
  list: (filters) => [...roleKeys.lists(), filters],
  details: () => [...roleKeys.all, 'detail'],
  detail: (id) => [...roleKeys.details(), id],
  users: (id) => [...roleKeys.detail(id), 'users'],
};

// API functions
const roleApi = {
  list: (params) => apiClient.get('/api/v1/roles', { params }),
  get: (id, params) => apiClient.get(`/api/v1/roles/${id}`, { params }),
  create: (data) => apiClient.post('/api/v1/roles', data),
  update: (id, data) => apiClient.put(`/api/v1/roles/${id}`, data),
  delete: (id) => apiClient.delete(`/api/v1/roles/${id}`),
  clone: (id, data) => apiClient.post(`/api/v1/roles/${id}/clone`, data),
  getUsers: (id) => apiClient.get(`/api/v1/roles/${id}/users`),
  assignUsers: (id, userIds) => apiClient.post(`/api/v1/roles/${id}/users`, { userIds }),
  removeUsers: (id, userIds) => apiClient.delete(`/api/v1/roles/${id}/users`, { data: { userIds } }),
  updatePermissions: (id, permissions) => apiClient.put(`/api/v1/roles/${id}/permissions`, { permissions }),
  initializeSystemRoles: () => apiClient.post('/api/v1/roles/system/initialize'),
};

// Hooks
export const useRoles = (params = {}) => {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => roleApi.list(params),
  });
};

export const useRole = (roleId, options = {}) => {
  return useQuery({
    queryKey: roleKeys.detail(roleId),
    queryFn: () => roleApi.get(roleId, options),
    enabled: !!roleId && !options.skip,
  });
};

export const useRoleUsers = (roleId) => {
  return useQuery({
    queryKey: roleKeys.users(roleId),
    queryFn: () => roleApi.getUsers(roleId),
    enabled: !!roleId,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('Role created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create role');
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => roleApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) });
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update role');
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleApi.delete,
    onSuccess: (_, roleId) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      queryClient.removeQueries({ queryKey: roleKeys.detail(roleId) });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    },
  });
};

export const useCloneRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }) => roleApi.clone(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('Role cloned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to clone role');
    },
  });
};

export const useAssignUsersToRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userIds }) => roleApi.assignUsers(roleId, userIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.users(variables.roleId) });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.roleId) });
      toast.success('Users assigned to role successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign users');
    },
  });
};

export const useRemoveUsersFromRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userIds }) => roleApi.removeUsers(roleId, userIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.users(variables.roleId) });
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.roleId) });
      toast.success('Users removed from role successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to remove users');
    },
  });
};

export const useUpdateRolePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissions }) => roleApi.updatePermissions(roleId, permissions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.roleId) });
      toast.success('Permissions updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    },
  });
};

export const useInitializeSystemRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: roleApi.initializeSystemRoles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      toast.success('System roles initialized successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to initialize system roles');
    },
  });
};

