import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useRunLogsQuery } from '../api';

export default function HandlerRunDetail() {
  const { runId } = useParams();
  const logsQuery = useRunLogsQuery(runId);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.info('[HandlerRunDetail] mount');
  }, []);

  if (logsQuery.isLoading) {
    return <p className="text-sm text-muted">Loading run logs…</p>;
  }

  const logs = logsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card
        title={`Run ${runId}`}
        description="Live execution logs. Refreshes automatically while the run is active."
        header={
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => logsQuery.refetch()}>
              Refresh
            </Button>
            <Badge variant="neutral">{logs.length} entries</Badge>
          </div>
        }
      >
        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-sm text-muted">No logs yet. Waiting for the worker to process this run.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.recordId}
                className="rounded-lg border border-border/60 bg-surface/95 p-4 text-sm text-muted"
              >
                <div className="flex items-center justify-between gap-3 text-xs text-muted">
                  <span className="font-semibold text-text">
                    {new Date(log.ts).toLocaleTimeString()} - {log.step_id ?? 'run'}
                  </span>
                  <Badge
                    variant={
                      log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'neutral'
                    }
                    className="uppercase"
                  >
                    {log.level}
                  </Badge>
                </div>
                <p className="mt-2 text-text">{log.message ?? 'No message'}</p>
                {log.output ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-background/40 p-3 text-xs text-muted">
                    {JSON.stringify(log.output ?? {}, null, 2)}
                  </pre>
                ) : null}
                {log.error ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-danger/10 p-3 text-xs text-danger">
                    {JSON.stringify(log.error ?? {}, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
