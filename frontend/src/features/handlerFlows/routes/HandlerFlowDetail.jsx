import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useHandlerFlowQuery, usePublishHandlerFlowMutation } from '../api';

export default function HandlerFlowDetail() {
  const { flowId } = useParams();
  const flowQuery = useHandlerFlowQuery(flowId);
  const publishMutation = usePublishHandlerFlowMutation();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info('[HandlerFlowDetail] mount');
  }, []);

  if (flowQuery.isLoading) {
    return <p className="text-sm text-muted">Loading flow…</p>;
  }

  if (!flowQuery.data) {
    return <p className="text-sm text-danger">Flow not found.</p>;
  }

  const flow = flowQuery.data;
  const trigger = flow.handler_triggers?.[0];

  return (
    <div className="space-y-6">
      <Card
        title={flow.name}
        description="Details of the selected handler flow."
        header={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={flow.status === 'published' ? 'success' : 'warning'} className="uppercase">
              {flow.status}
            </Badge>
            <Badge variant="neutral">v{flow.version}</Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => publishMutation.mutateAsync({ flowId })}
              disabled={publishMutation.isPending}
            >
              {flow.status === 'published' ? 'Republish' : 'Publish'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Trigger</h3>
            <p className="mt-1 text-sm text-text">
              {trigger?.type ?? 'Unknown'}{trigger?.config?.event ? ` - ${trigger.config.event}` : ''}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Steps</h3>
            <div className="mt-2 space-y-3">
              {(flow.handler_steps ?? []).map((step) => (
                <div key={step.id} className="rounded-lg border border-border/60 bg-surface/95 p-4">
                  <p className="text-sm font-semibold text-text">
                    {step.name}{' '}
                    <Badge variant="neutral" className="uppercase">
                      {step.kind}
                    </Badge>
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded bg-background/40 p-3 text-xs text-muted">
                    {JSON.stringify(step.config ?? {}, null, 2)}
                  </pre>
                  <p className="mt-2 text-xs text-muted">
                    Next: {step.next_id ?? 'END'}{step.alt_next_id ? ` (alt: ${step.alt_next_id})` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
