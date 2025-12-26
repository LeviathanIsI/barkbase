import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatISO, isAfter, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CalendarDays,
  ImageUp,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import Calendar from '@/components/ui/Calendar';
import Select from '@/components/ui/Select';
import LoadingState from '@/components/ui/LoadingState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { apiClient, uploadClient } from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABEL = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const DEFAULT_HOURS = {
  monday: { isOpen: true, open: '08:00', close: '18:00' },
  tuesday: { isOpen: true, open: '08:00', close: '18:00' },
  wednesday: { isOpen: true, open: '08:00', close: '18:00' },
  thursday: { isOpen: true, open: '08:00', close: '18:00' },
  friday: { isOpen: true, open: '08:00', close: '18:00' },
  saturday: { isOpen: true, open: '09:00', close: '17:00' },
  sunday: { isOpen: true, open: '09:00', close: '17:00' },
};

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const FREE_TIER_HOLIDAY_LIMIT = 12;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (value) => {
  if (!value || !TIME_REGEX.test(value)) return null;
  const [h, m] = value.split(':');
  return Number(h) * 60 + Number(m);
};

const ensureProtocol = (value) => {
  if (!value) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
};

const holidaySchema = z.object({ recordId: z.string(),
  name: z
    .string()
    .trim()
    .min(1, 'Holiday name is required')
    .max(120, 'Holiday name must be 120 characters or fewer'),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  recurring: z.boolean().default(false),
});

const daySchema = z
  .object({
    isOpen: z.boolean(),
    open: z.string().nullable(),
    close: z.string().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.isOpen) return;
    const openMinutes = toMinutes(value.open);
    const closeMinutes = toMinutes(value.close);
    if (openMinutes === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Opening time required', path: ['open'] });
    }
    if (closeMinutes === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Closing time required', path: ['close'] });
    }
    if (openMinutes !== null && closeMinutes !== null && closeMinutes <= openMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Closing time must be later than opening time',
        path: ['close'],
      });
    }
  });

const businessInfoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(100, 'Business name must be 100 characters or fewer'),
  taxId: z
    .string()
    .trim()
    .max(50, 'Tax ID must be 50 characters or fewer')
    .optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number' });
      }
    }),
  email: z
    .string()
    .trim()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      const result = z.string().email().safeParse(value);
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address' });
      }
    }),
  website: z
    .string()
    .trim()
    .optional()
    .superRefine((value, ctx) => {
      if (!value) return;
      try {
        const url = new URL(ensureProtocol(value));
        if (!url.hostname) throw new Error();
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid website URL' });
      }
    }),
  notes: z.string().trim().max(500).optional(),
  address: z.object({
    street: z.string().trim().max(120).optional(),
    street2: z.string().trim().max(120).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().trim().max(100).optional(),
  }),
  logo: z
    .object({
      url: z.string().url().nullable(),
      fileName: z.string().nullable(),
      uploadedAt: z.string().nullable(),
      size: z.number().nullable(),
    })
    .nullable()
    .optional(),
});

const formSchema = z.object({
  businessInfo: businessInfoSchema,
  operatingHours: z.object(
    Object.fromEntries(DAY_ORDER.map((key) => [key, daySchema])),
  ),
  holidays: z.array(holidaySchema),
  regionalSettings: z.object({
    timeZone: z.string().min(1, 'Select a time zone'),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
    timeFormat: z.enum(['12-hour', '24-hour']),
    weekStartsOn: z.enum(['Sunday', 'Monday']),
  }),
  currencySettings: z
    .object({
      supportedCurrencies: z.array(z.string().min(1)).nonempty('Select at least one currency'),
      defaultCurrency: z.string().min(1, 'Select a default currency'),
    })
    .superRefine((value, ctx) => {
      if (!value.supportedCurrencies.includes(value.defaultCurrency)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Default currency must be included in supported currencies',
          path: ['defaultCurrency'],
        });
      }
    }),
});

const TAB_ITEMS = [
  { recordId: 'business', title: 'Business Profile' },
  { recordId: 'scheduling', title: 'Scheduling' },
  { recordId: 'regional', title: 'Locale' },
  { recordId: 'billing', title: 'Currency' },
];

const TIME_ZONES = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Phoenix', label: 'Arizona (Phoenix)' },
  { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
  { value: 'UTC', label: 'UTC' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'NZD', label: 'NZD - New Zealand Dollar' },
];

const TIME_FORMATS = [
  { value: '12-hour', label: '12-hour' },
  { value: '24-hour', label: '24-hour' },
];

const WEEK_START_OPTIONS = [
  { value: 'Sunday', label: 'Sunday' },
  { value: 'Monday', label: 'Monday' },
];


const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `holiday-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createDefaultValues = (tenantName) => ({
  businessInfo: {
    name: tenantName ?? '',
    taxId: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    address: {
      street: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    },
    logo: { url: null, fileName: null, uploadedAt: null, size: null },
  },
  operatingHours: { ...DEFAULT_HOURS },
  holidays: [],
  regionalSettings: {
    timeZone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12-hour',
    weekStartsOn: 'Sunday',
  },
  currencySettings: {
    supportedCurrencies: ['USD'],
    defaultCurrency: 'USD',
  },
});

const normalizeOperatingHours = (incoming) => {
  const hours = {};
  DAY_ORDER.forEach((day) => {
    const source = incoming?.[day] ?? {};
    const defaults = DEFAULT_HOURS[day];
    const enabled =
      typeof source.isOpen === 'boolean'
        ? source.isOpen
        : typeof source.enabled === 'boolean'
          ? source.enabled
          : defaults.isOpen;

    hours[day] = {
      isOpen: enabled,
      open: enabled ? (source.open ?? defaults.open) : null,
      close: enabled ? (source.close ?? defaults.close) : null,
    };
  });
  return hours;
};

const normalizeHoliday = (holiday) => {
  if (!holiday) return null;
  const start = holiday.startDate ?? holiday.date;
  const end = holiday.endDate ?? holiday.date ?? holiday.startDate;

  try {
    const startDate = formatISO(parseISO(start), { representation: 'date' });
    const endDate = end ? formatISO(parseISO(end), { representation: 'date' }) : startDate;
    return { recordId: holiday.recordId ?? generateId(),
      name: holiday.name ?? 'Holiday',
      startDate,
      endDate,
      recurring: Boolean(holiday.recurring),
    };
  } catch {
    return null;
  }
};

const normalizeResponse = (payload, tenantName, plan) => {
  const defaults = createDefaultValues(tenantName);
  if (!payload) {
    if (plan === 'FREE') {
      defaults.currencySettings = {
        supportedCurrencies: ['USD'],
        defaultCurrency: 'USD',
      };
    }
    return defaults;
  }

  const businessInfo = {
    ...defaults.businessInfo,
    ...(payload.businessInfo ?? {}),
    taxId: payload.businessInfo?.taxId ?? '',
    phone: payload.businessInfo?.phone ?? '',
    email: payload.businessInfo?.email ?? '',
    website: payload.businessInfo?.website ?? '',
    notes: payload.businessInfo?.notes ?? '',
    address: {
      ...defaults.businessInfo.address,
      ...(payload.businessInfo?.address ?? {}),
    },
    logo: payload.businessInfo?.logo ?? defaults.businessInfo.logo,
  };

  const operatingHours = normalizeOperatingHours(payload.operatingHours);
  const holidays = Array.isArray(payload.holidays)
    ? payload.holidays.map(normalizeHoliday).filter(Boolean)
    : [];

  // Normalize regionalSettings - API may return lowercase values
  const rawRegional = payload.regionalSettings ?? {};
  const normalizeWeekStart = (val) => {
    if (!val) return defaults.regionalSettings.weekStartsOn;
    const lower = val.toLowerCase();
    if (lower === 'sunday') return 'Sunday';
    if (lower === 'monday') return 'Monday';
    return defaults.regionalSettings.weekStartsOn;
  };
  const normalizeTimeFormat = (val) => {
    if (!val) return defaults.regionalSettings.timeFormat;
    if (val === '12-hour' || val === '24-hour') return val;
    return defaults.regionalSettings.timeFormat;
  };
  const normalizeDateFormat = (val) => {
    if (!val) return defaults.regionalSettings.dateFormat;
    if (['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(val)) return val;
    return defaults.regionalSettings.dateFormat;
  };

  const regionalSettings = {
    timeZone: rawRegional.timeZone || defaults.regionalSettings.timeZone,
    dateFormat: normalizeDateFormat(rawRegional.dateFormat),
    timeFormat: normalizeTimeFormat(rawRegional.timeFormat),
    weekStartsOn: normalizeWeekStart(rawRegional.weekStartsOn),
  };

  let currencySettings = {
    ...defaults.currencySettings,
    ...(payload.currencySettings ?? {}),
  };

  if (plan === 'FREE') {
    currencySettings = {
      supportedCurrencies: ['USD'],
      defaultCurrency: 'USD',
    };
  } else {
    const unique = Array.from(new Set(currencySettings.supportedCurrencies ?? ['USD']));
    currencySettings.supportedCurrencies = unique.length > 0 ? unique : ['USD'];
    if (!currencySettings.supportedCurrencies.includes(currencySettings.defaultCurrency)) {
      currencySettings.defaultCurrency = currencySettings.supportedCurrencies[0];
    }
  }

  return {
    businessInfo,
    operatingHours,
    holidays,
    regionalSettings,
    currencySettings,
  };
};

const formatHolidayRange = (start, end) => {
  try {
    const startDate = parseISO(start);
    const endDate = end ? parseISO(end) : startDate;
    if (isAfter(startDate, endDate)) {
      return format(startDate, 'MMM d, yyyy');
    }
    if (startDate.getTime() === endDate.getTime()) {
      return format(startDate, 'MMM d, yyyy');
    }
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  } catch {
    return start;
  }
};

// ===== SECTION COMPONENTS =====

const BusinessSection = ({
  register,
  control,
  errors,
  businessInfo,
  onLogoUpload,
  isLogoUploading,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
    {/* Left Column - Business Info */}
    <div className="lg:col-span-3">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text mb-3">Business Details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Business Name"
            placeholder="Pine Ridge Kennels"
            error={errors.businessInfo?.name?.message}
            {...register('businessInfo.name')}
          />
          <Input
            label="Tax ID / EIN"
            placeholder="12-3456789"
            error={errors.businessInfo?.taxId?.message}
            {...register('businessInfo.taxId')}
          />
          <Controller
            name="businessInfo.phone"
            control={control}
            render={({ field }) => (
              <Input
                label="Phone"
                placeholder="(555) 123-4567"
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                error={errors.businessInfo?.phone?.message}
              />
            )}
          />
          <Input
            label="Email"
            type="email"
            placeholder="hello@kennel.com"
            error={errors.businessInfo?.email?.message}
            {...register('businessInfo.email')}
          />
          <div className="sm:col-span-2">
            <Input
              label="Website"
              placeholder="yourkennel.com"
              error={errors.businessInfo?.website?.message}
              {...register('businessInfo.website')}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Customer-facing Notes"
              rows={2}
              placeholder="Optional summary for booking confirmations"
              {...register('businessInfo.notes')}
            />
          </div>
        </div>
      </Card>
    </div>

    {/* Right Column - Logo */}
    <div className="lg:col-span-2">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text mb-3">Logo</h3>
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-secondary">
            {businessInfo?.logo?.url ? (
              <img src={businessInfo.logo.url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ImageUp className="h-6 w-6 text-muted" />
            )}
          </div>
          <label className="w-full">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => onLogoUpload(event.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={(event) => event.currentTarget.previousSibling?.click()}
              disabled={isLogoUploading}
            >
              {isLogoUploading ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="mr-2 h-3 w-3" />Upload</>
              )}
            </Button>
          </label>
          <p className="text-xs text-muted">PNG, JPG, WebP - max 5MB</p>
        </div>
      </Card>
    </div>

    {/* Full Width - Address */}
    <div className="lg:col-span-5">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text mb-3">Mailing Address</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Street" placeholder="123 Bark Lane" {...register('businessInfo.address.street')} />
          <Input label="Unit / Suite" placeholder="Building 2" {...register('businessInfo.address.street2')} />
          <Input label="City" placeholder="Portland" {...register('businessInfo.address.city')} />
          <Input label="State" placeholder="OR" {...register('businessInfo.address.state')} />
          <Input label="Postal Code" placeholder="97205" {...register('businessInfo.address.postalCode')} />
          <Input label="Country" placeholder="United States" {...register('businessInfo.address.country')} />
        </div>
      </Card>
    </div>
  </div>
);

const SchedulingSection = ({
  control,
  errors,
  operatingHours,
  onSetHours,
  holidays,
  onRemoveHoliday,
  onAddHoliday,
  canAddHoliday,
  isFreePlan,
  holidayUsageLabel,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
    {/* Left Column - Operating Hours */}
    <div className="lg:col-span-3">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-text mb-3">Weekly Operating Hours</h3>
        <div className="space-y-1">
          {DAY_ORDER.map((day) => {
            const dayHours = operatingHours?.[day];
            const dayErrors = errors.operatingHours?.[day];
            return (
              <div key={day} className="flex items-center gap-2 py-1.5">
                <span className="w-10 text-sm font-medium text-text">{DAY_LABEL[day]}</span>
                <label className="flex items-center gap-1.5 w-20">
                  <input
                    type="checkbox"
                    checked={Boolean(dayHours?.isOpen)}
                    onChange={(event) => onSetHours(day, 'isOpen', event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  <span className="text-xs text-muted">{dayHours?.isOpen ? 'Open' : 'Closed'}</span>
                </label>
                {dayHours?.isOpen ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Controller
                      name={`operatingHours.${day}.open`}
                      control={control}
                      render={({ field }) => (
                        <input
                          type="time"
                          className="px-2 py-1.5 text-sm border border-border rounded bg-surface-secondary"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      )}
                    />
                    <span className="text-xs text-muted">to</span>
                    <Controller
                      name={`operatingHours.${day}.close`}
                      control={control}
                      render={({ field }) => (
                        <input
                          type="time"
                          className="px-2 py-1.5 text-sm border border-border rounded bg-surface-secondary"
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      )}
                    />
                    {(dayErrors?.open?.message || dayErrors?.close?.message) && (
                      <span className="text-xs text-red-500">!</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>

    {/* Right Column - Holidays */}
    <div className="lg:col-span-2">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text">Holiday Closures</h3>
          <Button type="button" variant="outline" size="sm" onClick={onAddHoliday} disabled={!canAddHoliday}>
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>

        {holidays.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center border border-dashed border-border rounded">
            No holidays scheduled
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {holidays.map((holiday) => (
              <div
                key={holiday.recordId}
                className="flex items-center justify-between p-2 bg-surface-secondary rounded text-sm"
              >
                <div>
                  <p className="font-medium text-text text-xs">{holiday.name}</p>
                  <p className="text-xs text-muted">{formatHolidayRange(holiday.startDate, holiday.endDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveHoliday(holiday.recordId)}
                  className="text-muted hover:text-red-500 p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 mt-3 text-xs text-muted">
          <CalendarDays className="h-3 w-3" />
          {holidayUsageLabel}
        </div>

        {isFreePlan && !canAddHoliday && (
          <p className="text-xs text-yellow-600 mt-2">
            Free plans limited to 12 closures. Upgrade for unlimited.
          </p>
        )}
      </Card>
    </div>
  </div>
);

const LocaleSection = ({ control, errors }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Time Zone */}
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-text mb-3">Time Zone</h3>
      <Controller
        name="regionalSettings.timeZone"
        control={control}
        render={({ field }) => (
          <Select
            label="Default Time Zone"
            options={TIME_ZONES}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            error={errors.regionalSettings?.timeZone?.message}
          />
        )}
      />
    </Card>

    {/* Formatting */}
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-text mb-3">Formatting</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Controller
          name="regionalSettings.dateFormat"
          control={control}
          render={({ field }) => (
            <Select
              label="Date"
              options={DATE_FORMATS}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        />
        <Controller
          name="regionalSettings.timeFormat"
          control={control}
          render={({ field }) => (
            <Select
              label="Time"
              options={TIME_FORMATS}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        />
        <Controller
          name="regionalSettings.weekStartsOn"
          control={control}
          render={({ field }) => (
            <Select
              label="Week Starts"
              options={WEEK_START_OPTIONS}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        />
      </div>
    </Card>
  </div>
);

const BillingSection = ({
  control,
  errors,
  currencySettings,
  setValue,
  isFreePlan,
}) => (
  <Card className="p-4">
    <h3 className="text-sm font-semibold text-text mb-3">Currency Settings</h3>

    {isFreePlan ? (
      <p className="text-xs text-yellow-600 py-2">
        Free plans are limited to USD only. Upgrade to accept multiple currencies.
      </p>
    ) : (
      <>
        <p className="text-xs text-muted mb-3">Select currencies you accept</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {CURRENCY_OPTIONS.map((currency) => {
            const isSelected = currencySettings?.supportedCurrencies?.includes(currency.value);
            return (
              <label
                key={currency.value}
                className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const current = currencySettings?.supportedCurrencies || [];
                    const updated = e.target.checked
                      ? [...current, currency.value]
                      : current.filter((c) => c !== currency.value);
                    setValue('currencySettings.supportedCurrencies', updated, { shouldDirty: true });
                  }}
                  className="h-3 w-3 rounded border-border"
                />
                <span className="text-text">{currency.label}</span>
              </label>
            );
          })}
        </div>
      </>
    )}

    <div className="pt-3 border-t border-border">
      <Controller
        name="currencySettings.defaultCurrency"
        control={control}
        render={({ field }) => (
          <Select
            label="Default Currency"
            options={
              (isFreePlan ? [{ value: 'USD', label: 'USD - US Dollar' }] : CURRENCY_OPTIONS)
                .filter((c) => currencySettings?.supportedCurrencies?.includes(c.value))
            }
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            error={errors.currencySettings?.defaultCurrency?.message}
            disabled={isFreePlan}
          />
        )}
      />
    </div>
  </Card>
);

// ===== MAIN COMPONENT =====

const AccountDefaults = () => {
  const queryClient = useQueryClient();
  const tenant = useTenantStore((state) => state.tenant);
  const plan = tenant?.plan ?? 'FREE';
  const tenantName = tenant?.name ?? '';

  const [activeTab, setActiveTab] = useState('business');
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayDraft, setHolidayDraft] = useState({
    name: '',
    dates: { from: undefined, to: undefined },
    recurring: false,
  });

  const accountDefaultsQuery = useQuery({
    queryKey: ['account-defaults'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/account-defaults');
      return data;
    },
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(tenantName),
    mode: 'onBlur',
  });

  const {
    register,
    control,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  const businessInfo = watch('businessInfo');
  const operatingHours = watch('operatingHours');
  const holidays = watch('holidays');
  const currencySettings = watch('currencySettings');
  const isFreePlan = plan === 'FREE';

  useEffect(() => {
    if (!accountDefaultsQuery.data) return;
    const normalized = normalizeResponse(accountDefaultsQuery.data, tenantName, plan);
    reset(normalized, { keepDirty: false });
  }, [accountDefaultsQuery.data, reset, plan, tenantName]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await apiClient.patch('/api/v1/account-defaults', payload);
      return data;
    },
    onSuccess: (data) => {
      const normalized = normalizeResponse(data, tenantName, plan);
      reset(normalized, { keepDirty: false });
      queryClient.invalidateQueries({ queryKey: ['account-defaults'] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error(error?.message ?? 'Unable to save');
    },
  });

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Logo must be 5MB or smaller');
      return;
    }

    setIsLogoUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await uploadClient('/api/v1/account-defaults/logo', formData);
      if (response?.logo) {
        setValue('businessInfo.logo', response.logo, { shouldDirty: true });
        toast.success('Logo uploaded');
      }
    } catch (error) {
      toast.error(error?.message ?? 'Upload failed');
    } finally {
      setIsLogoUploading(false);
    }
  };

  const setOperatingHourValue = (day, field, value) => {
    setValue(`operatingHours.${day}.${field}`, value, { shouldDirty: true });
  };

  const handleHolidayRemove = (recordId) => {
    const filtered = holidays.filter((holiday) => holiday.recordId !== recordId);
    setValue('holidays', filtered, { shouldDirty: true });
  };

  const handleHolidayCreate = () => {
    if (isFreePlan && holidays.length >= FREE_TIER_HOLIDAY_LIMIT) {
      toast.error('Free tier allows up to 12 closures');
      return;
    }
    setHolidayDraft({
      name: '',
      dates: { from: undefined, to: undefined },
      recurring: false,
    });
    setHolidayDialogOpen(true);
  };

  const commitHolidayDraft = () => {
    const { name, dates, recurring } = holidayDraft;
    if (!name.trim()) {
      toast.error('Give the holiday a name');
      return;
    }
    if (!dates.from) {
      toast.error('Pick at least one date');
      return;
    }

    const start = formatISO(dates.from, { representation: 'date' });
    const endDate = dates.to ?? dates.from;
    const end = formatISO(endDate, { representation: 'date' });

    const nextHoliday = { recordId: generateId(),
      name: name.trim(),
      startDate: start,
      endDate: end,
      recurring: Boolean(recurring),
    };

    setValue('holidays', [...holidays, nextHoliday], { shouldDirty: true });
    setHolidayDialogOpen(false);
  };

  const onSubmit = (values) => {
    const payload = {
      ...values,
      operatingHours: Object.fromEntries(
        DAY_ORDER.map((day) => {
          const entry = values.operatingHours[day];
          return [
            day,
            {
              isOpen: entry.isOpen,
              open: entry.isOpen ? entry.open : null,
              close: entry.isOpen ? entry.close : null,
            },
          ];
        }),
      ),
      holidays: values.holidays,
    };

    if (isFreePlan) {
      payload.currencySettings = {
        supportedCurrencies: ['USD'],
        defaultCurrency: 'USD',
      };
    }

    saveMutation.mutate(payload);
  };

  const holidayUsageLabel = useMemo(
    () => (isFreePlan ? `${holidays.length}/${FREE_TIER_HOLIDAY_LIMIT}` : 'Unlimited'),
    [holidays.length, isFreePlan],
  );

  if (accountDefaultsQuery.isLoading) {
    return <LoadingState label="Loading..." variant="mascot" />;
  }

  if (accountDefaultsQuery.isError) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-secondary p-4 text-center text-sm text-muted">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <p>Couldn't load settings. Refresh to try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          {TAB_ITEMS.map((tab) => (
            <TabsTrigger key={tab.recordId} value={tab.recordId}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TabsContent value="business">
            <BusinessSection
              register={register}
              control={control}
              errors={errors}
              businessInfo={businessInfo}
              onLogoUpload={handleLogoUpload}
              isLogoUploading={isLogoUploading}
            />
          </TabsContent>

          <TabsContent value="scheduling">
            <SchedulingSection
              control={control}
              errors={errors}
              operatingHours={operatingHours}
              onSetHours={setOperatingHourValue}
              holidays={holidays}
              onRemoveHoliday={handleHolidayRemove}
              onAddHoliday={handleHolidayCreate}
              canAddHoliday={!isFreePlan || holidays.length < FREE_TIER_HOLIDAY_LIMIT}
              isFreePlan={isFreePlan}
              holidayUsageLabel={holidayUsageLabel}
            />
          </TabsContent>

          <TabsContent value="regional">
            <LocaleSection control={control} errors={errors} />
          </TabsContent>

          <TabsContent value="billing">
            <BillingSection
              control={control}
              errors={errors}
              currencySettings={currencySettings}
              setValue={setValue}
              isFreePlan={isFreePlan}
            />
          </TabsContent>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="text-xs text-muted">
              {isDirty ? 'Unsaved changes' : 'All saved'}
            </span>
            <Button type="submit" size="sm" disabled={!isDirty || saveMutation.isPending}>
              {saveMutation.isPending ? (
                <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Saving...</>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Tabs>

      <Dialog
        open={holidayDialogOpen}
        onOpenChange={setHolidayDialogOpen}
        title="Add Holiday"
        description="Pick dates to block bookings"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setHolidayDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={commitHolidayDraft}>Add</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Holiday Name"
            placeholder="Memorial Day"
            value={holidayDraft.name}
            onChange={(event) => setHolidayDraft((draft) => ({ ...draft, name: event.target.value }))}
          />
          <div>
            <p className="mb-2 text-xs font-medium text-text">Dates</p>
            <Calendar
              mode="range"
              selected={holidayDraft.dates}
              onSelect={(range) =>
                setHolidayDraft((draft) => ({
                  ...draft,
                  dates: range ?? { from: undefined, to: undefined },
                }))
              }
              numberOfMonths={1}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-text">
            <input
              type="checkbox"
              checked={holidayDraft.recurring}
              onChange={(event) => setHolidayDraft((draft) => ({ ...draft, recurring: event.target.checked }))}
              className="h-3 w-3 rounded border-border"
            />
            Repeat every year
          </label>
        </div>
      </Dialog>
    </div>
  );
};

export default AccountDefaults;
