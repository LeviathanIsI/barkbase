/**
 * =============================================================================
 * BarkBase Demo Mock API Client
 * =============================================================================
 *
 * Intercepts ALL API calls and routes to sessionStorage for persistence.
 * Maintains exact same interface as the real apiClient.
 *
 * Data persists until browser is closed (sessionStorage) or user clicks "Reset Demo"
 * =============================================================================
 */

import camelcaseKeys from 'camelcase-keys';
import { seedDemoData, DEMO_STORAGE_KEY } from './demoDataSeeder';

// Simulate network delay (200-400ms)
const delay = () => new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

// Generate unique IDs
let idCounter = Date.now();
const generateId = () => `demo-${++idCounter}`;

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const getStore = () => {
  try {
    const data = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (!data) {
      seedDemoData();
      return JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY) || '{}');
    }
    return JSON.parse(data);
  } catch {
    seedDemoData();
    return JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY) || '{}');
  }
};

const setStore = (data) => {
  sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
};

const getCollection = (name) => {
  const store = getStore();
  return store[name] || [];
};

const setCollection = (name, items) => {
  const store = getStore();
  store[name] = items;
  setStore(store);
};

const findById = (collection, id) => {
  const items = getCollection(collection);
  return items.find(item =>
    item.id === id ||
    item.id === parseInt(id, 10) ||
    item.recordId === id ||
    item.recordId === parseInt(id, 10)
  );
};

const updateById = (collection, id, updates) => {
  const items = getCollection(collection);
  const index = items.findIndex(item =>
    item.id === id ||
    item.id === parseInt(id, 10) ||
    item.recordId === id ||
    item.recordId === parseInt(id, 10)
  );
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    setCollection(collection, items);
    return items[index];
  }
  return null;
};

const deleteById = (collection, id) => {
  const items = getCollection(collection);
  const filtered = items.filter(item =>
    item.id !== id &&
    item.id !== parseInt(id, 10) &&
    item.recordId !== id &&
    item.recordId !== parseInt(id, 10)
  );
  setCollection(collection, filtered);
  return true;
};

const addItem = (collection, item) => {
  const items = getCollection(collection);
  const newId = generateId();
  const newItem = {
    ...item,
    id: newId,
    recordId: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(newItem);
  setCollection(collection, items);
  return newItem;
};

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

const routes = {
  // ---------------------------------------------------------------------------
  // PETS
  // ---------------------------------------------------------------------------
  'GET /api/v1/entity/pets': (params) => {
    let pets = getCollection('pets');
    const owners = getCollection('owners');

    // Enrich with owner info
    pets = pets.map(pet => {
      const owner = owners.find(o => o.id === pet.ownerId || o.recordId === pet.ownerId);
      return {
        ...pet,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
        owner: owner || null,
      };
    });

    // Apply filters
    if (params?.search) {
      const search = params.search.toLowerCase();
      pets = pets.filter(p =>
        p.name?.toLowerCase().includes(search) ||
        p.breed?.toLowerCase().includes(search) ||
        p.ownerName?.toLowerCase().includes(search)
      );
    }
    if (params?.status && params.status !== 'all') {
      pets = pets.filter(p => p.status === params.status);
    }
    if (params?.species) {
      pets = pets.filter(p => p.species?.toLowerCase() === params.species.toLowerCase());
    }

    // Pagination
    const page = parseInt(params?.page) || 1;
    const limit = parseInt(params?.limit) || 25;
    const total = pets.length;
    const start = (page - 1) * limit;
    const paginatedPets = pets.slice(start, start + limit);

    return {
      pets: paginatedPets,
      data: paginatedPets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  'GET /api/v1/entity/pets/:id': (params, id) => {
    const pet = findById('pets', id);
    if (!pet) throw new Error('Pet not found');
    const owners = getCollection('owners');
    const owner = owners.find(o => o.id === pet.ownerId || o.recordId === pet.ownerId);
    return { ...pet, owner, ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null };
  },

  'POST /api/v1/entity/pets': (body) => {
    return addItem('pets', { ...body, status: body.status || 'active' });
  },

  'PUT /api/v1/entity/pets/:id': (body, id) => {
    return updateById('pets', id, body);
  },

  'PATCH /api/v1/entity/pets/:id': (body, id) => {
    return updateById('pets', id, body);
  },

  'DELETE /api/v1/entity/pets/:id': (params, id) => {
    deleteById('pets', id);
    return { success: true };
  },

  // Pet vaccinations
  'GET /api/v1/entity/pets/:id/vaccinations': (params, id) => {
    const vaccinations = getCollection('vaccinations').filter(v =>
      v.petId === id || v.petId === parseInt(id, 10)
    );
    return { data: vaccinations, vaccinations };
  },

  'POST /api/v1/entity/pets/:id/vaccinations': (body, id) => {
    const pet = findById('pets', id);
    return addItem('vaccinations', { ...body, petId: id, petName: pet?.name });
  },

  'PUT /api/v1/entity/pets/:petId/vaccinations/:vaccinationId': (body, petId, vaccinationId) => {
    return updateById('vaccinations', vaccinationId, body);
  },

  'POST /api/v1/entity/pets/:petId/vaccinations/:vaccinationId/renew': (body, petId, vaccinationId) => {
    const oldVacc = findById('vaccinations', vaccinationId);
    if (!oldVacc) throw new Error('Vaccination not found');

    // Create renewal record
    const renewed = addItem('vaccinations', {
      ...oldVacc,
      ...body,
      id: undefined,
      recordId: undefined,
      previousVaccinationId: vaccinationId,
      administeredAt: body.administeredAt || new Date().toISOString(),
      expiresAt: body.expiresAt,
    });

    // Mark old as renewed
    updateById('vaccinations', vaccinationId, { status: 'renewed', renewedById: renewed.id });

    return renewed;
  },

  'DELETE /api/v1/entity/pets/:petId/vaccinations/:vaccinationId': (params, petId, vaccinationId) => {
    deleteById('vaccinations', vaccinationId);
    return { success: true };
  },

  'GET /api/v1/entity/pets/vaccinations/expiring': (params) => {
    const vaccinations = getCollection('vaccinations');
    const pets = getCollection('pets');
    const owners = getCollection('owners');
    const daysAhead = parseInt(params?.daysAhead) || 30;
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const expiring = vaccinations
      .filter(v => {
        if (!v.expiresAt && !v.expirationDate) return false;
        const expDate = new Date(v.expiresAt || v.expirationDate);
        return expDate <= futureDate && v.status !== 'renewed' && v.status !== 'archived';
      })
      .map(v => {
        const pet = pets.find(p => p.id === v.petId || p.recordId === v.petId);
        const owner = pet ? owners.find(o => o.id === pet.ownerId || o.recordId === pet.ownerId) : null;
        const expDate = new Date(v.expiresAt || v.expirationDate);
        return {
          ...v,
          petName: pet?.name || 'Unknown',
          ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
          status: expDate < now ? 'expired' : 'expiring',
        };
      });

    return { data: expiring, items: expiring, total: expiring.length, daysAhead };
  },

  // ---------------------------------------------------------------------------
  // OWNERS
  // ---------------------------------------------------------------------------
  'GET /api/v1/entity/owners': (params) => {
    let owners = getCollection('owners');
    const pets = getCollection('pets');

    // Enrich with pet count
    owners = owners.map(owner => {
      const ownerPets = pets.filter(p => p.ownerId === owner.id || p.ownerId === owner.recordId);
      return {
        ...owner,
        name: `${owner.firstName} ${owner.lastName}`,
        petCount: ownerPets.length,
        pets: ownerPets,
      };
    });

    // Apply filters
    if (params?.search) {
      const search = params.search.toLowerCase();
      owners = owners.filter(o =>
        o.firstName?.toLowerCase().includes(search) ||
        o.lastName?.toLowerCase().includes(search) ||
        o.email?.toLowerCase().includes(search) ||
        o.phone?.includes(search)
      );
    }
    if (params?.status && params.status !== 'all') {
      owners = owners.filter(o => o.status === params.status);
    }

    // Pagination
    const page = parseInt(params?.page) || 1;
    const limit = parseInt(params?.limit) || 25;
    const total = owners.length;
    const start = (page - 1) * limit;
    const paginatedOwners = owners.slice(start, start + limit);

    return {
      owners: paginatedOwners,
      data: paginatedOwners,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  'GET /api/v1/entity/owners/:id': (params, id) => {
    const owner = findById('owners', id);
    if (!owner) throw new Error('Owner not found');
    const pets = getCollection('pets').filter(p => p.ownerId === id || p.ownerId === parseInt(id, 10));
    return { ...owner, name: `${owner.firstName} ${owner.lastName}`, pets, petCount: pets.length };
  },

  'POST /api/v1/entity/owners': (body) => {
    return addItem('owners', { ...body, status: body.status || 'ACTIVE' });
  },

  'PUT /api/v1/entity/owners/:id': (body, id) => {
    return updateById('owners', id, body);
  },

  'PATCH /api/v1/entity/owners/:id': (body, id) => {
    return updateById('owners', id, body);
  },

  'DELETE /api/v1/entity/owners/:id': (params, id) => {
    deleteById('owners', id);
    return { success: true };
  },

  'GET /api/v1/entity/owners/:id/pets': (params, id) => {
    const pets = getCollection('pets').filter(p => p.ownerId === id || p.ownerId === parseInt(id, 10));
    return { data: pets, pets };
  },

  // ---------------------------------------------------------------------------
  // BOOKINGS
  // ---------------------------------------------------------------------------
  'GET /api/v1/operations/bookings': (params) => {
    let bookings = getCollection('bookings');
    const pets = getCollection('pets');
    const owners = getCollection('owners');

    // Enrich with pet and owner info
    bookings = bookings.map(booking => {
      const pet = pets.find(p => p.id === booking.petId || p.recordId === booking.petId);
      const owner = pet ? owners.find(o => o.id === pet.ownerId || o.recordId === pet.ownerId) : null;
      return {
        ...booking,
        petName: pet?.name || 'Unknown',
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
        pet,
        owner,
      };
    });

    // Apply date filters
    if (params?.startDate) {
      bookings = bookings.filter(b => b.startDate >= params.startDate);
    }
    if (params?.endDate) {
      bookings = bookings.filter(b => b.startDate <= params.endDate);
    }
    if (params?.status && params.status !== 'all') {
      bookings = bookings.filter(b => b.status === params.status);
    }

    // Pagination
    const page = parseInt(params?.page) || 1;
    const limit = parseInt(params?.limit) || 25;
    const total = bookings.length;
    const start = (page - 1) * limit;
    const paginatedBookings = bookings.slice(start, start + limit);

    return {
      bookings: paginatedBookings,
      data: paginatedBookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  'GET /api/v1/operations/bookings/:id': (params, id) => {
    const booking = findById('bookings', id);
    if (!booking) throw new Error('Booking not found');
    const pets = getCollection('pets');
    const owners = getCollection('owners');
    const pet = pets.find(p => p.id === booking.petId || p.recordId === booking.petId);
    const owner = pet ? owners.find(o => o.id === pet.ownerId || o.recordId === pet.ownerId) : null;
    return { ...booking, pet, owner, petName: pet?.name, ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null };
  },

  'POST /api/v1/operations/bookings': (body) => {
    return addItem('bookings', { ...body, status: body.status || 'CONFIRMED' });
  },

  'PUT /api/v1/operations/bookings/:id': (body, id) => {
    return updateById('bookings', id, body);
  },

  'PATCH /api/v1/operations/bookings/:id': (body, id) => {
    return updateById('bookings', id, body);
  },

  'DELETE /api/v1/operations/bookings/:id': (params, id) => {
    deleteById('bookings', id);
    return { success: true };
  },

  'POST /api/v1/operations/bookings/:id/checkin': (body, id) => {
    return updateById('bookings', id, { status: 'CHECKED_IN', checkedInAt: new Date().toISOString() });
  },

  'POST /api/v1/operations/bookings/:id/checkout': (body, id) => {
    return updateById('bookings', id, { status: 'CHECKED_OUT', checkedOutAt: new Date().toISOString() });
  },

  'PATCH /api/v1/operations/bookings/:id/status': (body, id) => {
    return updateById('bookings', id, { status: body.status });
  },

  // ---------------------------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------------------------
  'GET /api/v1/operations/tasks': (params) => {
    let tasks = getCollection('tasks');

    if (params?.status && params.status !== 'all') {
      tasks = tasks.filter(t => t.status === params.status);
    }
    if (params?.date) {
      tasks = tasks.filter(t => t.scheduledFor?.startsWith(params.date));
    }

    return { data: tasks, tasks };
  },

  'POST /api/v1/operations/tasks': (body) => {
    return addItem('tasks', { ...body, status: body.status || 'PENDING' });
  },

  'PUT /api/v1/operations/tasks/:id': (body, id) => {
    return updateById('tasks', id, body);
  },

  'POST /api/v1/operations/tasks/:id/complete': (body, id) => {
    return updateById('tasks', id, { status: 'COMPLETED', completedAt: new Date().toISOString() });
  },

  'DELETE /api/v1/operations/tasks/:id': (params, id) => {
    deleteById('tasks', id);
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // CALENDAR / SCHEDULES
  // ---------------------------------------------------------------------------
  'GET /api/v1/calendar/events': (params) => {
    const bookings = getCollection('bookings');
    const pets = getCollection('pets');
    const owners = getCollection('owners');

    const events = bookings.map(booking => {
      const pet = pets.find(p => p.id === booking.petId);
      const owner = pet ? owners.find(o => o.id === pet.ownerId) : null;
      return {
        id: booking.id,
        title: pet?.name || 'Unknown',
        start: booking.startDate,
        end: booking.endDate,
        status: booking.status,
        petName: pet?.name,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
        booking,
      };
    });

    // Filter by date range
    if (params?.start) {
      return events.filter(e => e.end >= params.start && e.start <= (params.end || params.start));
    }

    return { data: events, events };
  },

  'GET /api/v1/calendar/occupancy': (params) => {
    const bookings = getCollection('bookings');
    const kennels = getCollection('kennels');
    const capacity = kennels.length || 20;

    // Calculate occupancy for date range
    const start = params?.start ? new Date(params.start) : new Date();
    const end = params?.end ? new Date(params.end) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    const occupancy = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const occupied = bookings.filter(b =>
        b.startDate <= dateStr && b.endDate >= dateStr &&
        ['CONFIRMED', 'CHECKED_IN'].includes(b.status)
      ).length;
      occupancy.push({
        date: dateStr,
        occupied,
        available: capacity - occupied,
        capacity,
        occupancyRate: Math.round((occupied / capacity) * 100),
      });
    }

    return { data: occupancy, occupancy };
  },

  // ---------------------------------------------------------------------------
  // STAFF
  // ---------------------------------------------------------------------------
  'GET /api/v1/entity/staff': (params) => {
    const staff = getCollection('staff');
    return { data: staff, staff, meta: { total: staff.length } };
  },

  'POST /api/v1/entity/staff': (body) => {
    return addItem('staff', body);
  },

  'PUT /api/v1/entity/staff/:id': (body, id) => {
    return updateById('staff', id, body);
  },

  'DELETE /api/v1/entity/staff/:id': (params, id) => {
    deleteById('staff', id);
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // KENNELS / FACILITIES
  // ---------------------------------------------------------------------------
  'GET /api/v1/entity/facilities': (params) => {
    const kennels = getCollection('kennels');
    return { data: kennels, facilities: kennels };
  },

  'GET /api/v1/entity/facilities/:id': (params, id) => {
    return findById('kennels', id);
  },

  'POST /api/v1/entity/facilities': (body) => {
    return addItem('kennels', body);
  },

  'PUT /api/v1/entity/facilities/:id': (body, id) => {
    return updateById('kennels', id, body);
  },

  // ---------------------------------------------------------------------------
  // DASHBOARD / ANALYTICS
  // ---------------------------------------------------------------------------
  'GET /api/v1/analytics/dashboard': (params) => {
    const bookings = getCollection('bookings');
    const pets = getCollection('pets');
    const owners = getCollection('owners');
    const today = new Date().toISOString().split('T')[0];

    const arrivalsToday = bookings.filter(b => b.startDate === today && b.status === 'CONFIRMED').length;
    const departuresToday = bookings.filter(b => b.endDate === today && b.status === 'CHECKED_IN').length;
    const inFacility = bookings.filter(b => b.status === 'CHECKED_IN').length;

    return {
      arrivalsToday,
      departuresToday,
      inFacility,
      totalPets: pets.length,
      totalOwners: owners.length,
      totalBookings: bookings.length,
    };
  },

  'GET /api/v1/analytics/dashboard/summary': () => {
    const bookings = getCollection('bookings');
    const revenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    return {
      totalRevenue: revenue,
      bookingsThisMonth: bookings.length,
      averageBookingValue: bookings.length ? revenue / bookings.length : 0,
    };
  },

  // ---------------------------------------------------------------------------
  // SERVICES & ADD-ONS
  // ---------------------------------------------------------------------------
  'GET /api/v1/services': () => {
    const services = getCollection('services');
    return { data: services, services };
  },

  'POST /api/v1/services': (body) => {
    return addItem('services', body);
  },

  'PUT /api/v1/services/:id': (body, id) => {
    return updateById('services', id, body);
  },

  'DELETE /api/v1/services/:id': (params, id) => {
    deleteById('services', id);
    return { success: true };
  },

  'GET /api/v1/addon-services': () => {
    const addons = getCollection('addonServices');
    return { data: addons, addonServices: addons };
  },

  // ---------------------------------------------------------------------------
  // USER PROFILE & SETTINGS
  // ---------------------------------------------------------------------------
  'GET /api/v1/profile': () => {
    return {
      id: 'demo-user',
      email: 'demo@barkbase.io',
      firstName: 'Demo',
      lastName: 'User',
      role: 'ADMIN',
      propertyName: 'Happy Paws Kennel',
      businessName: 'Happy Paws Pet Resort',
    };
  },

  'PUT /api/v1/profile': (body) => {
    return { ...body, id: 'demo-user' };
  },

  'GET /api/v1/config/tenant': () => {
    return {
      id: 'demo-tenant',
      recordId: 'demo-tenant',
      slug: 'demo',
      name: 'Happy Paws Pet Resort',
      plan: 'PROFESSIONAL',
      features: ['vaccinations', 'bookings', 'reports', 'staff', 'payments'],
    };
  },

  'GET /api/v1/config/settings': () => {
    return getCollection('settings');
  },

  'PUT /api/v1/config/settings': (body) => {
    setCollection('settings', body);
    return body;
  },

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------
  'GET /api/v1/operations/notifications': () => {
    return { data: getCollection('notifications'), notifications: getCollection('notifications') };
  },

  'POST /api/v1/operations/notifications/:id/read': (body, id) => {
    return updateById('notifications', id, { read: true, readAt: new Date().toISOString() });
  },
};

// ============================================================================
// ROUTE MATCHER
// ============================================================================

const matchRoute = (method, path) => {
  // Direct match first
  const directKey = `${method} ${path}`;
  if (routes[directKey]) {
    return { handler: routes[directKey], params: [] };
  }

  // Pattern matching for :id params
  for (const routeKey of Object.keys(routes)) {
    const [routeMethod, routePath] = routeKey.split(' ');
    if (routeMethod !== method) continue;

    const routeParts = routePath.split('/');
    const pathParts = path.split('?')[0].split('/');

    if (routeParts.length !== pathParts.length) continue;

    const params = [];
    let match = true;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params.push(pathParts[i]);
      } else if (routeParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      return { handler: routes[routeKey], params };
    }
  }

  return null;
};

// ============================================================================
// API CLIENT METHODS
// ============================================================================

const parseQueryParams = (url) => {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const params = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
};

const handleRequest = async (method, path, body = null) => {
  await delay();

  // Ensure demo data is seeded
  getStore();

  const queryParams = parseQueryParams(path);
  const cleanPath = path.split('?')[0];

  const match = matchRoute(method, cleanPath);

  if (!match) {
    console.warn(`[DEMO API] No handler for ${method} ${cleanPath}`);
    // Return empty data for unhandled routes
    return { data: [] };
  }

  try {
    const result = match.handler(body || queryParams, ...match.params);
    const data = camelcaseKeys(result, { deep: true });
    return { data };
  } catch (error) {
    console.error(`[DEMO API] Error handling ${method} ${cleanPath}:`, error);
    throw error;
  }
};

const get = async (path, options = {}) => {
  const url = options?.params
    ? `${path}?${new URLSearchParams(options.params).toString()}`
    : path;
  return handleRequest('GET', url);
};

const post = async (path, body) => {
  return handleRequest('POST', path, body);
};

const put = async (path, body) => {
  return handleRequest('PUT', path, body);
};

const patch = async (path, body) => {
  return handleRequest('PATCH', path, body);
};

const del = async (path, options = {}) => {
  return handleRequest('DELETE', path, options?.data);
};

// ============================================================================
// AUTH MOCK
// ============================================================================

const auth = {
  signIn: async () => ({
    accessToken: 'demo-access-token',
    idToken: 'demo-id-token',
    refreshToken: 'demo-refresh-token',
  }),
  signOut: async () => {},
  getCurrentUser: async () => ({
    userId: 'demo-user',
    email: 'demo@barkbase.io',
    name: 'Demo User',
  }),
  getTokens: () => ({
    accessToken: 'demo-access-token',
    idToken: 'demo-id-token',
  }),
};

// ============================================================================
// STORAGE MOCK
// ============================================================================

const storage = {
  getUploadUrl: async () => ({
    uploadUrl: 'https://demo-upload.barkbase.io/upload',
    key: `demo-uploads/${Date.now()}`,
    publicUrl: 'https://demo-cdn.barkbase.io/placeholder.jpg',
  }),
  getDownloadUrl: async (key) => `https://demo-cdn.barkbase.io/${key}`,
};

const uploadFile = async ({ file, category }) => {
  await delay();
  return {
    key: `demo-uploads/${category}/${Date.now()}-${file?.name || 'file'}`,
    publicUrl: 'https://demo-cdn.barkbase.io/placeholder.jpg',
  };
};

// ============================================================================
// EXPORT
// ============================================================================

const mockApiClient = {
  auth,
  storage,
  uploadFile,
  uploadClient: uploadFile,
  get,
  post,
  put,
  patch,
  delete: del,
};

export { mockApiClient, auth, storage, uploadFile };
export default mockApiClient;
