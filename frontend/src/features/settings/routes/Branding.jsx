import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Palette, Type, Globe, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { saveTenantTheme } from '@/features/tenants/api';

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

// Color picker row component
const ColorField = ({ label, colorKey, register, watch, setValue, disabled }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="h-9 w-12 cursor-pointer rounded border border-border bg-surface-secondary"
        {...register(colorKey)}
        disabled={disabled}
      />
      <input
        type="text"
        value={watch(colorKey)}
        onChange={(e) => setValue(colorKey, e.target.value)}
        className="flex-1 rounded border border-border bg-surface-secondary px-2 py-1.5 text-xs font-mono"
        disabled={disabled}
        placeholder="#000000"
      />
    </div>
  </div>
);

const Branding = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const updateTheme = useTenantStore((state) => state.updateTheme);
  const setTenant = useTenantStore((state) => state.setTenant);
  const setTerminology = useTenantStore((state) => state.setTerminology);
  const hasWriteAccess = useAuthStore((state) => state.hasRole(['OWNER', 'ADMIN']));
  const canEditTheme = hasWriteAccess;

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
    if (!canEditTheme) return;

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
    if (!canEditTheme) return;

    reset(DEFAULT_THEME);

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
    <div className="space-y-4">
      {/* Page Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Theme & Branding</h1>
          <p className="mt-1 text-sm text-muted">Customize your workspace colors and terminology</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResetToDefault} disabled={!canEditTheme}>
            Reset to Default
          </Button>
          <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={!canEditTheme}>
            Apply Theme
          </Button>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Theme Configuration */}
        <div className="lg:col-span-3 space-y-4">
          {/* Brand Colors Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">Brand Colors</h2>
            </div>

            <form className="space-y-4">
              {/* 2x2 Color Grid */}
              <div className="grid grid-cols-2 gap-4">
                <ColorField
                  label="Primary Color"
                  colorKey="primaryHex"
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  disabled={!canEditTheme}
                />
                <ColorField
                  label="Secondary Color"
                  colorKey="secondaryHex"
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  disabled={!canEditTheme}
                />
                <ColorField
                  label="Accent Color"
                  colorKey="accentHex"
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  disabled={!canEditTheme}
                />
                <ColorField
                  label="Background Color"
                  colorKey="backgroundHex"
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  disabled={!canEditTheme}
                />
              </div>
            </form>
          </Card>

          {/* Terminology Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">Terminology</h2>
            </div>
            <p className="text-xs text-muted mb-3">Customize labels used throughout the app to match your business</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted">Kennel Term</label>
                <input
                  type="text"
                  className="w-full rounded border border-border bg-surface-secondary px-2 py-1.5 text-sm"
                  {...register('terminologyKennel')}
                  disabled={!canEditTheme}
                  placeholder="Kennel"
                />
                <p className="text-[10px] text-muted">e.g., Suite, Room, Unit, Crate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Preview + Domain */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Preview Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">Live Preview</h2>
            </div>

            <div className="space-y-3">
              {/* Color Swatches */}
              <div className="flex gap-2">
                <div
                  className="w-10 h-10 rounded-lg border border-border"
                  style={{ backgroundColor: watch('primaryHex') }}
                  title="Primary"
                />
                <div
                  className="w-10 h-10 rounded-lg border border-border"
                  style={{ backgroundColor: watch('secondaryHex') }}
                  title="Secondary"
                />
                <div
                  className="w-10 h-10 rounded-lg border border-border"
                  style={{ backgroundColor: watch('accentHex') }}
                  title="Accent"
                />
                <div
                  className="w-10 h-10 rounded-lg border border-border"
                  style={{ backgroundColor: watch('backgroundHex') }}
                  title="Background"
                />
              </div>

              {/* Button Preview */}
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-xs text-muted">Button</span>
                <button
                  className="px-3 py-1.5 text-xs font-medium text-white rounded"
                  style={{ backgroundColor: watch('primaryHex') }}
                >
                  Primary Action
                </button>
              </div>

              {/* Secondary Button Preview */}
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-xs text-muted">Secondary</span>
                <button
                  className="px-3 py-1.5 text-xs font-medium rounded border"
                  style={{
                    borderColor: watch('secondaryHex'),
                    color: watch('secondaryHex')
                  }}
                >
                  Secondary Action
                </button>
              </div>

              {/* Terminology Preview */}
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-xs text-muted">Terminology</span>
                <span
                  className="px-2 py-1 text-xs font-medium rounded"
                  style={{
                    backgroundColor: `${watch('primaryHex')}15`,
                    color: watch('primaryHex')
                  }}
                >
                  {watch('terminologyKennel') || 'Kennel'} A1
                </span>
              </div>

              {/* Sample Card Preview */}
              <div className="p-3 rounded-lg border border-border mt-2 bg-surface-secondary">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: watch('primaryHex') }}
                  />
                  <div>
                    <div className="text-xs font-medium" style={{ color: watch('primaryHex') }}>Max the Dog</div>
                    <div className="text-[10px] text-muted">{watch('terminologyKennel') || 'Kennel'} B2</div>
                  </div>
                </div>
                <div
                  className="text-[10px] px-1.5 py-0.5 rounded inline-block"
                  style={{
                    backgroundColor: `${watch('accentHex')}20`,
                    color: watch('accentHex')
                  }}
                >
                  Check-in Today
                </div>
              </div>
            </div>
          </Card>

          {/* Custom Domain Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-muted" />
              <h2 className="text-sm font-semibold text-text">Custom Domain</h2>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Custom domain configuration is available on the Enterprise plan. Contact sales to learn more.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Branding;
