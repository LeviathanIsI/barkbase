import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { isFeatureEnabled } from '@/lib/features';
import { saveTenantTheme } from '../api';

const ThemePreview = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const updateTheme = useTenantStore((state) => state.updateTheme);
  const setTenant = useTenantStore((state) => state.setTenant);
  const setTerminology = useTenantStore((state) => state.setTerminology);
  const hasWriteAccess = useAuthStore((state) => state.hasRole(['OWNER', 'ADMIN']));
  const canEditTheme =
    hasWriteAccess &&
    isFeatureEnabled('theme.editor', {
      plan: tenant.plan,
      overrides: tenant.featureFlags,
      features: tenant.features,
    });
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      primary: tenant.theme?.colors?.primary ?? '59 130 246',
      secondary: tenant.theme?.colors?.secondary ?? '129 140 248',
      accent: tenant.theme?.colors?.accent ?? '249 115 22',
      terminologyKennel: tenant.terminology?.kennel ?? 'Kennel',
    },
  });

  useEffect(() => {
    reset({
      primary: tenant.theme?.colors?.primary ?? '59 130 246',
      secondary: tenant.theme?.colors?.secondary ?? '129 140 248',
      accent: tenant.theme?.colors?.accent ?? '249 115 22',
      terminologyKennel: tenant.terminology?.kennel ?? 'Kennel',
    });
  }, [tenant, reset]);

  const onSubmit = async (values) => {
    if (!canEditTheme) {
      return;
    }
    const themePayload = {
      colors: {
        primary: values.primary,
        secondary: values.secondary,
        accent: values.accent,
        surface: tenant.theme?.colors?.surface,
        background: tenant.theme?.colors?.background,
        text: tenant.theme?.colors?.text,
        muted: tenant.theme?.colors?.muted,
        border: tenant.theme?.colors?.border,
        success: tenant.theme?.colors?.success,
        warning: tenant.theme?.colors?.warning,
        danger: tenant.theme?.colors?.danger,
      },
      mode: tenant.theme?.mode,
    };

    updateTheme(themePayload);
    setTerminology({ kennel: values.terminologyKennel });

    try {
      const updated = await saveTenantTheme(themePayload);
      setTenant(updated);
      toast.success('Theme saved');
    } catch (error) {
      toast.error(error.message ?? 'Failed to save theme');
    }
  };

  return (
    <Card
      title="Tenant Theme"
      description="Inject brand colors, logos, and terminology instantly across the app."
    >
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="text-sm font-medium text-text">
          Primary Color
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            {...register('primary')}
            disabled={!canEditTheme}
          />
        </label>
        <label className="text-sm font-medium text-text">
          Secondary Color
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            {...register('secondary')}
            disabled={!canEditTheme}
          />
        </label>
        <label className="text-sm font-medium text-text">
          Accent Color
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            {...register('accent')}
            disabled={!canEditTheme}
          />
        </label>
        <label className="text-sm font-medium text-text">
          Terminology: Kennel
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            {...register('terminologyKennel')}
            disabled={!canEditTheme}
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={!canEditTheme}>
            Apply Theme
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!canEditTheme}
            onClick={() => updateTheme({ mode: tenant.theme.mode === 'dark' ? 'light' : 'dark' })}
          >
            Toggle Mode
          </Button>
        </div>
        {!canEditTheme ? (
          <p className="text-xs text-muted">
            Theme editing is available for PRO plans and above with admin access.
          </p>
        ) : null}
      </form>
      <div className="mt-6 grid gap-3 rounded-2xl border border-border/60 bg-surface/70 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Preview Button</span>
          <Button size="sm">Primary Action</Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Terminology</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {tenant.terminology?.kennel ?? 'Kennel'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ThemePreview;
