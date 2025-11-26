import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export default function RouteError() {
  const err = useRouteError();
  console.error('[RouteError]', err);

  if (isRouteErrorResponse(err)) {
    return (
      <div style={{ padding: 24 }}>
        <h2>
          {err.status} {err.statusText}
        </h2>
        <pre>{JSON.stringify(err.data ?? {}, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Route Render Error</h2>
      <pre>{String(err?.message || err)}</pre>
    </div>
  );
}

