const path = require('path');
const fs = require('fs/promises');
const prisma = require('../config/prisma');
const { getSupabaseClient } = require('../lib/supabase');
const { getStorageForTenant } = require('../lib/storage');
const { processImage } = require('../lib/imageProcessor');

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_OPERATING_HOURS = {
  monday: { isOpen: true, open: '08:00', close: '18:00' },
  tuesday: { isOpen: true, open: '08:00', close: '18:00' },
  wednesday: { isOpen: true, open: '08:00', close: '18:00' },
  thursday: { isOpen: true, open: '08:00', close: '18:00' },
  friday: { isOpen: true, open: '08:00', close: '18:00' },
  saturday: { isOpen: true, open: '09:00', close: '17:00' },
  sunday: { isOpen: true, open: '09:00', close: '17:00' },
};

const createDefaultAccountDefaults = (tenant) => ({
  businessInfo: {
    name: tenant?.name ?? '',
    phone: '',
    email: '',
    website: '',
    address: {
      street: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States',
    },
    notes: '',
    logo: { url: null, fileName: null, uploadedAt: null, size: null },
  },
  operatingHours: DAY_KEYS.reduce((acc, key) => {
    acc[key] = { ...DEFAULT_OPERATING_HOURS[key] };
    return acc;
  }, {}),
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

const toDateOnly = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const normaliseHoliday = (holiday) => {
  if (!holiday) {
    return null;
  }
  const startDate = toDateOnly(holiday.startDate ?? holiday.date);
  const endDate = toDateOnly(holiday.endDate ?? holiday.date ?? holiday.startDate);
  if (!startDate) {
    return null;
  }
  return { recordId: holiday.recordId ?? `holiday-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: holiday.name ?? 'Holiday',
    startDate,
    endDate: endDate ?? startDate,
    recurring: Boolean(holiday.recurring),
  };
};

const normaliseOperatingHours = (incoming = {}) => {
  const next = {};
  DAY_KEYS.forEach((key) => {
    const source = incoming[key] ?? {};
    const defaults = DEFAULT_OPERATING_HOURS[key];
    const isOpen = typeof source.isOpen === 'boolean'
      ? source.isOpen
      : typeof source.enabled === 'boolean'
        ? source.enabled
        : defaults.isOpen;
    next[key] = {
      isOpen,
      open: isOpen ? (source.open ?? defaults.open) : null,
      close: isOpen ? (source.close ?? defaults.close) : null,
    };
  });
  return next;
};

const mergeBusinessInfo = (base, incoming = {}) => {
  const next = { ...base };
  if (incoming.name !== undefined) {
    next.name = incoming.name;
  }
  if (incoming.phone !== undefined) {
    next.phone = incoming.phone ?? '';
  }
  if (incoming.email !== undefined) {
    next.email = incoming.email ?? '';
  }
  if (incoming.website !== undefined) {
    next.website = incoming.website ?? '';
  }
  if (incoming.notes !== undefined) {
    next.notes = incoming.notes ?? '';
  }
  if (incoming.address) {
    next.address = { ...next.address, ...incoming.address };
  }
  if (incoming.logo) {
    next.logo = { ...next.logo, ...incoming.logo };
  }
  return next;
};

const mergeRegionalSettings = (base, incoming = {}) => ({
  ...base,
  ...incoming,
});

const mergeCurrencySettings = (base, incoming = {}, plan = 'FREE') => {
  if (plan === 'FREE') {
    return { supportedCurrencies: ['USD'], defaultCurrency: 'USD' };
  }
  const supported = Array.isArray(incoming.supportedCurrencies) && incoming.supportedCurrencies.length > 0
    ? Array.from(new Set(incoming.supportedCurrencies))
    : base.supportedCurrencies;
  const defaultCurrency = incoming.defaultCurrency && supported.includes(incoming.defaultCurrency)
    ? incoming.defaultCurrency
    : supported[0] ?? base.defaultCurrency;
  return {
    supportedCurrencies: supported,
    defaultCurrency,
  };
};

const mergeOperatingHours = (base, incoming = {}) => {
  const next = { ...base };
  DAY_KEYS.forEach((key) => {
    if (!incoming[key]) {
      return;
    }
    const day = incoming[key];
    const isOpen = typeof day.isOpen === 'boolean'
      ? day.isOpen
      : typeof day.enabled === 'boolean'
        ? day.enabled
        : base[key].isOpen;
    next[key] = {
      isOpen,
      open: isOpen ? (day.open ?? base[key].open) : null,
      close: isOpen ? (day.close ?? base[key].close) : null,
    };
  });
  return next;
};

const sortHolidays = (holidays = []) => [...holidays].sort((a, b) => {
  if (a.startDate === b.startDate) {
    return (a.endDate ?? '').localeCompare(b.endDate ?? '');
  }
  return a.startDate.localeCompare(b.startDate);
});

const applyDefaults = (tenantRecord, accountDefaults = {}) => {
  const defaults = createDefaultAccountDefaults(tenantRecord);
  const businessInfo = mergeBusinessInfo(defaults.businessInfo, accountDefaults.businessInfo);
  const operatingHours = normaliseOperatingHours(accountDefaults.operatingHours ?? defaults.operatingHours);
  const holidays = Array.isArray(accountDefaults.holidays)
    ? sortHolidays(accountDefaults.holidays.map(normaliseHoliday).filter(Boolean))
    : [];
  const regionalSettings = mergeRegionalSettings(defaults.regionalSettings, accountDefaults.regionalSettings);
  const currencySettings = mergeCurrencySettings(
    defaults.currencySettings,
    accountDefaults.currencySettings,
    tenantRecord.plan,
  );

  return {
    businessInfo,
    operatingHours,
    holidays,
    regionalSettings,
    currencySettings,
  };
};

const getSupabaseTenant = async (tenantId) => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data, error} = await client
    .from('Tenant')
    .select('recordId, slug, name, plan, settings')
    .eq('recordId', tenantId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ?? null;
};

const getPrismaTenant = async (tenantId) => prisma.tenant.findUnique({
  where: { recordId: tenantId },
  select: { recordId: true,
    slug: true,
    name: true,
    plan: true,
    settings: true,
  },
});

const fetchTenantRecord = async (tenant) => {
  const tenantId = typeof tenant === 'string' ? tenant : tenant?.recordId;
  if (!tenantId) {
    throw new Error('Tenant id is required');
  }
  const supabaseTenant = await getSupabaseTenant(tenantId);
  if (supabaseTenant) {
    return supabaseTenant;
  }
  const prismaTenant = await getPrismaTenant(tenantId);
  if (!prismaTenant) {
    throw new Error('Tenant not found');
  }
  return prismaTenant;
};

const persistTenantSettings = async (tenantId, settings) => {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('Tenant')
      .update({ settings })
      .eq('recordId', tenantId)
      .select('settings')
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data.settings;
  }
  const updated = await prisma.tenant.update({
    where: { recordId: tenantId },
    data: { settings },
    select: { settings: true },
  });
  return updated.settings;
};

exports.getAccountDefaults = async (tenant) => {
  const record = await fetchTenantRecord(tenant);
  return applyDefaults(record, record.settings?.accountDefaults ?? {});
};

exports.updateAccountDefaults = async (tenant, updates = {}) => {
  const record = await fetchTenantRecord(tenant);
  const base = applyDefaults(record, record.settings?.accountDefaults ?? {});

  const nextDefaults = {
    businessInfo: mergeBusinessInfo(base.businessInfo, updates.businessInfo),
    operatingHours: mergeOperatingHours(base.operatingHours, updates.operatingHours),
    holidays: Array.isArray(updates.holidays)
      ? sortHolidays(updates.holidays.map(normaliseHoliday).filter(Boolean))
      : base.holidays,
    regionalSettings: mergeRegionalSettings(base.regionalSettings, updates.regionalSettings),
    currencySettings: mergeCurrencySettings(base.currencySettings, updates.currencySettings, record.plan),
  };

  const nextSettings = {
    ...(record.settings ?? {}),
    accountDefaults: nextDefaults,
  };

  const persistedSettings = await persistTenantSettings(record.recordId, nextSettings);
  return applyDefaults(record, persistedSettings.accountDefaults ?? nextDefaults);
};

exports.saveTenantLogo = async (tenant, file) => {
  if (!tenant?.recordId) {
    throw new Error('Tenant context is required');
  }
  if (!file?.path) {
    throw new Error('File payload missing');
  }

  const record = await fetchTenantRecord(tenant);
  const storage = getStorageForTenant({ ...record, ...tenant });

  const outputDir = path.dirname(file.path);
  const [resizedPath] = await processImage({ inputPath: file.path, outputDir, sizes: [512] });
  const key = `tenants/${record.slug}/branding/logo-${Date.now()}.webp`;
  const uploadResult = await storage.put(resizedPath, key, { contentType: 'image/webp' });

  await Promise.all([
    fs.unlink(file.path).catch(() => {}),
    fs.unlink(resizedPath).catch(() => {}),
  ]);

  const logo = {
    url: storage.getUrl(uploadResult.key),
    fileName: path.basename(uploadResult.key),
    uploadedAt: new Date().toISOString(),
    size: uploadResult.size ?? null,
  };

  const currentDefaults = applyDefaults(record, record.settings?.accountDefaults ?? {});
  const nextDefaults = {
    ...currentDefaults,
    businessInfo: {
      ...currentDefaults.businessInfo,
      logo,
    },
  };

  const nextSettings = {
    ...(record.settings ?? {}),
    accountDefaults: nextDefaults,
  };

  const persistedSettings = await persistTenantSettings(record.recordId, nextSettings);
  const updated = applyDefaults(record, persistedSettings.accountDefaults ?? nextDefaults);
  return updated.businessInfo.logo;
};
