import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <p className="text-xs uppercase tracking-widest text-muted">404</p>
    <h1 className="text-3xl font-semibold text-text">We lost that page</h1>
    <p className="max-w-md text-sm text-muted">
      It might have been moved or removed. Use the navigation to find what you need or head back to the dashboard.
    </p>
    <Link
      to="/"
      className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface shadow-sm hover:bg-primary/90"
    >
      Return to dashboard
    </Link>
  </div>
);

export default NotFound;
