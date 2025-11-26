import { useMutation, useQuery } from '@tanstack/react-query';

// handler-flows endpoints DISABLED (backend not implemented)
// All hooks return no-op/empty data to prevent runtime 404s.
// UI components can still render but will show empty states.

const disabledQuery = () => Promise.resolve(null);
const disabledMutation = () => Promise.resolve({ success: false, message: 'Handler flows backend not implemented' });

export const useHandlerFlowsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['handlerFlows'],
    queryFn: disabledQuery,
    enabled: false,
  });
};

export const useHandlerFlowQuery = (flowId) =>
  useQuery({
    queryKey: ['handlerFlows', flowId],
    queryFn: disabledQuery,
    enabled: false, // Disabled - backend not implemented
  });

export const useCreateHandlerFlowMutation = () => {
  return useMutation({
    mutationFn: disabledMutation,
    // No-op: backend not implemented
  });
};

export const useUpdateHandlerFlowMutation = () => {
  return useMutation({
    mutationFn: disabledMutation,
    // No-op: backend not implemented
  });
};

export const usePublishHandlerFlowMutation = () => {
  return useMutation({
    mutationFn: disabledMutation,
    // No-op: backend not implemented
  });
};

export const useValidateFlowMutation = () =>
  useMutation({
    mutationFn: disabledMutation,
    // No-op: backend not implemented
  });

export const useManualRunMutation = () =>
  useMutation({
    mutationFn: disabledMutation,
    // No-op: backend not implemented
  });

export const useRunLogsQuery = (runId) =>
  useQuery({
    queryKey: ['handlerRuns', runId, 'logs'],
    queryFn: disabledQuery,
    enabled: false, // Disabled - backend not implemented
  });
