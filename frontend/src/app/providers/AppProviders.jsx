import { ThemeProvider } from "@/contexts/ThemeContext";
import { RealtimeClient } from "@/lib/realtime";
import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";
import { Suspense, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import AuthLoader from "./AuthLoader";
import QueryProvider from "./QueryProvider";
import TenantLoader from "./TenantLoader";
import TokenRefresher from "./TokenRefresher";

const RealtimeProvider = ({ children }) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const tenant = useTenantStore((s) => s.tenant?.slug);
  const [client, setClient] = useState(null);
  useEffect(() => {
    if (!accessToken || !tenant) return;
    // Use AWS WebSocket URL or disable if not configured
    const url = import.meta.env.VITE_REALTIME_URL || "disabled";
    const c =
      url === "disabled"
        ? null
        : new RealtimeClient(url, accessToken, tenant?.recordId || "default");
    if (c) {
      c.connect();
      setClient(c);
      return () => c.disconnect();
    }
  }, [accessToken, tenant]);
  return children;
};

const AppProviders = ({ children, fallback = null }) => (
  <ThemeProvider>
    <QueryProvider>
      <RealtimeProvider>
        <AuthLoader />
        <TenantLoader />
        <TokenRefresher />
        <Suspense fallback={fallback}>{children}</Suspense>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </RealtimeProvider>
    </QueryProvider>
  </ThemeProvider>
);

export default AppProviders;
