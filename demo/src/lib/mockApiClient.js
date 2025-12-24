/**
 * =============================================================================
 * BarkBase Demo - Mock API Client
 * =============================================================================
 *
 * Simulates API responses using static mock data for demo purposes.
 * All responses include a simulated network delay for realistic UX.
 *
 * =============================================================================
 */

import ownersData from '@/data/owners.json';
import petsData from '@/data/pets.json';
import bookingsData from '@/data/bookings.json';
import servicesData from '@/data/services.json';
import vaccinationsData from '@/data/vaccinations.json';
import staffData from '@/data/staff.json';
import dashboardData from '@/data/dashboard.json';

// Simulated network delay (ms)
const DELAY_MS = 300;

/**
 * Simulate network delay
 */
const delay = (ms = DELAY_MS) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a unique ID for new records
 */
const generateId = (prefix = 'new') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * In-memory state for demo mutations
 * This allows "saving" to work within a session
 */
let demoState = {
  owners: [...ownersData],
  pets: [...petsData],
  bookings: [...bookingsData],
  services: [...servicesData],
  vaccinations: [...vaccinationsData],
  staff: [...staffData],
  dashboard: { ...dashboardData },
};

/**
 * Reset demo state to initial data
 */
export const resetDemoState = () => {
  demoState = {
    owners: [...ownersData],
    pets: [...petsData],
    bookings: [...bookingsData],
    services: [...servicesData],
    vaccinations: [...vaccinationsData],
    staff: [...staffData],
    dashboard: { ...dashboardData },
  };
  console.log('[Demo] State reset to initial data');
};

/**
 * Route matcher helpers
 */
const matchRoute = (url, pattern) => {
  // Convert pattern like '/api/v1/owners/:id' to regex
  const regexPattern = pattern
    .replace(/:[^/]+/g, '([^/]+)')
    .replace(/\//g, '\\/');
  const regex = new RegExp(`^${regexPattern}$`);
  return url.match(regex);
};

const extractId = (url, pattern) => {
  const match = matchRoute(url, pattern);
  return match ? match[1] : null;
};

/**
 * Mock GET handlers
 */
const handleGet = async (url, params = {}) => {
  await delay();

  // Dashboard
  if (url.includes('/dashboard') || url.includes('/stats')) {
    return { data: demoState.dashboard };
  }

  // Owners list
  if (url.match(/\/owners\/?$/) || url.includes('/api/v1/owners')) {
    let result = [...demoState.owners];

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      result = result.filter(o =>
        o.firstName.toLowerCase().includes(search) ||
        o.lastName.toLowerCase().includes(search) ||
        o.email.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (params.status && params.status !== 'all') {
      result = result.filter(o => o.status === params.status);
    }

    return {
      data: {
        items: result,
        total: result.length,
        page: params.page || 1,
        pageSize: params.pageSize || 50,
      }
    };
  }

  // Single owner
  const ownerId = extractId(url, '/api/v1/owners/:id') || extractId(url, '/owners/:id');
  if (ownerId) {
    const owner = demoState.owners.find(o => o.id === ownerId);
    if (owner) {
      // Include owner's pets
      const ownerPets = demoState.pets.filter(p => p.ownerId === ownerId);
      return { data: { ...owner, pets: ownerPets } };
    }
    throw new Error('Owner not found');
  }

  // Pets list
  if (url.match(/\/pets\/?$/) || url.includes('/api/v1/pets')) {
    let result = [...demoState.pets];

    // Apply search filter
    if (params.search) {
      const search = params.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.breed.toLowerCase().includes(search)
      );
    }

    // Apply owner filter
    if (params.ownerId) {
      result = result.filter(p => p.ownerId === params.ownerId);
    }

    // Enrich with owner info
    result = result.map(pet => {
      const owner = demoState.owners.find(o => o.id === pet.ownerId);
      return {
        ...pet,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
        ownerPhone: owner?.phone,
      };
    });

    return {
      data: {
        items: result,
        total: result.length,
        page: params.page || 1,
        pageSize: params.pageSize || 50,
      }
    };
  }

  // Single pet
  const petId = extractId(url, '/api/v1/pets/:id') || extractId(url, '/pets/:id');
  if (petId) {
    const pet = demoState.pets.find(p => p.id === petId);
    if (pet) {
      const owner = demoState.owners.find(o => o.id === pet.ownerId);
      const petVaccinations = demoState.vaccinations.filter(v => v.petId === petId);
      const petBookings = demoState.bookings.filter(b => b.petId === petId);
      return {
        data: {
          ...pet,
          owner,
          vaccinations: petVaccinations,
          bookings: petBookings,
        }
      };
    }
    throw new Error('Pet not found');
  }

  // Bookings list
  if (url.match(/\/bookings\/?$/) || url.includes('/api/v1/bookings')) {
    let result = [...demoState.bookings];

    // Apply status filter
    if (params.status && params.status !== 'all') {
      result = result.filter(b => b.status === params.status);
    }

    // Apply date range filter
    if (params.startDate) {
      result = result.filter(b => b.checkInDate >= params.startDate);
    }
    if (params.endDate) {
      result = result.filter(b => b.checkOutDate <= params.endDate);
    }

    return {
      data: {
        items: result,
        total: result.length,
        page: params.page || 1,
        pageSize: params.pageSize || 50,
      }
    };
  }

  // Single booking
  const bookingId = extractId(url, '/api/v1/bookings/:id') || extractId(url, '/bookings/:id');
  if (bookingId) {
    const booking = demoState.bookings.find(b => b.id === bookingId);
    if (booking) {
      const pet = demoState.pets.find(p => p.id === booking.petId);
      const owner = demoState.owners.find(o => o.id === booking.ownerId);
      return { data: { ...booking, pet, owner } };
    }
    throw new Error('Booking not found');
  }

  // Services list
  if (url.includes('/services')) {
    let result = [...demoState.services];

    if (params.category) {
      result = result.filter(s => s.category === params.category);
    }

    if (params.isActive !== undefined) {
      result = result.filter(s => s.isActive === params.isActive);
    }

    return { data: { items: result, total: result.length } };
  }

  // Vaccinations
  if (url.includes('/vaccinations')) {
    let result = [...demoState.vaccinations];

    if (params.petId) {
      result = result.filter(v => v.petId === params.petId);
    }

    if (params.status && params.status !== 'all') {
      result = result.filter(v => v.status === params.status);
    }

    return { data: { items: result, total: result.length } };
  }

  // Staff
  if (url.includes('/staff') || url.includes('/members')) {
    let result = [...demoState.staff];

    if (params.role) {
      result = result.filter(s => s.role === params.role);
    }

    if (params.department) {
      result = result.filter(s => s.department === params.department);
    }

    return { data: { items: result, total: result.length } };
  }

  // Calendar/Schedule data
  if (url.includes('/calendar')) {
    const { startDate, endDate } = params;
    let events = demoState.bookings.map(booking => ({
      id: booking.id,
      title: `${booking.petName} - ${booking.serviceName}`,
      start: `${booking.checkInDate}T${booking.checkInTime || '09:00'}`,
      end: `${booking.checkOutDate}T${booking.checkOutTime || '17:00'}`,
      status: booking.status,
      petId: booking.petId,
      ownerId: booking.ownerId,
      serviceId: booking.serviceId,
    }));

    if (startDate) {
      events = events.filter(e => e.start >= startDate);
    }
    if (endDate) {
      events = events.filter(e => e.end <= endDate);
    }

    return { data: { events } };
  }

  // Tenant config (for bootstrap)
  if (url.includes('/config/tenant') || url.includes('/tenants')) {
    return {
      data: {
        id: 'demo-tenant',
        slug: 'demo',
        name: 'BarkBase Demo',
        plan: 'PROFESSIONAL',
        features: {
          boarding: true,
          daycare: true,
          grooming: true,
          training: true,
          transport: true,
        },
        settings: {
          timezone: 'America/Chicago',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
        },
      }
    };
  }

  // Default: return empty result
  console.warn(`[Mock API] Unhandled GET: ${url}`, params);
  return { data: null };
};

/**
 * Mock POST handlers
 */
const handlePost = async (url, body) => {
  await delay();

  // Create owner
  if (url.includes('/owners')) {
    const newOwner = {
      id: generateId('owner'),
      ...body,
      status: 'active',
      createdAt: new Date().toISOString(),
      totalSpent: 0,
      visitCount: 0,
    };
    demoState.owners.push(newOwner);
    return { data: newOwner };
  }

  // Create pet
  if (url.includes('/pets')) {
    const newPet = {
      id: generateId('pet'),
      ...body,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    demoState.pets.push(newPet);
    return { data: newPet };
  }

  // Create booking
  if (url.includes('/bookings')) {
    const pet = demoState.pets.find(p => p.id === body.petId);
    const owner = demoState.owners.find(o => o.id === pet?.ownerId);
    const service = demoState.services.find(s => s.id === body.serviceId);

    const newBooking = {
      id: generateId('booking'),
      ...body,
      petName: pet?.name,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
      ownerId: pet?.ownerId,
      serviceName: service?.name,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    demoState.bookings.push(newBooking);
    return { data: newBooking };
  }

  // Check-in
  if (url.includes('/check-in')) {
    const { bookingId } = body;
    const bookingIndex = demoState.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex >= 0) {
      demoState.bookings[bookingIndex] = {
        ...demoState.bookings[bookingIndex],
        status: 'checked_in',
        actualCheckIn: new Date().toISOString(),
      };
      return { data: demoState.bookings[bookingIndex] };
    }
    throw new Error('Booking not found');
  }

  // Check-out
  if (url.includes('/check-out')) {
    const { bookingId } = body;
    const bookingIndex = demoState.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex >= 0) {
      demoState.bookings[bookingIndex] = {
        ...demoState.bookings[bookingIndex],
        status: 'completed',
        actualCheckOut: new Date().toISOString(),
      };
      return { data: demoState.bookings[bookingIndex] };
    }
    throw new Error('Booking not found');
  }

  console.warn(`[Mock API] Unhandled POST: ${url}`, body);
  return { data: { success: true, id: generateId() } };
};

/**
 * Mock PUT/PATCH handlers
 */
const handlePut = async (url, body) => {
  await delay();

  // Update owner
  const ownerId = extractId(url, '/api/v1/owners/:id') || extractId(url, '/owners/:id');
  if (ownerId) {
    const index = demoState.owners.findIndex(o => o.id === ownerId);
    if (index >= 0) {
      demoState.owners[index] = { ...demoState.owners[index], ...body };
      return { data: demoState.owners[index] };
    }
    throw new Error('Owner not found');
  }

  // Update pet
  const petId = extractId(url, '/api/v1/pets/:id') || extractId(url, '/pets/:id');
  if (petId) {
    const index = demoState.pets.findIndex(p => p.id === petId);
    if (index >= 0) {
      demoState.pets[index] = { ...demoState.pets[index], ...body };
      return { data: demoState.pets[index] };
    }
    throw new Error('Pet not found');
  }

  // Update booking
  const bookingId = extractId(url, '/api/v1/bookings/:id') || extractId(url, '/bookings/:id');
  if (bookingId) {
    const index = demoState.bookings.findIndex(b => b.id === bookingId);
    if (index >= 0) {
      demoState.bookings[index] = { ...demoState.bookings[index], ...body };
      return { data: demoState.bookings[index] };
    }
    throw new Error('Booking not found');
  }

  console.warn(`[Mock API] Unhandled PUT: ${url}`, body);
  return { data: { success: true } };
};

/**
 * Mock DELETE handlers
 */
const handleDelete = async (url) => {
  await delay();

  // Delete owner
  const ownerId = extractId(url, '/api/v1/owners/:id') || extractId(url, '/owners/:id');
  if (ownerId) {
    demoState.owners = demoState.owners.filter(o => o.id !== ownerId);
    return { data: null };
  }

  // Delete pet
  const petId = extractId(url, '/api/v1/pets/:id') || extractId(url, '/pets/:id');
  if (petId) {
    demoState.pets = demoState.pets.filter(p => p.id !== petId);
    return { data: null };
  }

  // Delete booking
  const bookingId = extractId(url, '/api/v1/bookings/:id') || extractId(url, '/bookings/:id');
  if (bookingId) {
    demoState.bookings = demoState.bookings.filter(b => b.id !== bookingId);
    return { data: null };
  }

  console.warn(`[Mock API] Unhandled DELETE: ${url}`);
  return { data: null };
};

/**
 * Mock API Client
 * Mirrors the interface of the real apiClient
 */
const mockApiClient = {
  get: async (path, options = {}) => {
    const { params } = options;
    console.log(`[Demo API] GET ${path}`, params || '');
    return handleGet(path, params);
  },

  post: async (path, body) => {
    console.log(`[Demo API] POST ${path}`, body);
    return handlePost(path, body);
  },

  put: async (path, body) => {
    console.log(`[Demo API] PUT ${path}`, body);
    return handlePut(path, body);
  },

  patch: async (path, body) => {
    console.log(`[Demo API] PATCH ${path}`, body);
    return handlePut(path, body); // Use same handler as PUT
  },

  delete: async (path, options = {}) => {
    console.log(`[Demo API] DELETE ${path}`);
    return handleDelete(path);
  },

  // Mock auth - always authenticated in demo
  auth: {
    signIn: async () => ({
      success: true,
      user: {
        id: 'demo-user',
        email: 'demo@barkbase.io',
        name: 'Demo User',
      }
    }),
    signOut: async () => ({ success: true }),
    getCurrentUser: async () => ({
      id: 'demo-user',
      email: 'demo@barkbase.io',
      name: 'Demo User',
      role: 'admin',
    }),
  },

  // Mock storage - return placeholder URLs
  storage: {
    getUploadUrl: async () => ({ uploadUrl: '#', key: 'demo-file' }),
    getDownloadUrl: async (key) => `/images/placeholder.jpg`,
  },

  // Mock file upload
  uploadFile: async ({ file, category }) => {
    await delay();
    console.log(`[Demo API] File upload simulated: ${file?.name}`);
    return {
      key: `demo/${category}/${file?.name || 'file'}`,
      publicUrl: '/images/placeholder.jpg',
    };
  },
};

export { mockApiClient };
export default mockApiClient;
