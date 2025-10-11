import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

const flowsKey = ['handler-flows'];
export const runLogsKey = (runId) => ['handler-runs', runId, 'logs'];
export const flowKey = (flowId) => [...flowsKey, flowId];

export const useHandlerFlowsQuery = () =>
  useQuery({
    queryKey: flowsKey,
    queryFn: () => apiClient('/api/v1/handler-flows'),
  });

export const useHandlerFlowQuery = (flowId) =>
  useQuery({
    queryKey: flowKey(flowId),
    queryFn: () => apiClient(`/api/v1/handler-flows/${flowId}`),
    enabled: Boolean(flowId),
  });

export const useCreateHandlerFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiClient('/api/v1/handler-flows', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flowsKey });
    },
  });
};

export const usePublishHandlerFlowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flowId }) => apiClient(`/api/v1/handler-flows/${flowId}/publish`, { method: 'PUT' }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: flowsKey });
      if (variables?.flowId) {
        queryClient.invalidateQueries({ queryKey: flowKey(variables.flowId) });
      }
    },
  });
};

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
    queryKey: runLogsKey(runId),
    queryFn: () => apiClient(`/api/v1/handler-runs/${runId}/logs`),
    enabled: Boolean(runId),
    refetchInterval: (query) => (query.state.data?.length ? 5000 : false),
  });
