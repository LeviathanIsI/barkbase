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
import { SlideoutProvider, SlideoutHost } from "@/components/slideout";
import { realtimeUrl } from "@/config/env";

const RealtimeProvider = ({ children }) => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userIdentifier = useAuthStore(
    (s) =>
      s.user?.recordId ??
      s.user?.id ??
      s.user?.sub ??
      s.user?.userId ??
      s.tenantId ??
      null
  );
  const tenantRecordId = useTenantStore((s) => s.tenant?.recordId);
  const tenantSlug = useTenantStore((s) => s.tenant?.slug);
  const tenantIdentifier = tenantRecordId ?? tenantSlug ?? "default";
  const [, setClient] = useState(null);
  useEffect(() => {
    if (!accessToken || !tenantIdentifier) return;
    // Use centralized realtime URL config or disable if not configured
    const url = realtimeUrl || "disabled";
    const identity = userIdentifier ?? accessToken ?? "anonymous";
    const c =
      url === "disabled" ? null : new RealtimeClient(url, identity, tenantIdentifier);
    if (c) {
      c.connect();
      setClient(c);
      return () => c.disconnect();
    }
  }, [accessToken, tenantIdentifier, userIdentifier]);
  return children;
};

const AppProviders = ({ children, fallback = null }) => (
  <ThemeProvider>
    <QueryProvider>
      <SlideoutProvider>
        <RealtimeProvider>
          <AuthLoader />
          <TenantLoader />
          <TokenRefresher />
          <Suspense fallback={fallback}>{children}</Suspense>
          <SlideoutHost />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </RealtimeProvider>
      </SlideoutProvider>
    </QueryProvider>
  </ThemeProvider>
);

export default AppProviders;
