/**
 * Tenant Administration - Enterprise Organization Management Console
 * Simplified Brand & Theme following Stripe/Linear/Intercom patterns
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette,
  Globe,
  Building2,
  Shield,
  ToggleLeft,
  CreditCard,
  Link2,
  Users,
  FileText,
  ChevronRight,
  Upload,
  Image,
  Check,
  X,
  Copy,
  ExternalLink,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Mail,
  Calendar,
  DollarSign,
  Settings,
  Zap,
  Database,
  Key,
  Activity,
  Monitor,
  Sun,
  Moon,
  Smartphone,
  Search,
  Download,
  Home,
  PawPrint,
  User,
  Bell,
  Menu,
  LayoutDashboard,
  BookOpen,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { saveTenantTheme } from '../api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const FormField = ({ label, description, children, required }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-text">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {description && <p className="text-xs text-muted">{description}</p>}
    {children}
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    active: { label: 'Active', variant: 'success', icon: CheckCircle },
    pending: { label: 'Pending', variant: 'warning', icon: Clock },
    error: { label: 'Error', variant: 'danger', icon: XCircle },
    connected: { label: 'Connected', variant: 'success', icon: CheckCircle },
    'dns-needed': { label: 'DNS Needed', variant: 'warning', icon: AlertTriangle },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <Badge variant={c.variant} size="sm" className="gap-1">
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { key: 'brand', label: 'Brand & Theme', icon: Palette },
  { key: 'domain', label: 'Domain & SSL', icon: Globe },
  { key: 'organization', label: 'Organization', icon: Building2 },
  { key: 'roles', label: 'Roles & Permissions', icon: Shield },
  { key: 'features', label: 'Feature Toggles', icon: ToggleLeft },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'integrations', label: 'Integrations', icon: Link2 },
  { key: 'admins', label: 'Admin Users', icon: Users },
  { key: 'audit', label: 'Audit Logs', icon: FileText },
];

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: BRAND & THEME (SIMPLIFIED)
// ═══════════════════════════════════════════════════════════════════════════

const BrandThemeTab = () => {
  const tenant = useTenantStore((s) => s.tenant);
  const updateTheme = useTenantStore((s) => s.updateTheme);
  const setTenant = useTenantStore((s) => s.setTenant);
  const hasWriteAccess = useAuthStore((s) => s.hasRole(['OWNER', 'ADMIN']));

  // Helper functions
  const rgbToHex = (rgb) => {
    if (!rgb) return '#3b82f6';
    const parts = rgb.trim().split(/\s+/).map(Number);
    if (parts.length !== 3) return '#3b82f6';
    return '#' + parts.map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const hexToRgb = (hex) => {
    if (!hex) return '59 130 246';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '59 130 246';
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
  };

  // Simplified state - only primary and accent
  const [primaryColor, setPrimaryColor] = useState(rgbToHex(tenant.theme?.colors?.primary) || '#3b82f6');
  const [accentColor, setAccentColor] = useState(rgbToHex(tenant.theme?.colors?.accent) || '#f97316');
  const [themeMode, setThemeMode] = useState('system'); // system, light, dark
  const [isSaving, setIsSaving] = useState(false);

  // Branding assets state
  const [logoLight, setLogoLight] = useState(tenant.theme?.assets?.logo || null);
  const [logoDark, setLogoDark] = useState(tenant.theme?.assets?.logoDark || null);
  const [favicon, setFavicon] = useState(tenant.theme?.assets?.favicon || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingLogoDark, setIsUploadingLogoDark] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  // Sync with tenant data
  useEffect(() => {
    setPrimaryColor(rgbToHex(tenant.theme?.colors?.primary) || '#3b82f6');
    setAccentColor(rgbToHex(tenant.theme?.colors?.accent) || '#f97316');
    setLogoLight(tenant.theme?.assets?.logo || null);
    setLogoDark(tenant.theme?.assets?.logoDark || null);
    setFavicon(tenant.theme?.assets?.favicon || null);
  }, [tenant]);

  // File upload handler helper
  const handleBrandingUpload = async (file, category, setUrl, setUploading) => {
    if (!file || !hasWriteAccess) return;

    // Validate file type
    const validTypes = category === 'tenant-favicon' 
      ? ['image/png', 'image/x-icon', 'image/svg+xml', 'image/vnd.microsoft.icon']
      : ['image/png', 'image/jpeg', 'image/svg+xml'];
    
    if (!validTypes.includes(file.type)) {
      toast.error(`Invalid file type. Please upload ${category === 'tenant-favicon' ? 'PNG, ICO, or SVG' : 'PNG, JPEG, or SVG'}`);
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 2MB.');
      return;
    }

    setUploading(true);
    try {
      const { uploadFile } = await import('@/lib/apiClient');
      const { key, publicUrl } = await uploadFile({ file, category });
      const url = publicUrl || key;
      setUrl(url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Branding upload error:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoLightUpload = (file) => handleBrandingUpload(file, 'tenant-logo', setLogoLight, setIsUploadingLogo);
  const handleLogoDarkUpload = (file) => handleBrandingUpload(file, 'tenant-logo-dark', setLogoDark, setIsUploadingLogoDark);
  const handleFaviconUpload = (file) => handleBrandingUpload(file, 'tenant-favicon', setFavicon, setIsUploadingFavicon);

  const triggerFileInput = (handler, acceptTypes) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptTypes;
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) handler(file);
    };
    input.click();
  };

  // Generate derived colors from primary
  const generateThemeColors = (primary, accent) => {
    return {
      primary: hexToRgb(primary),
      secondary: hexToRgb(primary), // Can derive from primary
      accent: hexToRgb(accent),
      background: '255 255 255',
      surface: '248 250 252',
      text: '15 23 42',
      muted: '100 116 139',
      border: '226 232 240',
      success: '34 197 94',
      warning: '245 158 11',
      danger: '239 68 68',
    };
  };

  const handleSave = async () => {
    if (!hasWriteAccess) return;
    
    setIsSaving(true);
    const colors = generateThemeColors(primaryColor, accentColor);
    const assets = {
      logo: logoLight,
      logoDark: logoDark,
      favicon: favicon,
    };
    const themePayload = { colors, assets };
    
    updateTheme(themePayload);
    
    try {
      const updated = await saveTenantTheme(themePayload);
      setTenant(updated);
      toast.success('Brand settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor('#3b82f6');
    setAccentColor('#f97316');
    setThemeMode('system');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Column - Settings Cards */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Branding Card */}
        <div className="bg-surface-primary border border-border rounded-xl p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-text">Branding</h3>
            <p className="text-sm text-muted mt-1">Upload your logo and favicon for this tenant.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Light Logo */}
            <div className="group">
              <p className="text-sm font-medium text-text mb-2">Light Logo</p>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-surface-secondary/50 transition-all cursor-pointer"
                onClick={() => hasWriteAccess && !isUploadingLogo && triggerFileInput(handleLogoLightUpload, 'image/png,image/jpeg,image/svg+xml')}
              >
                <div className="h-12 w-12 bg-surface-secondary rounded-lg mx-auto mb-3 flex items-center justify-center overflow-hidden">
                  {logoLight ? (
                    <img src={logoLight} alt="Light logo" className="h-full w-full object-contain" />
                  ) : (
                    <Image className="h-6 w-6 text-muted" />
                  )}
                </div>
                <Button variant="ghost" size="sm" disabled={!hasWriteAccess || isUploadingLogo}>
                  {isUploadingLogo ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {logoLight ? 'Change' : 'Upload'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted mt-2">PNG, JPG, SVG • Max 2MB</p>
              </div>
            </div>

            {/* Dark Logo */}
            <div className="group">
              <p className="text-sm font-medium text-text mb-2">Dark Logo</p>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-surface-secondary/50 transition-all cursor-pointer"
                onClick={() => hasWriteAccess && !isUploadingLogoDark && triggerFileInput(handleLogoDarkUpload, 'image/png,image/jpeg,image/svg+xml')}
              >
                <div className="h-12 w-12 bg-gray-800 rounded-lg mx-auto mb-3 flex items-center justify-center overflow-hidden">
                  {logoDark ? (
                    <img src={logoDark} alt="Dark logo" className="h-full w-full object-contain" />
                  ) : (
                    <Image className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <Button variant="ghost" size="sm" disabled={!hasWriteAccess || isUploadingLogoDark}>
                  {isUploadingLogoDark ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {logoDark ? 'Change' : 'Upload'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted mt-2">PNG, JPG, SVG • Max 2MB</p>
              </div>
            </div>

            {/* Favicon */}
            <div className="group">
              <p className="text-sm font-medium text-text mb-2">Favicon</p>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-surface-secondary/50 transition-all cursor-pointer"
                onClick={() => hasWriteAccess && !isUploadingFavicon && triggerFileInput(handleFaviconUpload, 'image/png,image/x-icon,image/svg+xml')}
              >
                <div className="h-12 w-12 bg-surface-secondary rounded-lg mx-auto mb-3 flex items-center justify-center overflow-hidden">
                  {favicon ? (
                    <img src={favicon} alt="Favicon" className="h-full w-full object-contain" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-muted/30" />
                  )}
                </div>
                <Button variant="ghost" size="sm" disabled={!hasWriteAccess || isUploadingFavicon}>
                  {isUploadingFavicon ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {favicon ? 'Change' : 'Upload'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted mt-2">32×32 or 64×64 PNG, ICO</p>
              </div>
            </div>
          </div>
        </div>

        {/* Colors Card */}
        <div className="bg-surface-primary border border-border rounded-xl p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-text">Colors</h3>
            <p className="text-sm text-muted mt-1">Customize your primary and accent colors. We'll handle the rest.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!hasWriteAccess}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!hasWriteAccess}
                  className="flex-1 px-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="#3b82f6"
                />
              </div>
              <p className="text-xs text-muted mt-2">Used for navigation, buttons, and primary actions.</p>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={!hasWriteAccess}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={!hasWriteAccess}
                  className="flex-1 px-3 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="#f97316"
                />
              </div>
              <p className="text-xs text-muted mt-2">Used for highlights, tags, and secondary emphasis.</p>
            </div>
          </div>
        </div>

        {/* Theme Mode Card */}
        <div className="bg-surface-primary border border-border rounded-xl p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-text">Theme</h3>
            <p className="text-sm text-muted mt-1">Choose how BarkBase appears for this tenant.</p>
          </div>
          
          <div className="flex gap-3">
            {[
              { key: 'system', label: 'System', icon: Monitor, desc: 'Match device settings' },
              { key: 'light', label: 'Light', icon: Sun, desc: 'Always light mode' },
              { key: 'dark', label: 'Dark', icon: Moon, desc: 'Always dark mode' },
            ].map((mode) => {
              const Icon = mode.icon;
              const isSelected = themeMode === mode.key;
              return (
                <button
                  key={mode.key}
                  onClick={() => hasWriteAccess && setThemeMode(mode.key)}
                  disabled={!hasWriteAccess}
                  className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all text-left',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-surface-secondary/50'
                  )}
                >
                  <Icon className={cn('h-5 w-5 mb-2', isSelected ? 'text-primary' : 'text-muted')} />
                  <p className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-text')}>{mode.label}</p>
                  <p className="text-xs text-muted mt-0.5">{mode.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={!hasWriteAccess || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!hasWriteAccess}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Right Column - Live Preview */}
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          <div className="bg-surface-primary border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-text">Brand Preview</h3>
            </div>
            
            {/* Preview App Shell */}
            <div className="p-4 bg-background">
              <div className="bg-surface-primary rounded-lg shadow-sm overflow-hidden border border-border">
                {/* Preview Top Bar */}
                <div 
                  className="h-12 flex items-center justify-between px-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded bg-white/20" />
                    <span className="text-white font-semibold text-sm">BarkBase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
                      <Bell className="h-3.5 w-3.5 text-white/80" />
                    </div>
                    <div className="h-7 w-7 rounded-full bg-white/30" />
                  </div>
                </div>
                
                <div className="flex">
                  {/* Preview Sidebar */}
                  <div className="w-36 bg-surface-secondary border-r border-border p-2">
                    <div 
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md text-white text-xs font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </div>
                    {['Pets', 'Owners', 'Bookings'].map((item, i) => (
                      <div key={item} className="flex items-center gap-2 px-2.5 py-2 text-muted text-xs mt-1">
                        {i === 0 && <PawPrint className="h-3.5 w-3.5" />}
                        {i === 1 && <Users className="h-3.5 w-3.5" />}
                        {i === 2 && <BookOpen className="h-3.5 w-3.5" />}
                        {item}
                      </div>
                    ))}
                  </div>
                  
                  {/* Preview Content */}
                  <div className="flex-1 p-4">
                    <div className="bg-surface-secondary rounded-lg p-4 border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold text-text">Kennel Overview</p>
                          <p className="text-xs text-muted">3 pets checked in</p>
                        </div>
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                          style={{ backgroundColor: accentColor }}
                        >
                          Active
                        </span>
                      </div>
                      
                      {/* Preview Buttons */}
                      <div className="flex gap-2 mt-3">
                        <button 
                          className="px-3 py-1.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Primary
                        </button>
                        <button className="px-3 py-1.5 rounded text-xs font-medium border border-border text-text bg-surface-secondary">
                          Secondary
                        </button>
                      </div>
                      
                      {/* Preview Tags */}
                      <div className="flex gap-1.5 mt-3">
                        <span 
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: accentColor + '20', color: accentColor }}
                        >
                          Boarding
                        </span>
                        <span 
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: primaryColor + '20', color: primaryColor }}
                        >
                          VIP
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Color Swatches */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: primaryColor }} />
                  <span className="text-xs text-muted">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: accentColor }} />
                  <span className="text-xs text-muted">Accent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: DOMAIN & SSL
// ═══════════════════════════════════════════════════════════════════════════

const DomainSSLTab = () => {
  const tenant = useTenantStore((s) => s.tenant);
  const [customDomain, setCustomDomain] = useState('');
  const [forceHttps, setForceHttps] = useState(true);
  const currentDomain = tenant.slug ? `${tenant.slug}.barkbase.app` : 'your-org.barkbase.app';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current Domain */}
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text">Current Domain</h3>
        </div>
        <div className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
          <Globe className="h-5 w-5 text-muted" />
          <code className="text-sm font-mono text-text flex-1">{currentDomain}</code>
          <Button variant="ghost" size="sm"><Copy className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Custom Domain */}
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text">Custom Domain</h3>
            <p className="text-sm text-muted mt-1">Connect your own domain</p>
          </div>
          <StatusBadge status="pending" />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="app.yourcompany.com"
            className="flex-1 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button>Add Domain</Button>
        </div>
      </div>

      {/* DNS Configuration */}
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text">DNS Configuration</h3>
          <p className="text-sm text-muted mt-1">Add these records to your DNS provider</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Value</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-3"><Badge variant="neutral" size="sm">CNAME</Badge></td>
                <td className="px-4 py-3 font-mono text-xs">app</td>
                <td className="px-4 py-3 font-mono text-xs">cname.barkbase.app</td>
                <td className="px-4 py-3"><StatusBadge status="pending" /></td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-3"><Badge variant="neutral" size="sm">TXT</Badge></td>
                <td className="px-4 py-3 font-mono text-xs">_barkbase</td>
                <td className="px-4 py-3 font-mono text-xs">verify={tenant.slug || 'abc123'}</td>
                <td className="px-4 py-3"><StatusBadge status="pending" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Validate Domain
        </Button>
      </div>

      {/* SSL */}
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text">SSL / HTTPS</h3>
          <p className="text-sm text-muted mt-1">Automatically provisioned via Let's Encrypt</p>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <p className="text-sm font-medium text-text">SSL Certificate</p>
            <p className="text-xs text-muted">Auto-renewed every 90 days</p>
          </div>
          <StatusBadge status="pending" />
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-text">Force HTTPS</p>
            <p className="text-xs text-muted">Redirect all HTTP traffic to HTTPS</p>
          </div>
          <button
            onClick={() => setForceHttps(!forceHttps)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              forceHttps ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              forceHttps ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: ORGANIZATION
// ═══════════════════════════════════════════════════════════════════════════

const OrganizationTab = () => {
  const tenant = useTenantStore((s) => s.tenant);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text">Organization Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Organization Name" required>
            <input
              type="text"
              defaultValue={tenant.name || ''}
              placeholder="Happy Paws Kennel"
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </FormField>
          <FormField label="Business ID / EIN">
            <input
              type="text"
              placeholder="12-3456789"
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </FormField>
          <FormField label="Primary Email" required>
            <input
              type="email"
              placeholder="contact@yourcompany.com"
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </FormField>
          <FormField label="Phone Number">
            <input
              type="tel"
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </FormField>
        </div>
      </div>

      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text">Address</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormField label="Street Address">
              <input
                type="text"
                placeholder="123 Main Street"
                className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </FormField>
          </div>
          <FormField label="City">
            <input type="text" placeholder="San Francisco" className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </FormField>
          <FormField label="State">
            <input type="text" placeholder="California" className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </FormField>
          <FormField label="ZIP Code">
            <input type="text" placeholder="94102" className="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </FormField>
          <FormField label="Country">
            <StyledSelect
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'UK', label: 'United Kingdom' },
              ]}
              defaultValue="US"
              isClearable={false}
              isSearchable={true}
            />
          </FormField>
        </div>
      </div>

      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text">Regional Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Timezone">
            <StyledSelect
              options={[
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
                { value: 'Europe/London', label: 'Europe/London (GMT)' },
              ]}
              defaultValue="America/New_York"
              isClearable={false}
              isSearchable={true}
            />
          </FormField>
          <FormField label="Date Format">
            <StyledSelect
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
              defaultValue="MM/DD/YYYY"
              isClearable={false}
              isSearchable={false}
            />
          </FormField>
          <FormField label="Currency">
            <StyledSelect
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
              ]}
              defaultValue="USD"
              isClearable={false}
              isSearchable={false}
            />
          </FormField>
        </div>
      </div>

      <Button>Save Changes</Button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

const RolesPermissionsTab = () => {
  const roles = [
    { id: 'owner', name: 'Owner', description: 'Full access to everything', users: 1, color: 'bg-purple-500' },
    { id: 'admin', name: 'Admin', description: 'Manage staff and settings', users: 2, color: 'bg-blue-500' },
    { id: 'manager', name: 'Manager', description: 'Manage bookings and schedules', users: 3, color: 'bg-green-500' },
    { id: 'staff', name: 'Staff', description: 'View and complete tasks', users: 8, color: 'bg-amber-500' },
  ];

  const permissions = [
    { name: 'View Dashboard', owner: true, admin: true, manager: true, staff: true },
    { name: 'Manage Bookings', owner: true, admin: true, manager: true, staff: false },
    { name: 'View Financials', owner: true, admin: true, manager: false, staff: false },
    { name: 'Manage Staff', owner: true, admin: true, manager: false, staff: false },
    { name: 'Edit Settings', owner: true, admin: true, manager: false, staff: false },
    { name: 'Access Reports', owner: true, admin: true, manager: true, staff: false },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text">Roles</h3>
            <p className="text-sm text-muted mt-1">Define access levels for your team</p>
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Role</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn('h-3 w-3 rounded-full', role.color)} />
                  <span className="font-medium text-text">{role.name}</span>
                </div>
                <button className="p-1 text-muted hover:text-text rounded"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
              <p className="text-sm text-muted mb-2">{role.description}</p>
              <p className="text-xs text-muted">{role.users} user{role.users !== 1 ? 's' : ''}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text">Permissions Matrix</h3>
          <p className="text-sm text-muted mt-1">Configure what each role can do</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Permission</th>
                {roles.map((r) => (
                  <th key={r.id} className="px-4 py-3 text-center text-xs font-medium text-muted uppercase">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3 text-sm text-text">{perm.name}</td>
                  {['owner', 'admin', 'manager', 'staff'].map((role) => (
                    <td key={role} className="px-4 py-3 text-center">
                      {perm[role] ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-gray-300 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: FEATURE TOGGLES
// ═══════════════════════════════════════════════════════════════════════════

const FeatureTogglesTab = () => {
  const [features, setFeatures] = useState({
    grooming: true,
    daycare: true,
    messaging: true,
    payments: true,
    advancedReports: false,
    aiFeatures: false,
  });

  const featureList = [
    { key: 'grooming', label: 'Grooming Module', description: 'Enable grooming appointments and services', icon: Settings },
    { key: 'daycare', label: 'Daycare Module', description: 'Enable daycare bookings and scheduling', icon: Calendar },
    { key: 'messaging', label: 'Messaging', description: 'Enable internal and client messaging', icon: Mail },
    { key: 'payments', label: 'Payments', description: 'Enable online payment processing', icon: CreditCard },
    { key: 'advancedReports', label: 'Advanced Reports', description: 'Enable advanced analytics and reports', icon: Activity },
    { key: 'aiFeatures', label: 'AI Features', description: 'Enable AI-powered recommendations (Beta)', icon: Zap },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text">Feature Toggles</h3>
          <p className="text-sm text-muted mt-1">Enable or disable features for your organization</p>
        </div>
        <div className="divide-y divide-border">
          {featureList.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.key} className="flex items-center justify-between py-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-surface-secondary flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">{feature.label}</p>
                    <p className="text-xs text-muted">{feature.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFeatures({ ...features, [feature.key]: !features[feature.key] })}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    features[feature.key] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    features[feature.key] ? 'translate-x-6' : 'translate-x-1'
                  )} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6: BILLING
// ═══════════════════════════════════════════════════════════════════════════

const BillingTab = () => {
  const tenant = useTenantStore((s) => s.tenant);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="accent" size="sm" className="mb-2">Current Plan</Badge>
            <h3 className="text-2xl font-bold text-text">{tenant.plan || 'Professional'}</h3>
            <p className="text-sm text-muted mt-1">$99/month • Billed monthly</p>
          </div>
          <Button>Upgrade Plan</Button>
        </div>
      </div>

      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text">Usage</h3>
          <p className="text-sm text-muted mt-1">Current billing period</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Staff Seats', value: '4 / 10', percent: 40 },
            { label: 'Storage', value: '2.4 GB / 10 GB', percent: 24 },
            { label: 'API Calls', value: '12.4k / 50k', percent: 25 },
          ].map((item) => (
            <div key={item.label} className="p-4 bg-surface-secondary rounded-lg">
              <p className="text-sm text-muted">{item.label}</p>
              <p className="text-xl font-bold text-text mt-1">{item.value}</p>
              <div className="h-2 bg-surface-secondary rounded-full mt-2">
                <div className="h-2 bg-primary rounded-full" style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-text">Payment Method</h3>
          <Button variant="outline" size="sm">Update</Button>
        </div>
        <div className="flex items-center gap-4 p-4 bg-surface-secondary rounded-lg">
          <div className="h-10 w-14 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
          <div>
            <p className="text-sm font-medium text-text">•••• •••• •••• 4242</p>
            <p className="text-xs text-muted">Expires 12/25</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 7: INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════

const IntegrationsTab = () => {
  const integrations = [
    { name: 'Stripe', description: 'Payment processing', connected: true, icon: '💳' },
    { name: 'QuickBooks', description: 'Accounting sync', connected: false, icon: '📊' },
    { name: 'Mailchimp', description: 'Email marketing', connected: false, icon: '📧' },
    { name: 'Google Calendar', description: 'Calendar sync', connected: true, icon: '📅' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text">Integrations</h3>
          <p className="text-sm text-muted mt-1">Connect third-party services</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((int) => (
            <div key={int.name} className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{int.icon}</span>
                  <div>
                    <p className="font-medium text-text">{int.name}</p>
                    <p className="text-sm text-muted">{int.description}</p>
                  </div>
                </div>
                {int.connected ? (
                  <Badge variant="success" size="sm">Connected</Badge>
                ) : (
                  <Button variant="outline" size="sm">Connect</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text">API Keys</h3>
            <p className="text-sm text-muted mt-1">Manage API access</p>
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Create Key</Button>
        </div>
        <div className="p-6 bg-surface-secondary rounded-lg text-center">
          <Key className="h-8 w-8 text-muted mx-auto mb-2" />
          <p className="text-sm text-muted">No API keys created yet</p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 8: ADMIN USERS
// ═══════════════════════════════════════════════════════════════════════════

const AdminUsersTab = () => {
  const admins = [
    { name: 'Josh Owner', email: 'josh@example.com', role: 'Owner', status: 'Active', twoFactor: true, lastLogin: '2 hours ago' },
    { name: 'Sarah Admin', email: 'sarah@example.com', role: 'Admin', status: 'Active', twoFactor: true, lastLogin: 'Yesterday' },
    { name: 'Mike Manager', email: 'mike@example.com', role: 'Admin', status: 'Invited', twoFactor: false, lastLogin: 'Never' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text">Admin Users</h3>
            <p className="text-sm text-muted mt-1">Manage administrative access</p>
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Invite Admin</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">2FA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                        {admin.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-text">{admin.name}</p>
                        <p className="text-xs text-muted">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={admin.role === 'Owner' ? 'accent' : 'info'} size="sm">{admin.role}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={admin.status === 'Active' ? 'success' : 'warning'} size="sm">{admin.status}</Badge></td>
                  <td className="px-4 py-3">{admin.twoFactor ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-gray-300" />}</td>
                  <td className="px-4 py-3 text-sm text-muted">{admin.lastLogin}</td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB 9: AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════

const AuditLogsTab = () => {
  const logs = [
    { timestamp: '2024-11-26 10:32:15', admin: 'Josh Owner', action: 'Updated', object: 'Theme Settings', ip: '192.168.1.1' },
    { timestamp: '2024-11-26 09:15:42', admin: 'Sarah Admin', action: 'Created', object: 'Staff Member', ip: '192.168.1.2' },
    { timestamp: '2024-11-25 16:45:00', admin: 'Josh Owner', action: 'Deleted', object: 'API Key', ip: '192.168.1.1' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-surface-primary border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text">Audit Logs</h3>
            <p className="text-sm text-muted mt-1">Track administrative actions</p>
          </div>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export</Button>
        </div>
        <div className="mb-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-9 pr-3 py-2 bg-surface-secondary border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">Object</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-4 py-3 text-xs font-mono text-muted">{log.timestamp}</td>
                  <td className="px-4 py-3 text-sm text-text">{log.admin}</td>
                  <td className="px-4 py-3"><Badge variant={log.action === 'Created' ? 'success' : log.action === 'Deleted' ? 'danger' : 'info'} size="sm">{log.action}</Badge></td>
                  <td className="px-4 py-3 text-sm text-text">{log.object}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const TenantSettings = () => {
  const [activeTab, setActiveTab] = useState('brand');
  const tenant = useTenantStore((s) => s.tenant);

  const renderTab = () => {
    switch (activeTab) {
      case 'brand': return <BrandThemeTab />;
      case 'domain': return <DomainSSLTab />;
      case 'organization': return <OrganizationTab />;
      case 'roles': return <RolesPermissionsTab />;
      case 'features': return <FeatureTogglesTab />;
      case 'billing': return <BillingTab />;
      case 'integrations': return <IntegrationsTab />;
      case 'admins': return <AdminUsersTab />;
      case 'audit': return <AuditLogsTab />;
      default: return <BrandThemeTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-56 min-h-screen bg-surface-primary border-r border-border flex-shrink-0 sticky top-0">
          <div className="p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2 text-xs text-muted hover:text-primary transition-colors">
              <ChevronRight className="h-3 w-3 rotate-180" />
              Back to Dashboard
            </Link>
            <h1 className="text-base font-semibold text-text mt-3">Administration</h1>
            <p className="text-xs text-muted truncate">{tenant.name || 'Organization'}</p>
          </div>
          <nav className="p-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:text-text hover:bg-surface-secondary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-text">
              {TABS.find(t => t.key === activeTab)?.label}
            </h2>
          </div>
          {renderTab()}
        </div>
      </div>
    </div>
  );
};

export default TenantSettings;
