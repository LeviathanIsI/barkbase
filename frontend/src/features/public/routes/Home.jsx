import { Link, Navigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth';

const Home = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  if (isAuthenticated) {
    return <Navigate to="/today" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/70 bg-surface/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">BarkBase</p>
            <h1 className="text-2xl font-semibold text-text">Kennel management made simple</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Start free trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto grid w-full max-w-4xl gap-10 text-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-semibold text-text sm:text-4xl">
              Run your boarding, daycare, and grooming operations from one tenant-aware workspace.
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted">
              BarkBase keeps bookings, pets, staff, and billing synced per location. Onboard your team in minutes and
              unlock real-time updates, usage analytics, and theme customization—no spreadsheets required.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/signup">Create my workspace</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Already have an account? Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="h-full text-left">
              <h3 className="text-lg font-semibold text-text">Multi-tenant by design</h3>
              <p className="mt-2 text-sm text-muted">
                Each business operates in an isolated workspace with plan-based feature flags and audit trails.
              </p>
            </Card>
            <Card className="h-full text-left">
              <h3 className="text-lg font-semibold text-text">Realtime updates</h3>
              <p className="mt-2 text-sm text-muted">
                Drag-and-drop bookings sync instantly. Staff see accurate occupancy and waitlists without a refresh.
              </p>
            </Card>
            <Card className="h-full text-left">
              <h3 className="text-lg font-semibold text-text">Flexible plans</h3>
              <p className="mt-2 text-sm text-muted">
                Start on the FREE tier and upgrade when you need billing automation, advanced analytics, or concierge support.
              </p>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/70 bg-surface/90 px-6 py-6 text-center text-sm text-muted">
        <p>© {new Date().getFullYear()} BarkBase. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
