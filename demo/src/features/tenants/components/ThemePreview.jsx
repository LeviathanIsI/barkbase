import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { saveTenantTheme } from '../api';

// Default theme values
const DEFAULT_THEME = {
  primaryHex: '#3b82f6',
  secondaryHex: '#818cf8',
  accentHex: '#f97316',
  backgroundHex: '#ffffff',
  terminologyKennel: 'Kennel',
};

// Convert RGB string "59 130 246" to hex "#3b82f6"
const rgbToHex = (rgb) => {
  if (!rgb) return '#3b82f6';
  const parts = rgb.trim().split(/\s+/).map(Number);
  if (parts.length !== 3) return '#3b82f6';
  const [r, g, b] = parts;
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Convert hex "#3b82f6" to RGB string "59 130 246"
const hexToRgb = (hex) => {
  if (!hex) return '59 130 246';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '59 130 246';
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
};

const ThemePreview = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const updateTheme = useTenantStore((state) => state.updateTheme);
  const setTenant = useTenantStore((state) => state.setTenant);
  const setTerminology = useTenantStore((state) => state.setTerminology);
  const hasWriteAccess = useAuthStore((state) => state.hasRole(['OWNER', 'ADMIN']));
  const canEditTheme = hasWriteAccess; // Available for all tiers with admin access

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      primaryHex: rgbToHex(tenant.theme?.colors?.primary ?? '59 130 246'),
      secondaryHex: rgbToHex(tenant.theme?.colors?.secondary ?? '129 140 248'),
      accentHex: rgbToHex(tenant.theme?.colors?.accent ?? '249 115 22'),
      backgroundHex: rgbToHex(tenant.theme?.colors?.background ?? '255 255 255'),
      terminologyKennel: tenant.terminology?.kennel ?? 'Kennel',
    },
  });

  useEffect(() => {
    reset({
      primaryHex: rgbToHex(tenant.theme?.colors?.primary ?? '59 130 246'),
      secondaryHex: rgbToHex(tenant.theme?.colors?.secondary ?? '129 140 248'),
      accentHex: rgbToHex(tenant.theme?.colors?.accent ?? '249 115 22'),
      backgroundHex: rgbToHex(tenant.theme?.colors?.background ?? '255 255 255'),
      terminologyKennel: tenant.terminology?.kennel ?? 'Kennel',
    });
  }, [tenant, reset]);

  const onSubmit = async (values) => {
    if (!canEditTheme) {
      return;
    }
    const themePayload = {
      colors: {
        primary: hexToRgb(values.primaryHex),
        secondary: hexToRgb(values.secondaryHex),
        accent: hexToRgb(values.accentHex),
        background: hexToRgb(values.backgroundHex),
        surface: tenant.theme?.colors?.surface,
        text: tenant.theme?.colors?.text,
        muted: tenant.theme?.colors?.muted,
        border: tenant.theme?.colors?.border,
        success: tenant.theme?.colors?.success,
        warning: tenant.theme?.colors?.warning,
        danger: tenant.theme?.colors?.danger,
      },
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

  const handleResetToDefault = async () => {
    if (!canEditTheme) {
      return;
    }

    // Reset form values to defaults
    reset(DEFAULT_THEME);

    // Create default theme payload
    const defaultThemePayload = {
      colors: {
        primary: hexToRgb(DEFAULT_THEME.primaryHex),
        secondary: hexToRgb(DEFAULT_THEME.secondaryHex),
        accent: hexToRgb(DEFAULT_THEME.accentHex),
        background: hexToRgb(DEFAULT_THEME.backgroundHex),
        surface: tenant.theme?.colors?.surface,
        text: tenant.theme?.colors?.text,
        muted: tenant.theme?.colors?.muted,
        border: tenant.theme?.colors?.border,
        success: tenant.theme?.colors?.success,
        warning: tenant.theme?.colors?.warning,
        danger: tenant.theme?.colors?.danger,
      },
    };

    updateTheme(defaultThemePayload);
    setTerminology({ kennel: DEFAULT_THEME.terminologyKennel });

    try {
      const updated = await saveTenantTheme(defaultThemePayload);
      setTenant(updated);
      toast.success('Theme reset to defaults');
    } catch (error) {
      toast.error(error.message ?? 'Failed to reset theme');
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
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-surface"
              {...register('primaryHex')}
              disabled={!canEditTheme}
            />
            <input
              type="text"
              value={watch('primaryHex')}
              onChange={(e) => setValue('primaryHex', e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono"
              disabled={!canEditTheme}
              placeholder="#3b82f6"
            />
          </div>
        </label>
        <label className="text-sm font-medium text-text">
          Secondary Color
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-surface"
              {...register('secondaryHex')}
              disabled={!canEditTheme}
            />
            <input
              type="text"
              value={watch('secondaryHex')}
              onChange={(e) => setValue('secondaryHex', e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono"
              disabled={!canEditTheme}
              placeholder="#818cf8"
            />
          </div>
        </label>
        <label className="text-sm font-medium text-text">
          Accent Color
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-surface"
              {...register('accentHex')}
              disabled={!canEditTheme}
            />
            <input
              type="text"
              value={watch('accentHex')}
              onChange={(e) => setValue('accentHex', e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono"
              disabled={!canEditTheme}
              placeholder="#f97316"
            />
          </div>
        </label>
        <label className="text-sm font-medium text-text">
          Background Color
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-surface"
              {...register('backgroundHex')}
              disabled={!canEditTheme}
            />
            <input
              type="text"
              value={watch('backgroundHex')}
              onChange={(e) => setValue('backgroundHex', e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-mono"
              disabled={!canEditTheme}
              placeholder="#ffffff"
            />
          </div>
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
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canEditTheme}>
            Apply Theme
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canEditTheme}
            onClick={handleResetToDefault}
          >
            Reset to Default
          </Button>
        </div>
      </form>
      <div className="mt-6 grid gap-3 rounded-lg border border-border/60 bg-surface/70 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Preview Button</span>
          <Button size="sm">Primary Action</Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Terminology</span>
          <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {tenant.terminology?.kennel ?? 'Kennel'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ThemePreview;
