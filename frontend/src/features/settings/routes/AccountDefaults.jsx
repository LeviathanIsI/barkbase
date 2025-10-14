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
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import Calendar from '@/components/ui/Calendar';
import Select from '@/components/ui/Select';
import { apiClient, uploadClient } from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABEL = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
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
  { recordId: 'business',
    title: 'Business Profile',
    description: 'Logo, contact information, and on-brand details shared with customers.',
  },
  { recordId: 'scheduling',
    title: 'Scheduling & Availability',
    description: 'Daily operating hours and holiday closures that drive booking rules.',
  },
  { recordId: 'regional',
    title: 'Locale & Formatting',
    description: 'Time zone, locale, and formatting preferences for staff and owners.',
  },
  { recordId: 'billing',
    title: 'Currency & Billing',
    description: 'Currencies offered to customers and default billing preferences.',
  },
];

const TIME_ZONES = [
  { value: 'America/New_York', label: 'Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'Central (America/Chicago)' },
  { value: 'America/Denver', label: 'Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (America/Los_Angeles)' },
  { value: 'America/Phoenix', label: 'Arizona (America/Phoenix)' },
  { value: 'America/Anchorage', label: 'Alaska (America/Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Pacific/Honolulu)' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
  { value: 'UTC', label: 'UTC' },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - United States Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'NZD', label: 'NZD - New Zealand Dollar' },
];

const TIME_FORMATS = [
  { value: '12-hour', label: '12-hour (e.g., 4:30 PM)' },
  { value: '24-hour', label: '24-hour (e.g., 16:30)' },
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

  const regionalSettings = {
    ...defaults.regionalSettings,
    ...(payload.regionalSettings ?? {}),
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
      return format(startDate, 'PPP');
    }
    if (startDate.getTime() === endDate.getTime()) {
      return format(startDate, 'PPP');
    }
    return `${format(startDate, 'PPP')} - ${format(endDate, 'PPP')}`;
  } catch {
    return start;
  }
};

const Pill = ({ label, tone = 'neutral' }) => {
  const toneClasses =
    tone === 'success'
      ? 'bg-success/10 text-success border-success/40'
      : tone === 'warning'
        ? 'bg-warning/10 text-warning border-warning/40'
        : 'bg-surface/80 text-muted border-border/40';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses}`}>
      {label}
    </span>
  );
};

const Subheading = ({ title, description }) => (
  <div className="space-y-1">
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
    {description ? <p className="text-sm text-muted">{description}</p> : null}
  </div>
);

const TabNav = ({ active, onSelect }) => (
  <div className="mb-8 flex flex-wrap gap-2 border-b border-border/70">
    {TAB_ITEMS.map((tab) => {
      const isActive = active === tab.recordId;
      return (
        <button
          key={tab.recordId}
          type="button"
          onClick={() => onSelect(tab.recordId)}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'border border-border border-b-0 bg-surface text-primary shadow-sm'
              : 'text-muted hover:text-primary'
          }`}
        >
          {tab.title}
        </button>
      );
    })}
  </div>
);

const LoadingState = () => (
  <div className="flex h-64 items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
  </div>
);
const BusinessSection = ({
  register,
  control,
  errors,
  businessInfo,
  onLogoUpload,
  isLogoUploading,
}) => (
  <div className="space-y-6">
    <Card
      title="Brand Identity"
      description="Update the details that appear on invoices, booking emails, and the customer portal."
      className="border-border/80 shadow-sm"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Input
            label="Business Name"
            placeholder="Pine Ridge Kennels"
            error={errors.businessInfo?.name?.message}
            {...register('businessInfo.name')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="businessInfo.phone"
              control={control}
              render={({ field }) => (
                <Input
                  label="Business Phone"
                  placeholder="(555) 123-4567"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  error={errors.businessInfo?.phone?.message}
                />
              )}
            />
            <Input
              label="Business Email"
              type="email"
              placeholder="hello@pineridgekennels.com"
              error={errors.businessInfo?.email?.message}
              {...register('businessInfo.email')}
            />
          </div>
          <Input
            label="Website"
            placeholder="yourkennel.com"
            error={errors.businessInfo?.website?.message}
            {...register('businessInfo.website')}
          />
          <Textarea
            label="Customer-facing Notes"
            helper="Optional summary that appears on booking confirmations and owner receipts."
            rows={4}
            {...register('businessInfo.notes')}
          />
        </div>
        <div className="rounded-xl border border-border/60 bg-surface/70 p-4">
          <Subheading title="Logo" description="Square images work best. We crop and optimize for email and PDF output." />
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-surface">
              {businessInfo?.logo?.url ? (
                <img src={businessInfo.logo.url} alt="Business logo" className="h-full w-full object-cover" />
              ) : (
                <ImageUp className="h-8 w-8 text-muted" />
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
                variant="secondary"
                className="w-full justify-center"
                onClick={(event) => event.currentTarget.previousSibling?.click()}
                disabled={isLogoUploading}
              >
                {isLogoUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
            </label>
            <p className="text-xs text-muted">PNG, JPG, or WebP - max 5 MB</p>
          </div>
        </div>
      </div>
    </Card>

    <Card
      title="Location & Mailing Address"
      description="Used on invoices, legal notices, and outbound communications."
      className="border-border/80 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Street" placeholder="123 Bark Lane" {...register('businessInfo.address.street')} />
        <Input label="Unit / Suite" placeholder="Building 2" {...register('businessInfo.address.street2')} />
        <Input label="City" placeholder="Portland" {...register('businessInfo.address.city')} />
        <Input label="State / Province" placeholder="OR" {...register('businessInfo.address.state')} />
        <Input label="Postal Code" placeholder="97205" {...register('businessInfo.address.postalCode')} />
        <Input label="Country" placeholder="United States" {...register('businessInfo.address.country')} />
      </div>
    </Card>
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
  <div className="space-y-6">
    <Card
      title="Weekly Operating Hours"
      description="These hours drive booking availability and appear on customer confirmations."
      className="border-border/80 shadow-sm"
    >
      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="min-w-full divide-y divide-border/70 text-sm">
          <thead className="bg-surface/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Day</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {DAY_ORDER.map((day) => {
              const dayHours = operatingHours?.[day];
              const dayErrors = errors.operatingHours?.[day];
              return (
                <tr key={day} className="bg-background/40">
                  <td className="px-4 py-3 font-medium text-text">{DAY_LABEL[day]}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={Boolean(dayHours?.isOpen)}
                        onChange={(event) => onSetHours(day, 'isOpen', event.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      {dayHours?.isOpen ? 'Open' : 'Closed'}
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    {dayHours?.isOpen ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Controller
                          name={`operatingHours.${day}.open`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="time"
                              className="w-32"
                              value={field.value ?? ''}
                              onChange={(event) => field.onChange(event.target.value)}
                              error={dayErrors?.open?.message}
                            />
                          )}
                        />
                        <span className="text-muted">to</span>
                        <Controller
                          name={`operatingHours.${day}.close`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="time"
                              className="w-32"
                              value={field.value ?? ''}
                              onChange={(event) => field.onChange(event.target.value)}
                              error={dayErrors?.close?.message}
                            />
                          )}
                        />
                      </div>
                    ) : (
                      <span className="text-muted">Closed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>

    <Card
      title="Holiday Schedule"
      description="Closed dates immediately block new bookings and remind staff to plan workloads."
      className="border-border/80 shadow-sm"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <CalendarDays className="h-4 w-4" />
            {holidayUsageLabel}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onAddHoliday} disabled={!canAddHoliday}>
            <Plus className="mr-2 h-4 w-4" />
            Add Holiday
          </Button>
        </div>
      }
    >
      {holidays.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-surface/70 px-4 py-6 text-sm text-muted">
          You haven't scheduled any closed dates yet.
        </div>
      ) : (
        <div className="space-y-3">
          {holidays.map((holiday) => (
            <div
              key={holiday.recordId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface/70 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-text">{holiday.name}</p>
                <p className="text-xs text-muted">{formatHolidayRange(holiday.startDate, holiday.endDate)}</p>
                {holiday.recurring ? <Pill label="Repeats each year" tone="success" /> : null}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveHoliday(holiday.recordId)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
      {isFreePlan && !canAddHoliday ? (
        <div className="mt-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-xs text-warning">
          Free plans can store up to 12 closures. Upgrade for unlimited holiday scheduling.
        </div>
      ) : null}
    </Card>
  </div>
);

const LocaleSection = ({
  control,
  errors,
}) => (
  <div className="space-y-6">
    <Card
      title="Primary Time Zone"
      description="All bookings, reminders, and staff calendars will use this time zone as the source of truth."
      className="border-border/80 shadow-sm"
    >
      <Controller
        name="regionalSettings.timeZone"
        control={control}
        render={({ field }) => (
          <Select
            label="Default Time Zone"
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            error={errors.regionalSettings?.timeZone?.message}
          >
            {TIME_ZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </Select>
        )}
      />
    </Card>

    <Card
      title="Formatting Preferences"
      description="Set how we display dates and times to staff and pet owners."
      className="border-border/80 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="regionalSettings.dateFormat"
          control={control}
          render={({ field }) => (
            <Select label="Date Format" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
              {DATE_FORMATS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        />
        <Controller
          name="regionalSettings.timeFormat"
          control={control}
          render={({ field }) => (
            <Select label="Time Format" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
              {TIME_FORMATS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        />
        <Controller
          name="regionalSettings.weekStartsOn"
          control={control}
          render={({ field }) => (
            <Select label="Week Starts On" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
              {WEEK_START_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        />
      </div>
    </Card>
  </div>
);
const AccountDefaults = () => {
  const queryClient = useQueryClient();
  const tenant = useTenantStore((state) => state.tenant);
  const plan = tenant?.plan ?? 'FREE';
  const tenantName = tenant?.name ?? '';

  const [activeTab, setActiveTab] = useState('business');
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayDraft, setHolidayDraft] = useState(
    {
      name: '',
      dates: { from: undefined, to: undefined },
      recurring: false,
    },
  );

  const accountDefaultsQuery = useQuery({
    queryKey: ['account-defaults'],
    queryFn: async () => apiClient('/api/v1/account-defaults'),
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
    mutationFn: async (payload) =>
      apiClient('/api/v1/account-defaults', {
        method: 'PATCH',
        body: payload,
      }),
    onSuccess: (data) => {
      const normalized = normalizeResponse(data, tenantName, plan);
      reset(normalized, { keepDirty: false });
      queryClient.invalidateQueries({ queryKey: ['account-defaults'] });
      toast.success('Account defaults saved');
    },
    onError: (error) => {
      toast.error(error?.message ?? 'Unable to save account defaults');
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
        toast.success('Logo uploaded successfully');
      }
    } catch (error) {
      toast.error(error?.message ?? 'Unable to upload logo right now');
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
      toast.error('Pick at least one date for the holiday');
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
    () => (isFreePlan ? `${holidays.length} of ${FREE_TIER_HOLIDAY_LIMIT} holidays used` : 'Unlimited'),
    [holidays.length, isFreePlan],
  );

  if (accountDefaultsQuery.isLoading) {
    return <LoadingState />;
  }

  if (accountDefaultsQuery.isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface/70 p-6 text-center text-sm text-muted">
        <AlertCircle className="h-6 w-6 text-danger" />
        <p>We couldn't load your account defaults. Refresh to try again.</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[1600px] pb-32">
      <header className="mb-8 flex flex-col gap-2">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>Settings</span>
          <span>-</span>
          <span>Account Management</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-text">Account Defaults</h1>
            <p className="mt-1 text-sm text-muted">
              Keep your kennel's fundamentals aligned-branding, hours, locale, and billing defaults power every booking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill label={`Plan: ${plan}`} tone="neutral" />
            <Pill label={tenant?.slug ?? 'default'} tone="neutral" />
          </div>
        </div>
      </header>

      <TabNav active={activeTab} onSelect={setActiveTab} />
      <p className="mb-6 text-sm text-muted">
        {TAB_ITEMS.find((tab) => tab.recordId === activeTab)?.description}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {activeTab === 'business' ? (
          <BusinessSection
            register={register}
            control={control}
            errors={errors}
            businessInfo={businessInfo}
            onLogoUpload={handleLogoUpload}
            isLogoUploading={isLogoUploading}
          />
        ) : null}

        {activeTab === 'scheduling' ? (
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
        ) : null}

        {activeTab === 'regional' ? (
          <LocaleSection control={control} errors={errors} />
        ) : null}

        {activeTab === 'billing' ? (
          <BillingSection
            control={control}
            errors={errors}
            currencySettings={currencySettings}
            setValue={setValue}
            isFreePlan={isFreePlan}
          />
        ) : null}
      </form>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface/95 px-4 py-4 shadow-[0_-6px_18px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-2 lg:px-6">
          <div className="text-sm text-muted">
            {isDirty ? 'You have unsaved changes' : 'All changes saved'}
          </div>
          <Button type="submit" form={form.formId} disabled={!isDirty || saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      <Dialog
        open={holidayDialogOpen}
        onOpenChange={setHolidayDialogOpen}
        title="Add Holiday Closure"
        description="Pick a date range and we'll prevent bookings during the closure."
        footer={
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setHolidayDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={commitHolidayDraft}>Add Holiday</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Holiday Name"
            placeholder="Memorial Day"
            value={holidayDraft.name}
            onChange={(event) => setHolidayDraft((draft) => ({ ...draft, name: event.target.value }))}
          />
          <div>
            <p className="mb-2 text-sm font-medium text-text">Dates</p>
            <Calendar
              mode="range"
              selected={holidayDraft.dates}
              onSelect={(range) =>
                setHolidayDraft((draft) => ({
                  ...draft,
                  dates: range ?? { from: undefined, to: undefined },
                }))
              }
              numberOfMonths={2}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={holidayDraft.recurring}
              onChange={(event) => setHolidayDraft((draft) => ({ ...draft, recurring: event.target.checked }))}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Repeat every year
          </label>
        </div>
      </Dialog>
    </div>
  );
};

export default AccountDefaults;
