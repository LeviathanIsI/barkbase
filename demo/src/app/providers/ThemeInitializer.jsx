import { useEffect } from 'react';
import { useTenantStore } from '@/stores/tenant';
import { applyTheme, getDefaultTheme } from '@/lib/theme';

const ThemeInitializer = ({ children }) => {
  const theme = useTenantStore((state) => state.tenant.theme);

  useEffect(() => {
    applyTheme(theme ?? getDefaultTheme());
  }, [theme]);

  return children;
};

export default ThemeInitializer;
