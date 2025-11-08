import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EVENT_OPTIONS } from '../components/HandlerFlowForm';
import {
  useHandlerFlowsQuery,
  useManualRunMutation,
  usePublishHandlerFlowMutation,
} from '../api';

const EVENT_LABEL_MAP = EVENT_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const FlowTable = ({ flows, onView, onPublish, onTest, isPublishing, isTesting }) => {
  if (!flows?.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-surface/80 py-16 text-center">
        <p className="text-lg font-semibold text-text">No handler flows yet</p>
        <p className="mt-2 max-w-md text-sm text-muted">
          Click "Create workflow" above to build your first automation. BarkBase will start listening for events immediately.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface/95 shadow-sm">
      <table className="min-w-full divide-y divide-border/60 text-sm">
        <thead className="bg-surface/90 text-left text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Flow</th>
            <th className="px-4 py-3">Trigger</th>
            <th className="px-4 py-3">Steps</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 bg-white dark:bg-surface-primary">
          {flows.map((flow) => {
            const trigger = flow.handler_triggers?.[0];
            return (
              <tr key={flow.recordId} className="hover:bg-primary/5">
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-text">{flow.name}</span>
                    <span className="mt-1 text-xs text-muted">v{flow.version}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-muted">
                  {trigger?.config?.event
                    ? EVENT_LABEL_MAP[trigger.config.event] ?? trigger.config.event
                    : trigger?.type ?? 'Manual'}
                </td>
                <td className="px-4 py-4 text-sm text-muted">{flow.handler_steps?.length ?? 0}</td>
                <td className="px-4 py-4 text-sm text-muted">{new Date(flow.updated_at).toLocaleString()}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onView(flow)}>
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPublish(flow)}
                      disabled={isPublishing}
                    >
                      {flow.status === 'published' ? 'Republish' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onTest(flow)}
                      disabled={isTesting || flow.handler_steps?.length === 0}
                    >
                      Test
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default function HandlerFlows() {
  const navigate = useNavigate();
  const flowsQuery = useHandlerFlowsQuery();
  const publishMutation = usePublishHandlerFlowMutation();
  const runMutation = useManualRunMutation();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info('[HandlerFlows] mount');
  }, []);

  const handlePublish = async (flowId) => {
    await publishMutation.mutateAsync({ flowId });
  };

  const handleTestRun = async (flow) => {
    if (flow.status !== 'published') {
      await handlePublish(flow.recordId);
    }
    const response = await runMutation.mutateAsync({
      flowId: flow.recordId,
      payload: {
        booking: { recordId: 'sample-booking', total: 120 },
        owner: { email: 'owner@example.com' },
      },
      idempotencyKey: `manual-${Date.now()}`,
    });
    if (response?.runId) {
      navigate(`/handler-flows/runs/${response.runId}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Automation"
        description="Manage existing automations, republish updates, or trigger manual test runs."
        header={
          <Button onClick={() => navigate('/handler-flows/builder')}>
            Create workflow
          </Button>
        }
      >
        {flowsQuery.isLoading ? (
          <p className="text-sm text-muted">Loading handler flows…</p>
        ) : (
          <FlowTable
            flows={flowsQuery.data}
            onView={(flow) => navigate(`/handler-flows/${flow.recordId}`)}
            onPublish={(flow) => handlePublish(flow.recordId)}
            onTest={handleTestRun}
            isPublishing={publishMutation.isPending}
            isTesting={runMutation.isPending}
          />
        )}
      </Card>
    </div>
  );
}
