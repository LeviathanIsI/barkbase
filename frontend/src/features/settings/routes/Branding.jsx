import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Palette,
  Type,
  Globe,
  Sparkles,
  Upload,
  ImageIcon,
  Sun,
  Moon,
  Check,
  Loader2,
  Bell,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import apiClient, { uploadFile } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

// Default theme values - must match the actual app defaults from tokens.css
// The app uses amber (#f59e0b) as the single brand/accent color
const DEFAULT_THEME = {
  primaryHex: '#f59e0b',   // amber-500 - --bb-color-accent, used for primary buttons
  secondaryHex: '#d97706', // amber-600 - darker variant for secondary elements
  accentHex: '#f59e0b',    // amber-500 - same as primary, the app's brand color
  terminologyKennel: 'Kennel',
  fontPairing: 'modern',
  squareLogo: null,
  wideLogo: null,
};

// Preset color swatches for quick selection
// Amber is the app's default brand color
const COLOR_PRESETS = {
  primary: [
    { hex: '#f59e0b', name: 'Amber (Default)' },
    { hex: '#3b82f6', name: 'Blue' },
    { hex: '#8b5cf6', name: 'Purple' },
    { hex: '#06b6d4', name: 'Cyan' },
    { hex: '#10b981', name: 'Emerald' },
    { hex: '#ef4444', name: 'Red' },
  ],
  secondary: [
    { hex: '#d97706', name: 'Amber Dark (Default)' },
    { hex: '#818cf8', name: 'Indigo' },
    { hex: '#a78bfa', name: 'Violet' },
    { hex: '#22d3ee', name: 'Sky' },
    { hex: '#34d399', name: 'Green' },
    { hex: '#f87171', name: 'Rose' },
  ],
  accent: [
    { hex: '#f59e0b', name: 'Amber (Default)' },
    { hex: '#f97316', name: 'Orange' },
    { hex: '#ec4899', name: 'Pink' },
    { hex: '#14b8a6', name: 'Teal' },
    { hex: '#84cc16', name: 'Lime' },
    { hex: '#6366f1', name: 'Indigo' },
  ],
};

// Font pairings with CSS font-family values
const FONT_PAIRINGS = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean and contemporary',
    heading: 'Inter',
    body: 'Inter',
    headingFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    bodyFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless and elegant',
    heading: 'Georgia',
    body: 'system-ui',
    headingFamily: "Georgia, 'Times New Roman', serif",
    bodyFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm and approachable',
    heading: 'Nunito',
    body: 'Nunito',
    headingFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
    bodyFamily: "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate and trustworthy',
    heading: 'Roboto',
    body: 'Roboto',
    headingFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    bodyFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Fun and energetic',
    heading: 'Poppins',
    body: 'Poppins',
    headingFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
    bodyFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },
];

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

// Get contrasting text color for a background
const getContrastColor = (hex) => {
  if (!hex) return '#ffffff';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '#ffffff';
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// Logo Upload Component
const LogoUpload = ({ label, description, value, onChange, disabled, aspectRatio = 'square' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file) => {
    if (!file || disabled) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, WebP, or SVG file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const { publicUrl } = await uploadFile({ file, category: 'branding' });
      onChange(publicUrl);
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted">{label}</label>
      <p className="text-[10px] text-muted">{description}</p>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-colors cursor-pointer',
          aspectRatio === 'wide' ? 'aspect-[3/1]' : 'aspect-square w-24',
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById(`logo-${aspectRatio}`)?.click()}
      >
        <input
          id={`logo-${aspectRatio}`}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0])}
          disabled={disabled}
        />

        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : value ? (
          <img src={value} alt={label} className="absolute inset-0 w-full h-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
            <Upload className="h-5 w-5" />
            <span className="text-[10px]">Drop or click</span>
          </div>
        )}
      </div>
      {value && !disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
          className="text-[10px] text-red-500 hover:text-red-600"
        >
          Remove
        </button>
      )}
    </div>
  );
};

// Enhanced Color Field with Swatches
const ColorField = ({ label, colorKey, presets, register, watch, setValue, disabled }) => {
  const currentValue = watch(colorKey);

  return (
    <div className="space-y-2">
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
          value={currentValue}
          onChange={(e) => setValue(colorKey, e.target.value, { shouldDirty: true })}
          className="flex-1 rounded border border-border bg-surface-secondary px-2 py-1.5 text-xs font-mono"
          disabled={disabled}
          placeholder="#000000"
        />
      </div>
      {presets && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {presets.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              onClick={() => !disabled && setValue(colorKey, preset.hex, { shouldDirty: true })}
              className={cn(
                'h-6 w-6 rounded border-2 transition-all',
                currentValue === preset.hex ? 'border-white ring-2 ring-primary' : 'border-transparent hover:scale-110'
              )}
              style={{ backgroundColor: preset.hex }}
              title={preset.name}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Font Pairing Selector - renders each option with its actual font
const FontPairingSelector = ({ value, onChange, disabled }) => (
  <div className="space-y-3">
    {FONT_PAIRINGS.map((pairing) => (
      <button
        key={pairing.id}
        type="button"
        onClick={() => !disabled && onChange(pairing.id)}
        disabled={disabled}
        className={cn(
          'w-full p-3 rounded-lg border text-left transition-all',
          value === pairing.id
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-border hover:border-primary/50'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-sm font-semibold text-text"
            style={{ fontFamily: pairing.headingFamily }}
          >
            {pairing.name}
          </span>
          {value === pairing.id && <Check className="h-4 w-4 text-primary" />}
        </div>
        <p
          className="text-xs text-muted"
          style={{ fontFamily: pairing.bodyFamily }}
        >
          {pairing.description}
        </p>
        <div className="mt-2 pt-2 border-t border-border/50 flex gap-2 text-[10px] text-muted">
          <span>Heading: {pairing.heading}</span>
          <span>|</span>
          <span>Body: {pairing.body}</span>
        </div>
      </button>
    ))}
  </div>
);

// Live Preview Component - uses actual app theme colors from design-tokens.css
const LivePreview = ({ colors, terminology, fontPairing, squareLogo, previewMode }) => {
  const isDark = previewMode === 'dark';

  // Actual app theme colors from design-tokens.css
  const bgColor = isDark ? '#1a1d23' : '#ffffff';           // --bg-primary
  const surfaceColor = isDark ? '#242930' : '#f9fafb';      // --bg-secondary / --color-gray-50
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#d1d5db'; // --border-color / --color-gray-300
  const textColor = isDark ? '#e5e7eb' : '#111827';         // --text-primary / --color-gray-900
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';        // --text-secondary / --color-gray-500

  // Get the selected font pairing
  const selectedFont = FONT_PAIRINGS.find((f) => f.id === fontPairing) || FONT_PAIRINGS[0];
  const headingFont = selectedFont.headingFamily;
  const bodyFont = selectedFont.bodyFamily;

  return (
    <div
      className="rounded-lg border overflow-hidden transition-colors"
      style={{ backgroundColor: bgColor, borderColor, fontFamily: bodyFont }}
    >
      {/* Mini Header */}
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor, backgroundColor: surfaceColor }}
      >
        <div className="flex items-center gap-2">
          {squareLogo ? (
            <img src={squareLogo} alt="Logo" className="h-5 w-5 object-contain" />
          ) : (
            <div
              className="h-5 w-5 rounded"
              style={{ backgroundColor: colors.primaryHex }}
            />
          )}
          <span className="text-xs font-semibold" style={{ color: textColor, fontFamily: headingFont }}>
            BarkBase
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="relative"
            title="Notification"
          >
            <Bell className="h-3.5 w-3.5" style={{ color: mutedColor }} />
            <span
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: colors.accentHex }}
            >
              3
            </span>
          </div>
          <div
            className="h-5 w-5 rounded-full text-[8px] font-semibold flex items-center justify-center text-white"
            style={{ backgroundColor: colors.primaryHex }}
          >
            JD
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 space-y-3">
        {/* Button Row */}
        <div className="flex items-center gap-2">
          <button
            className="px-2.5 py-1 text-[10px] font-medium rounded text-white"
            style={{ backgroundColor: colors.primaryHex }}
          >
            Primary
          </button>
          <button
            className="px-2.5 py-1 text-[10px] font-medium rounded border"
            style={{ borderColor: colors.secondaryHex, color: colors.secondaryHex }}
          >
            Secondary
          </button>
          <button
            className="px-2.5 py-1 text-[10px] font-medium rounded"
            style={{ backgroundColor: `${colors.accentHex}20`, color: colors.accentHex }}
          >
            Accent
          </button>
        </div>

        {/* Input Preview */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: mutedColor }}>
            Search {terminology || 'Kennels'}
          </label>
          <div
            className="px-2 py-1.5 rounded border text-[10px]"
            style={{ borderColor, backgroundColor: surfaceColor, color: mutedColor }}
          >
            Search pets, owners...
          </div>
        </div>

        {/* Table Row Preview */}
        <div
          className="rounded border overflow-hidden"
          style={{ borderColor }}
        >
          <div
            className="px-2 py-1.5 border-b text-[10px] font-medium"
            style={{ borderColor, backgroundColor: surfaceColor, color: textColor, fontFamily: headingFont }}
          >
            <div className="flex items-center justify-between">
              <span>Pet Name</span>
              <span>{terminology || 'Kennel'}</span>
            </div>
          </div>
          <div
            className="px-2 py-1.5 text-[10px] flex items-center justify-between"
            style={{ color: textColor }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: colors.primaryHex }}
              />
              <span>Max</span>
            </div>
            <span
              className="px-1.5 py-0.5 rounded text-[8px]"
              style={{ backgroundColor: `${colors.primaryHex}15`, color: colors.primaryHex }}
            >
              {terminology || 'Kennel'} A1
            </span>
          </div>
        </div>

        {/* Alert Previews */}
        <div className="space-y-1.5">
          <div
            className="px-2 py-1.5 rounded text-[10px] flex items-center gap-1.5"
            style={{ backgroundColor: '#dcfce7', color: '#166534' }}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Booking confirmed!</span>
          </div>
          <div
            className="px-2 py-1.5 rounded text-[10px] flex items-center gap-1.5"
            style={{ backgroundColor: `${colors.accentHex}20`, color: colors.accentHex }}
          >
            <AlertCircle className="h-3 w-3" />
            <span>Vaccination due soon</span>
          </div>
        </div>

        {/* Card Preview */}
        <div
          className="p-2 rounded border"
          style={{ borderColor, backgroundColor: surfaceColor }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: colors.primaryHex }}
            >
              B
            </div>
            <div>
              <div className="text-[10px] font-medium" style={{ color: textColor, fontFamily: headingFont }}>
                Buddy
              </div>
              <div className="text-[8px]" style={{ color: mutedColor }}>
                Golden Retriever
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="px-1.5 py-0.5 rounded text-[8px]"
              style={{ backgroundColor: `${colors.secondaryHex}20`, color: colors.secondaryHex }}
            >
              Daycare
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[8px]"
              style={{ backgroundColor: `${colors.accentHex}20`, color: colors.accentHex }}
            >
              Check-in Today
            </span>
          </div>
        </div>

        {/* Navigation Preview */}
        <div className="flex items-center gap-1 text-[10px]" style={{ color: mutedColor }}>
          <span>Dashboard</span>
          <ChevronRight className="h-3 w-3" />
          <span style={{ color: colors.primaryHex }}>Bookings</span>
        </div>
      </div>
    </div>
  );
};

const Branding = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const setBranding = useTenantStore((state) => state.setBranding);
  const setTerminology = useTenantStore((state) => state.setTerminology);
  const hasWriteAccess = useAuthStore((state) => state.hasRole(['OWNER', 'ADMIN']));
  const canEditTheme = hasWriteAccess;

  const [previewMode, setPreviewMode] = useState('dark');
  const [isSaving, setIsSaving] = useState(false);

  // Get initial values from tenant branding or fallback to DEFAULT_THEME
  const getInitialValues = () => ({
    primaryHex: tenant.branding?.primaryColor ?? DEFAULT_THEME.primaryHex,
    secondaryHex: tenant.branding?.secondaryColor ?? DEFAULT_THEME.secondaryHex,
    accentHex: tenant.branding?.accentColor ?? DEFAULT_THEME.accentHex,
    terminologyKennel: tenant.branding?.terminology?.kennel ?? tenant.terminology?.kennel ?? DEFAULT_THEME.terminologyKennel,
    fontPairing: tenant.branding?.fontPreset ?? DEFAULT_THEME.fontPairing,
    squareLogo: tenant.branding?.squareLogoUrl ?? DEFAULT_THEME.squareLogo,
    wideLogo: tenant.branding?.wideLogoUrl ?? DEFAULT_THEME.wideLogo,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: getInitialValues(),
  });

  const watchedValues = watch();

  useEffect(() => {
    reset(getInitialValues());
  }, [tenant, reset]);

  const onSubmit = async (values) => {
    if (!canEditTheme) return;

    setIsSaving(true);

    // Build branding payload for API
    const brandingPayload = {
      primaryColor: values.primaryHex,
      secondaryColor: values.secondaryHex,
      accentColor: values.accentHex,
      fontPreset: values.fontPairing,
      squareLogoUrl: values.squareLogo,
      wideLogoUrl: values.wideLogo,
      terminology: {
        kennel: values.terminologyKennel,
      },
    };

    try {
      // Save branding to API
      const res = await apiClient.put('/api/v1/config/branding', brandingPayload);
      const savedBranding = res?.data ?? brandingPayload;

      // Update local store (which also applies CSS variables)
      setBranding(savedBranding);
      if (savedBranding.terminology) {
        setTerminology(savedBranding.terminology);
      }

      reset(values);
      toast.success('Branding saved successfully');
    } catch (error) {
      console.error('[Branding] Save failed:', error);
      toast.error(error?.response?.data?.message ?? error.message ?? 'Failed to save branding');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!canEditTheme) return;

    const defaultFormValues = {
      primaryHex: DEFAULT_THEME.primaryHex,
      secondaryHex: DEFAULT_THEME.secondaryHex,
      accentHex: DEFAULT_THEME.accentHex,
      terminologyKennel: DEFAULT_THEME.terminologyKennel,
      fontPairing: DEFAULT_THEME.fontPairing,
      squareLogo: null,
      wideLogo: null,
    };

    reset(defaultFormValues);

    // Build default branding payload
    const defaultBrandingPayload = {
      primaryColor: DEFAULT_THEME.primaryHex,
      secondaryColor: DEFAULT_THEME.secondaryHex,
      accentColor: DEFAULT_THEME.accentHex,
      fontPreset: DEFAULT_THEME.fontPairing,
      squareLogoUrl: null,
      wideLogoUrl: null,
      terminology: {
        kennel: DEFAULT_THEME.terminologyKennel,
      },
    };

    try {
      const res = await apiClient.put('/api/v1/config/branding', defaultBrandingPayload);
      const savedBranding = res?.data ?? defaultBrandingPayload;
      setBranding(savedBranding);
      setTerminology({ kennel: DEFAULT_THEME.terminologyKennel });
      toast.success('Branding reset to defaults');
    } catch (error) {
      console.error('[Branding] Reset failed:', error);
      toast.error(error?.response?.data?.message ?? error.message ?? 'Failed to reset branding');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Theme & Branding</h1>
          <p className="mt-1 text-sm text-muted">Customize your workspace appearance and terminology</p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <Badge variant="warning" size="sm">Unsaved changes</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleResetToDefault} disabled={!canEditTheme}>
            Reset to Default
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit(onSubmit)}
            disabled={!canEditTheme || !isDirty || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              'Apply Theme'
            )}
          </Button>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Theme Configuration */}
        <div className="lg:col-span-3 space-y-4">
          {/* Logo Upload Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">Brand Logos</h2>
            </div>
            <p className="text-xs text-muted mb-4">
              Upload your logos to display in the app. Square logo is used for favicons and compact views.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <LogoUpload
                label="Square Logo"
                description="1:1 ratio, min 128x128px"
                value={watchedValues.squareLogo}
                onChange={(url) => setValue('squareLogo', url, { shouldDirty: true })}
                disabled={!canEditTheme}
                aspectRatio="square"
              />
              <LogoUpload
                label="Wide Logo"
                description="3:1 ratio, for headers"
                value={watchedValues.wideLogo}
                onChange={(url) => setValue('wideLogo', url, { shouldDirty: true })}
                disabled={!canEditTheme}
                aspectRatio="wide"
              />
            </div>
          </Card>

          {/* Brand Colors Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">Brand Colors</h2>
            </div>
            <p className="text-xs text-muted mb-4">
              Choose colors that represent your brand. Click swatches for quick selection.
            </p>

            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ColorField
                  label="Primary Color"
                  colorKey="primaryHex"
                  presets={COLOR_PRESETS.primary}
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  disabled={!canEditTheme}
                />
                <ColorField
                  label="Secondary Color"
                  colorKey="secondaryHex"
                  presets={COLOR_PRESETS.secondary}
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  disabled={!canEditTheme}
                />
                <ColorField
                  label="Accent Color"
                  colorKey="accentHex"
                  presets={COLOR_PRESETS.accent}
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  disabled={!canEditTheme}
                />
              </div>
            </form>
          </Card>

          {/* Font Selection Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-text">Typography</h2>
            </div>
            <p className="text-xs text-muted mb-4">
              Choose a font pairing that matches your brand personality.
            </p>
            <FontPairingSelector
              value={watchedValues.fontPairing}
              onChange={(id) => setValue('fontPairing', id, { shouldDirty: true })}
              disabled={!canEditTheme}
            />
          </Card>

        </div>

        {/* Right Column - Preview + Domain */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Preview Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-text">Live Preview</h2>
              </div>
              {/* Dark/Light Mode Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-secondary border border-border">
                <button
                  type="button"
                  onClick={() => setPreviewMode('light')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    previewMode === 'light' ? 'bg-white shadow text-amber-500' : 'text-muted hover:text-text'
                  )}
                  title="Light mode preview"
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('dark')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    previewMode === 'dark' ? 'bg-gray-800 shadow text-blue-400' : 'text-muted hover:text-text'
                  )}
                  title="Dark mode preview"
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <LivePreview
              colors={{
                primaryHex: watchedValues.primaryHex,
                secondaryHex: watchedValues.secondaryHex,
                accentHex: watchedValues.accentHex,
              }}
              terminology={watchedValues.terminologyKennel}
              fontPairing={watchedValues.fontPairing}
              squareLogo={watchedValues.squareLogo}
              previewMode={previewMode}
            />
          </Card>

          {/* Color Swatches Quick View */}
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-text mb-3">Current Palette</h3>
            <div className="flex gap-2">
              {[
                { key: 'primaryHex', label: 'Primary' },
                { key: 'secondaryHex', label: 'Secondary' },
                { key: 'accentHex', label: 'Accent' },
              ].map(({ key, label }) => (
                <div key={key} className="flex-1 text-center">
                  <div
                    className="h-10 rounded-lg border border-border mb-1"
                    style={{ backgroundColor: watchedValues[key] }}
                  />
                  <span className="text-[10px] text-muted">{label}</span>
                </div>
              ))}
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
