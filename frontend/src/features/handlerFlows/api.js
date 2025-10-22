import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

// NOTE: The 'handlerFlows' feature appears to be highly custom.
// The table 'handler_flows' does not exist in the schema.
// All API calls will be disabled until a proper backend is created for this feature.
const disabledQuery = () => Promise.resolve(null);

export const useHandlerFlowsQuery = (options = {}) => {
  return useQuery({
    queryKey: ['handlerFlows'],
    queryFn: disabledQuery, // implement REST when backend exists
    enabled: false,
  });
};

export const useHandlerFlowQuery = (flowId) =>
  useQuery({
    queryKey: ['handlerFlows', flowId],
    queryFn: disabledQuery,
    enabled: Boolean(flowId),
  });

export const useCreateHandlerFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiClient('/api/v1/handler-flows', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handlerFlows'] });
    },
  });
};

export const useUpdateHandlerFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId, ...payload }) =>
      apiClient(`/api/v1/handler-flows/${flowId}`, { method: 'POST', body: payload }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['handlerFlows'] });
      if (variables?.flowId) {
        queryClient.invalidateQueries({ queryKey: ['handlerFlows', variables.flowId] });
      }
    },
  });
};

export const usePublishHandlerFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId }) => apiClient(`/api/v1/handler-flows/${flowId}/publish`, { method: 'POST' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['handlerFlows'] });
      if (variables?.flowId) {
        queryClient.invalidateQueries({ queryKey: ['handlerFlows', variables.flowId] });
      }
    },
  });
};

export const useValidateFlowMutation = () =>
  useMutation({
    mutationFn: (definition) =>
      apiClient('/api/v1/handler-flows/validate', {
        method: 'POST',
        body: { definition },
      }),
  });

export const useManualRunMutation = () =>
  useMutation({
    mutationFn: ({ flowId, payload, idempotencyKey }) =>
      apiClient(`/api/v1/handler-flows/${flowId}/run`, {
        method: 'POST',
        body: { payload, idempotencyKey },
      }),
  });

export const useRunLogsQuery = (runId) =>
  useQuery({
    queryKey: ['handlerRuns', runId, 'logs'],
    queryFn: disabledQuery,
    enabled: Boolean(runId),
    refetchInterval: (query) => (query.state.data?.length ? 5000 : false),
  });
