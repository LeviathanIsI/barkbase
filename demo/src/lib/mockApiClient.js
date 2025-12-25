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
import toast from 'react-hot-toast';
import { seedDemoData, getDemoData, updateDemoData, clearDemoData } from './demoDataSeeder';

// Simulate network delay (200-400ms)
const delay = () => new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

// Generate unique IDs (UUID-like format)
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `demo-${timestamp}-${random}`;
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

const ensureSeeded = () => {
  seedDemoData();
};

const getCollection = (name) => {
  ensureSeeded();
  const data = getDemoData();
  return data[name] || [];
};

const setCollection = (name, items) => {
  updateDemoData(name, items);
};

const findById = (collection, id) => {
  const items = getCollection(collection);
  return items.find(item =>
    item.id === id ||
    item.id === String(id) ||
    item.recordId === id ||
    item.recordId === String(id)
  );
};

const updateById = (collection, id, updates) => {
  const items = getCollection(collection);
  const index = items.findIndex(item =>
    item.id === id ||
    item.id === String(id) ||
    item.recordId === id ||
    item.recordId === String(id)
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
    item.id !== String(id) &&
    item.recordId !== id &&
    item.recordId !== String(id)
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
  // PETS - /api/v1/entity/pets
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
    if (params?.ownerId) {
      pets = pets.filter(p => p.ownerId === params.ownerId);
    }

    // Pagination
    const page = parseInt(params?.page) || 1;
    const limit = parseInt(params?.limit) || 25;
    const total = pets.length;
    const start = (page - 1) * limit;
    const paginatedPets = pets.slice(start, start + limit);

    return {
      data: paginatedPets,
      pets: paginatedPets,
      items: paginatedPets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
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
    const created = addItem('pets', { ...body, status: body.status || 'active' });
    toast.success('Pet created successfully');
    return created;
  },

  'PUT /api/v1/entity/pets/:id': (body, id) => {
    const updated = updateById('pets', id, body);
    toast.success('Pet updated successfully');
    return updated;
  },

  'PATCH /api/v1/entity/pets/:id': (body, id) => {
    const updated = updateById('pets', id, body);
    toast.success('Pet updated');
    return updated;
  },

  'DELETE /api/v1/entity/pets/:id': (params, id) => {
    deleteById('pets', id);
    toast.success('Pet deleted');
    return { success: true };
  },

  // Pet vaccinations
  'GET /api/v1/entity/pets/:id/vaccinations': (params, id) => {
    const vaccinations = getCollection('vaccinations').filter(v =>
      v.petId === id || v.petId === String(id)
    );
    return { data: vaccinations, vaccinations, items: vaccinations };
  },

  'POST /api/v1/entity/pets/:id/vaccinations': (body, id) => {
    const pet = findById('pets', id);
    const created = addItem('vaccinations', { ...body, petId: id, petName: pet?.name });
    toast.success('Vaccination record added');
    return created;
  },

  'PUT /api/v1/entity/pets/:petId/vaccinations/:vaccinationId': (body, petId, vaccinationId) => {
    const updated = updateById('vaccinations', vaccinationId, body);
    toast.success('Vaccination updated');
    return updated;
  },

  'DELETE /api/v1/entity/pets/:petId/vaccinations/:vaccinationId': (params, petId, vaccinationId) => {
    deleteById('vaccinations', vaccinationId);
    toast.success('Vaccination record deleted');
    return { success: true };
  },

  'POST /api/v1/entity/pets/:petId/vaccinations/:vaccinationId/renew': (body, petId, vaccinationId) => {
    const oldVacc = findById('vaccinations', vaccinationId);
    if (!oldVacc) throw new Error('Vaccination not found');

    const renewed = addItem('vaccinations', {
      ...oldVacc,
      ...body,
      id: undefined,
      recordId: undefined,
      previousVaccinationId: vaccinationId,
      administeredAt: body.administeredAt || new Date().toISOString(),
    });

    updateById('vaccinations', vaccinationId, { status: 'renewed', renewedById: renewed.id });
    toast.success('Vaccination renewed');
    return renewed;
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
        const daysUntil = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        return {
          ...v,
          petName: pet?.name || 'Unknown',
          ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
          status: expDate < now ? 'expired' : 'expiring',
          daysUntil,
        };
      });

    return { data: expiring, items: expiring, total: expiring.length, daysAhead };
  },

  // ---------------------------------------------------------------------------
  // OWNERS - /api/v1/entity/owners
  // ---------------------------------------------------------------------------
  'GET /api/v1/entity/owners': (params) => {
    let owners = getCollection('owners');
    const pets = getCollection('pets');

    // Enrich with pet count and pets
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
      data: paginatedOwners,
      owners: paginatedOwners,
      items: paginatedOwners,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  'GET /api/v1/entity/owners/:id': (params, id) => {
    const owner = findById('owners', id);
    if (!owner) throw new Error('Owner not found');
    const pets = getCollection('pets').filter(p => p.ownerId === id || p.ownerId === String(id));
    return { ...owner, name: `${owner.firstName} ${owner.lastName}`, pets, petCount: pets.length };
  },

  'POST /api/v1/entity/owners': (body) => {
    const created = addItem('owners', { ...body, status: body.status || 'ACTIVE' });
    toast.success('Owner created successfully');
    return created;
  },

  'PUT /api/v1/entity/owners/:id': (body, id) => {
    const updated = updateById('owners', id, body);
    toast.success('Owner updated successfully');
    return updated;
  },

  'PATCH /api/v1/entity/owners/:id': (body, id) => {
    const updated = updateById('owners', id, body);
    toast.success('Owner updated');
    return updated;
  },

  'DELETE /api/v1/entity/owners/:id': (params, id) => {
    deleteById('owners', id);
    toast.success('Owner deleted');
    return { success: true };
  },

  'GET /api/v1/entity/owners/:id/pets': (params, id) => {
    const pets = getCollection('pets').filter(p => p.ownerId === id || p.ownerId === String(id));
    return { data: pets, pets, items: pets };
  },

  'POST /api/v1/entity/owners/:id/pets': (body, id) => {
    // Link pet to owner
    const { petId, isPrimary } = body;
    const updated = updateById('pets', petId, { ownerId: id, isPrimaryOwner: isPrimary });
    toast.success('Pet linked to owner');
    return updated;
  },

  'DELETE /api/v1/entity/owners/:ownerId/pets/:petId': (params, ownerId, petId) => {
    updateById('pets', petId, { ownerId: null });
    toast.success('Pet unlinked from owner');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // SEGMENTS - /api/v1/segments
  // ---------------------------------------------------------------------------
  'GET /api/v1/segments': (params) => {
    const segments = getCollection('segments') || [];
    return { data: segments, segments, items: segments, total: segments.length };
  },

  'GET /api/v1/segments/:id': (params, id) => {
    const segment = findById('segments', id);
    if (!segment) return { error: 'Segment not found', status: 404 };
    return { data: segment, segment };
  },

  'POST /api/v1/segments': (body) => {
    const id = 'segment-' + Date.now();
    const segment = {
      id,
      recordId: id,
      ...body,
      memberCount: body.memberIds?.length || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addToCollection('segments', segment);
    toast.success('Segment created');
    return { data: segment, segment };
  },

  'PUT /api/v1/segments/:id': (body, id) => {
    const updated = updateById('segments', id, {
      ...body,
      memberCount: body.memberIds?.length || body.memberCount || 0,
      updatedAt: new Date().toISOString()
    });
    toast.success('Segment updated');
    return { data: updated, segment: updated };
  },

  'PATCH /api/v1/segments/:id': (body, id) => {
    const updated = updateById('segments', id, {
      ...body,
      updatedAt: new Date().toISOString()
    });
    toast.success('Segment updated');
    return { data: updated, segment: updated };
  },

  'DELETE /api/v1/segments/:id': (params, id) => {
    deleteById('segments', id);
    toast.success('Segment deleted');
    return { success: true };
  },

  'GET /api/v1/segments/:id/members': (params, id) => {
    const segment = findById('segments', id);
    if (!segment) return { error: 'Segment not found', status: 404 };
    const owners = getCollection('owners') || [];
    const members = owners.filter(o => segment.memberIds?.includes(o.id));
    return { data: members, members, items: members, total: members.length };
  },

  'POST /api/v1/segments/:id/members': (body, id) => {
    const segment = findById('segments', id);
    if (!segment) return { error: 'Segment not found', status: 404 };
    const { ownerIds } = body;
    const memberIds = [...new Set([...(segment.memberIds || []), ...(ownerIds || [])])];
    const updated = updateById('segments', id, {
      memberIds,
      memberCount: memberIds.length,
      updatedAt: new Date().toISOString()
    });
    toast.success('Members added to segment');
    return { data: updated, segment: updated };
  },

  'DELETE /api/v1/segments/:id/members': (body, id) => {
    const segment = findById('segments', id);
    if (!segment) return { error: 'Segment not found', status: 404 };
    const { ownerIds } = body || {};
    const memberIds = (segment.memberIds || []).filter(mid => !(ownerIds || []).includes(mid));
    updateById('segments', id, {
      memberIds,
      memberCount: memberIds.length,
      updatedAt: new Date().toISOString()
    });
    toast.success('Members removed from segment');
    return { success: true };
  },

  'POST /api/v1/segments/refresh': () => {
    toast.success('Segments refreshed');
    return { success: true };
  },

  'POST /api/v1/segments/:id/clone': (body, id) => {
    const segment = findById('segments', id);
    if (!segment) return { error: 'Segment not found', status: 404 };
    const newId = 'segment-' + Date.now();
    const cloned = {
      ...segment,
      id: newId,
      recordId: newId,
      name: `${segment.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addToCollection('segments', cloned);
    toast.success('Segment cloned');
    return { data: cloned, segment: cloned };
  },

  // ---------------------------------------------------------------------------
  // BOOKINGS - /api/v1/operations/bookings
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
        // Calendar compatibility
        checkIn: booking.startDate,
        checkOut: booking.endDate,
      };
    });

    // Apply date filters
    if (params?.from || params?.startDate) {
      const from = params.from || params.startDate;
      bookings = bookings.filter(b => b.startDate >= from || b.endDate >= from);
    }
    if (params?.to || params?.endDate) {
      const to = params.to || params.endDate;
      bookings = bookings.filter(b => b.startDate <= to);
    }
    if (params?.status && params.status !== 'all') {
      bookings = bookings.filter(b => b.status === params.status || b.status === params.status.toUpperCase());
    }
    if (params?.petId) {
      bookings = bookings.filter(b => b.petId === params.petId);
    }
    if (params?.ownerId) {
      bookings = bookings.filter(b => b.owner?.id === params.ownerId || b.ownerId === params.ownerId);
    }

    // Pagination
    const page = parseInt(params?.page) || 1;
    const limit = parseInt(params?.limit) || 25;
    const total = bookings.length;
    const start = (page - 1) * limit;
    const paginatedBookings = bookings.slice(start, start + limit);

    return {
      data: paginatedBookings,
      bookings: paginatedBookings,
      items: paginatedBookings,
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
    return {
      ...booking,
      pet,
      owner,
      petName: pet?.name,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
      checkIn: booking.startDate,
      checkOut: booking.endDate,
    };
  },

  'POST /api/v1/operations/bookings': (body) => {
    const created = addItem('bookings', { ...body, status: body.status || 'CONFIRMED' });
    toast.success('Booking created successfully');
    return created;
  },

  'PUT /api/v1/operations/bookings/:id': (body, id) => {
    const updated = updateById('bookings', id, body);
    toast.success('Booking updated');
    return updated;
  },

  'PATCH /api/v1/operations/bookings/:id': (body, id) => {
    const updated = updateById('bookings', id, body);
    toast.success('Booking updated');
    return updated;
  },

  'DELETE /api/v1/operations/bookings/:id': (params, id) => {
    deleteById('bookings', id);
    toast.success('Booking cancelled');
    return { success: true };
  },

  'POST /api/v1/operations/bookings/:id/checkin': (body, id) => {
    const updated = updateById('bookings', id, {
      status: 'CHECKED_IN',
      checkedInAt: new Date().toISOString(),
      ...body,
    });
    toast.success('Check-in successful');
    return updated;
  },

  'POST /api/v1/operations/bookings/:id/checkout': (body, id) => {
    const updated = updateById('bookings', id, {
      status: 'CHECKED_OUT',
      checkedOutAt: new Date().toISOString(),
      ...body,
    });
    toast.success('Check-out successful');
    return updated;
  },

  'PATCH /api/v1/operations/bookings/:id/status': (body, id) => {
    const updated = updateById('bookings', id, { status: body.status });
    toast.success('Booking status updated');
    return updated;
  },

  // ---------------------------------------------------------------------------
  // STAFF - /api/v1/entity/staff
  // ---------------------------------------------------------------------------
  'GET /api/v1/entity/staff': (params) => {
    const staff = getCollection('staff');
    return { data: staff, staff, items: staff, meta: { total: staff.length } };
  },

  'GET /api/v1/entity/staff/:id': (params, id) => {
    const member = findById('staff', id);
    if (!member) throw new Error('Staff member not found');
    return member;
  },

  'POST /api/v1/entity/staff': (body) => {
    const created = addItem('staff', body);
    toast.success('Staff member added');
    return created;
  },

  'PUT /api/v1/entity/staff/:id': (body, id) => {
    const updated = updateById('staff', id, body);
    toast.success('Staff member updated');
    return updated;
  },

  'DELETE /api/v1/entity/staff/:id': (params, id) => {
    deleteById('staff', id);
    toast.success('Staff member removed');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // RUN TEMPLATES - /api/v1/run-templates
  // ---------------------------------------------------------------------------
  'GET /api/v1/run-templates': () => {
    const runs = getCollection('runs') || [];
    // Transform runs to run templates format
    const templates = runs.map(run => ({
      id: run.id,
      recordId: run.id,
      name: run.name,
      description: run.notes || '',
      capacity: run.capacity || 1,
      maxCapacity: run.maxCapacity || 1,
      type: run.size === 'xlarge' ? 'Suite' : run.size === 'large' ? 'Large' : 'Standard',
      building: run.building,
      features: run.features || [],
      status: run.status || 'available',
      isActive: true,
      startTime: '07:00',
      endTime: '19:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    }));
    return { data: templates, runTemplates: templates, total: templates.length };
  },

  'POST /api/v1/run-templates': (body) => {
    const created = addItem('runs', {
      ...body,
      status: 'available',
      isClean: true,
    });
    toast.success('Run template created');
    return { data: created };
  },

  'PUT /api/v1/run-templates/:id': (body, id) => {
    const updated = updateById('runs', id, body);
    toast.success('Run template updated');
    return { data: updated };
  },

  'DELETE /api/v1/run-templates/:id': (params, id) => {
    deleteById('runs', id);
    toast.success('Run template deleted');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // RUN ASSIGNMENTS - /api/v1/runs/assignments
  // ---------------------------------------------------------------------------
  'GET /api/v1/runs/assignments': (params) => {
    const runs = getCollection('runs') || [];
    const runAssignments = getCollection('runAssignments') || [];
    const pets = getCollection('pets') || [];
    const owners = getCollection('owners') || [];
    const today = new Date().toISOString().split('T')[0];

    // Filter assignments by date range if provided
    const filteredAssignments = runAssignments.filter(a => {
      if (!params?.startDate && !params?.endDate) return true;
      const assignmentDate = a.date;
      return (!params?.startDate || assignmentDate >= params.startDate) &&
             (!params?.endDate || assignmentDate <= params.endDate);
    });

    // Transform assignments to match expected format (with assignedDate, startAt, etc.)
    const transformedAssignments = filteredAssignments.map(a => {
      const pet = pets.find(p => p.id === a.petId);
      const owner = owners.find(o => o.id === a.ownerId);
      return {
        ...a,
        assignedDate: a.date, // Schedule component expects assignedDate
        startAt: `${a.date}T${a.startTime}:00`,
        endAt: `${a.date}T${a.endTime}:00`,
        petBreed: pet?.breed,
        petSpecies: pet?.species,
        ownerPhone: owner?.phone,
      };
    });

    // Transform runs for the response
    const runsWithInfo = runs.map(run => ({
      id: run.id,
      name: run.name,
      type: run.size === 'xlarge' ? 'Suite' : run.size === 'large' ? 'Large' : 'Standard',
      maxCapacity: run.maxCapacity || 1,
      building: run.building,
      features: run.features || [],
      status: run.status,
    }));

    return {
      data: transformedAssignments,
      assignments: transformedAssignments,
      runs: runsWithInfo,
      startDate: params?.startDate || today,
      endDate: params?.endDate || today,
      total: transformedAssignments.length,
    };
  },

  'POST /api/v1/runs/assignments': (body) => {
    // Assign a pet to a run
    const { runId, petId, bookingId, date, startTime, endTime, activityType } = body;

    // Update the booking with the run assignment
    if (bookingId) {
      const runs = getCollection('runs') || [];
      const run = runs.find(r => r.id === runId);
      updateById('bookings', bookingId, {
        runId,
        runName: run?.name,
      });
    }

    toast.success('Pet assigned to run');
    return {
      success: true,
      assignment: {
        id: `assignment-${Date.now()}`,
        runId,
        petId,
        bookingId,
        date,
        startTime,
        endTime,
        activityType,
      }
    };
  },

  // ---------------------------------------------------------------------------
  // FACILITIES/KENNELS - /api/v1/entity/facilities
  // ---------------------------------------------------------------------------
  'GET /api/v1/entity/facilities': (params) => {
    const runs = getCollection('runs');
    const bookings = getCollection('bookings');

    // Calculate occupancy for each run
    const today = new Date().toISOString().split('T')[0];
    const facilitiesWithOccupancy = runs.map(run => {
      const activeBookings = bookings.filter(b =>
        b.runId === run.id &&
        b.startDate <= today &&
        b.endDate >= today &&
        ['CONFIRMED', 'CHECKED_IN'].includes(b.status)
      );
      return {
        ...run,
        recordId: run.id,
        occupied: activeBookings.length,
        isAvailable: run.status === 'available' && activeBookings.length < (run.capacity || 1),
      };
    });

    return { data: facilitiesWithOccupancy, facilities: facilitiesWithOccupancy, kennels: facilitiesWithOccupancy };
  },

  'GET /api/v1/entity/facilities/:id': (params, id) => {
    const run = findById('runs', id);
    if (!run) throw new Error('Facility not found');
    return run;
  },

  'POST /api/v1/entity/facilities': (body) => {
    const created = addItem('runs', body);
    toast.success('Kennel/run created');
    return created;
  },

  'PUT /api/v1/entity/facilities/:id': (body, id) => {
    const updated = updateById('runs', id, body);
    toast.success('Kennel/run updated');
    return updated;
  },

  'DELETE /api/v1/entity/facilities/:id': (params, id) => {
    deleteById('runs', id);
    toast.success('Kennel/run deleted');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // SERVICES - /api/v1/services
  // ---------------------------------------------------------------------------
  'GET /api/v1/services': () => {
    const services = getCollection('services');
    return { data: services, services };
  },

  'GET /api/v1/services/:id': (params, id) => {
    return findById('services', id);
  },

  'POST /api/v1/services': (body) => {
    const created = addItem('services', body);
    toast.success('Service created');
    return created;
  },

  'PUT /api/v1/services/:id': (body, id) => {
    const updated = updateById('services', id, body);
    toast.success('Service updated');
    return updated;
  },

  'DELETE /api/v1/services/:id': (params, id) => {
    deleteById('services', id);
    toast.success('Service deleted');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // ADDON SERVICES - /api/v1/addon-services
  // ---------------------------------------------------------------------------
  'GET /api/v1/addon-services': () => {
    const addons = getCollection('serviceAddons');
    return { data: addons, addonServices: addons };
  },

  'POST /api/v1/addon-services': (body) => {
    const created = addItem('serviceAddons', body);
    toast.success('Add-on service created');
    return created;
  },

  'PUT /api/v1/addon-services/:id': (body, id) => {
    const updated = updateById('serviceAddons', id, body);
    toast.success('Add-on service updated');
    return updated;
  },

  'DELETE /api/v1/addon-services/:id': (params, id) => {
    deleteById('serviceAddons', id);
    toast.success('Add-on service deleted');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // INVOICES - /api/v1/financial/invoices
  // ---------------------------------------------------------------------------
  'GET /api/v1/financial/invoices': (params) => {
    let invoices = getCollection('invoices');
    const owners = getCollection('owners');

    // Enrich with owner info
    invoices = invoices.map(inv => {
      const owner = owners.find(o => o.id === inv.ownerId);
      return {
        ...inv,
        owner,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
      };
    });

    if (params?.status && params.status !== 'all') {
      invoices = invoices.filter(i => i.status === params.status);
    }
    if (params?.ownerId) {
      invoices = invoices.filter(i => i.ownerId === params.ownerId);
    }

    return { data: { invoices }, invoices, total: invoices.length };
  },

  'GET /api/v1/financial/invoices/:id': (params, id) => {
    return findById('invoices', id);
  },

  'POST /api/v1/financial/invoices': (body) => {
    const invoiceNumber = `INV-${Date.now()}`;
    const created = addItem('invoices', { ...body, invoiceNumber, status: body.status || 'draft' });
    toast.success('Invoice created');
    return created;
  },

  'PUT /api/v1/financial/invoices/:id': (body, id) => {
    const updated = updateById('invoices', id, body);
    toast.success('Invoice updated');
    return updated;
  },

  'PATCH /api/v1/financial/invoices/:id': (body, id) => {
    const updated = updateById('invoices', id, body);
    toast.success('Invoice updated');
    return updated;
  },

  'POST /api/v1/financial/invoices/:id/send': (body, id) => {
    const updated = updateById('invoices', id, { status: 'sent', sentAt: new Date().toISOString() });
    toast.success('Invoice sent');
    return updated;
  },

  'POST /api/v1/financial/invoices/:id/void': (body, id) => {
    const updated = updateById('invoices', id, { status: 'voided', voidedAt: new Date().toISOString() });
    toast.success('Invoice voided');
    return updated;
  },

  // ---------------------------------------------------------------------------
  // PAYMENTS - /api/v1/financial/payments
  // ---------------------------------------------------------------------------
  'GET /api/v1/financial/payments': (params) => {
    let payments = getCollection('payments');
    const owners = getCollection('owners');

    payments = payments.map(pmt => {
      const owner = owners.find(o => o.id === pmt.ownerId);
      return { ...pmt, owner, ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null };
    });

    if (params?.status && params.status !== 'all') {
      payments = payments.filter(p => p.status === params.status);
    }

    return { data: payments, payments, total: payments.length };
  },

  'GET /api/v1/financial/payments/:id': (params, id) => {
    return findById('payments', id);
  },

  'POST /api/v1/financial/payments': (body) => {
    const transactionId = `txn_demo_${Date.now()}`;
    const created = addItem('payments', {
      ...body,
      transactionId,
      status: body.status || 'completed',
      paymentDate: new Date().toISOString(),
    });
    toast.success('Payment recorded');
    return created;
  },

  'POST /api/v1/financial/payments/:id/refund': (body, id) => {
    const payment = findById('payments', id);
    if (!payment) throw new Error('Payment not found');

    const refund = addItem('payments', {
      ...payment,
      amount: -(body.amount || payment.amount),
      status: 'refunded',
      originalPaymentId: id,
      paymentDate: new Date().toISOString(),
    });

    updateById('payments', id, { refundedAt: new Date().toISOString() });
    toast.success('Refund processed');
    return refund;
  },

  // ---------------------------------------------------------------------------
  // TASKS - /api/v1/operations/tasks
  // ---------------------------------------------------------------------------
  'GET /api/v1/operations/tasks': (params) => {
    let tasks = getCollection('tasks') || [];

    if (params?.status && params.status !== 'all') {
      tasks = tasks.filter(t => t.status === params.status);
    }
    if (params?.date) {
      tasks = tasks.filter(t => t.scheduledFor?.startsWith(params.date) || t.dueDate?.startsWith(params.date));
    }

    return { data: tasks, tasks };
  },

  'POST /api/v1/operations/tasks': (body) => {
    const created = addItem('tasks', { ...body, status: body.status || 'PENDING' });
    toast.success('Task created');
    return created;
  },

  'PUT /api/v1/operations/tasks/:id': (body, id) => {
    const updated = updateById('tasks', id, body);
    toast.success('Task updated');
    return updated;
  },

  'POST /api/v1/operations/tasks/:id/complete': (body, id) => {
    const updated = updateById('tasks', id, { status: 'COMPLETED', completedAt: new Date().toISOString() });
    toast.success('Task completed');
    return updated;
  },

  'DELETE /api/v1/operations/tasks/:id': (params, id) => {
    deleteById('tasks', id);
    toast.success('Task deleted');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // CALENDAR - /api/v1/calendar
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
        title: pet?.name || 'Booking',
        start: booking.startDate,
        end: booking.endDate,
        status: booking.status,
        petName: pet?.name,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
        serviceType: booking.serviceType,
        booking,
      };
    });

    // Filter by date range if provided
    if (params?.start && params?.end) {
      return events.filter(e => e.end >= params.start && e.start <= params.end);
    }

    return { data: events, events };
  },

  'GET /api/v1/calendar/occupancy': (params) => {
    const bookings = getCollection('bookings');
    const runs = getCollection('runs');
    const capacity = runs.length || 20;

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
  // DASHBOARD / ANALYTICS - /api/v1/analytics
  // ---------------------------------------------------------------------------
  'GET /api/v1/analytics/dashboard': () => {
    const stats = getDemoData().dashboardStats || {};
    const bookings = getCollection('bookings');
    const pets = getCollection('pets');
    const owners = getCollection('owners');
    const today = new Date().toISOString().split('T')[0];

    const arrivalsToday = bookings.filter(b => b.startDate === today && ['PENDING', 'CONFIRMED'].includes(b.status)).length;
    const departuresToday = bookings.filter(b => b.endDate === today && b.status === 'CHECKED_IN').length;
    const inFacility = bookings.filter(b => b.status === 'CHECKED_IN').length;

    return {
      data: {
        todayArrivals: stats.arrivals?.total || arrivalsToday,
        todayDepartures: stats.departures?.total || departuresToday,
        totalPets: pets.length,
        totalCustomers: owners.length,
        pendingTasks: 0,
        occupancy: stats.occupancy || {
          current: inFacility,
          capacity: 18,
          rate: Math.round((inFacility / 18) * 100),
        },
        alerts: stats.alerts || [],
      },
    };
  },

  'GET /api/v1/analytics/dashboard/summary': () => {
    const bookings = getCollection('bookings');
    const revenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    return {
      data: {
        totalRevenue: revenue,
        bookingsThisMonth: bookings.length,
        averageBookingValue: bookings.length ? revenue / bookings.length : 0,
      },
    };
  },

  'GET /api/v1/analytics/occupancy/current': () => {
    const bookings = getCollection('bookings');
    const runs = getCollection('runs');
    const inFacility = bookings.filter(b => b.status === 'CHECKED_IN').length;
    const capacity = runs.length || 18;

    return {
      data: {
        currentOccupancy: inFacility,
        totalCapacity: capacity,
        occupancyRate: Math.round((inFacility / capacity) * 100),
        availableSpots: capacity - inFacility,
      },
    };
  },

  'GET /api/v1/analytics/revenue': (params) => {
    const payments = getCollection('payments');
    const completed = payments.filter(p => p.status === 'completed' && p.amount > 0);
    const total = completed.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      data: {
        totalRevenue: total,
        transactionCount: completed.length,
        averageTransactionValue: completed.length ? total / completed.length : 0,
      },
    };
  },

  // ---------------------------------------------------------------------------
  // INCIDENTS - /api/v1/operations/incidents
  // ---------------------------------------------------------------------------
  'GET /api/v1/operations/incidents': () => {
    const incidents = getCollection('incidents');
    return { data: incidents, incidents };
  },

  'POST /api/v1/operations/incidents': (body) => {
    const created = addItem('incidents', { ...body, status: body.status || 'open', reportedAt: new Date().toISOString() });
    toast.success('Incident reported');
    return created;
  },

  'PUT /api/v1/operations/incidents/:id': (body, id) => {
    const updated = updateById('incidents', id, body);
    toast.success('Incident updated');
    return updated;
  },

  // ---------------------------------------------------------------------------
  // MESSAGES - /api/v1/communications/messages
  // ---------------------------------------------------------------------------
  'GET /api/v1/communications/messages': () => {
    const messages = getCollection('messages');
    return { data: messages, messages };
  },

  'POST /api/v1/communications/messages': (body) => {
    const created = addItem('messages', { ...body, status: body.status || 'pending', receivedAt: new Date().toISOString() });
    toast.success('Message created');
    return created;
  },

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS - /api/v1/operations/notifications
  // ---------------------------------------------------------------------------
  'GET /api/v1/operations/notifications': () => {
    const notifications = getCollection('notifications') || [];
    return { data: notifications, notifications };
  },

  'POST /api/v1/operations/notifications/:id/read': (body, id) => {
    const updated = updateById('notifications', id, { read: true, readAt: new Date().toISOString() });
    return updated;
  },

  // ---------------------------------------------------------------------------
  // CONFIG / SETTINGS
  // ---------------------------------------------------------------------------
  'GET /api/v1/config/tenant': () => {
    const settings = getDemoData().tenantSettings || {};
    return {
      id: 'demo-tenant',
      recordId: 'demo-tenant',
      slug: 'demo',
      name: settings.businessName || 'Pawsome Pet Resort',
      plan: 'PROFESSIONAL',
      features: ['vaccinations', 'bookings', 'reports', 'staff', 'payments', 'incidents', 'messaging'],
      settings,
    };
  },

  'GET /api/v1/config/settings': () => {
    return getDemoData().tenantSettings || {};
  },

  'PUT /api/v1/config/settings': (body) => {
    updateDemoData('tenantSettings', { ...getDemoData().tenantSettings, ...body });
    toast.success('Settings saved');
    return body;
  },

  'GET /api/v1/profile': () => {
    const settings = getDemoData().tenantSettings || {};
    return {
      id: 'demo-user',
      email: 'demo@barkbase.io',
      firstName: 'Demo',
      lastName: 'User',
      role: 'ADMIN',
      propertyName: settings.businessName || 'Pawsome Pet Resort',
      businessName: settings.businessName || 'Pawsome Pet Resort',
    };
  },

  'PUT /api/v1/profile': (body) => {
    toast.success('Profile updated');
    return { ...body, id: 'demo-user' };
  },

  // ---------------------------------------------------------------------------
  // ACTIVITIES - /api/v1/analytics/activities
  // ---------------------------------------------------------------------------
  'GET /api/v1/analytics/activities': (params) => {
    const activities = getCollection('activities');
    const limit = parseInt(params?.limit) || 20;
    return { data: activities.slice(0, limit), activities: activities.slice(0, limit) };
  },

  // Health check
  'GET /api/v1/health': () => ({ status: 'ok', demo: true }),

  // ---------------------------------------------------------------------------
  // TASKS - /api/v1/operations/tasks
  // ---------------------------------------------------------------------------
  'GET /api/v1/operations/tasks': (params) => {
    const tasks = getCollection('tasks') || [];
    return { data: tasks, tasks, total: tasks.length };
  },

  'GET /api/v1/operations/tasks/:id': (params, id) => {
    const task = findById('tasks', id);
    if (!task) return { error: 'Task not found', status: 404 };
    return { data: task, task };
  },

  'POST /api/v1/operations/tasks': (body) => {
    const created = addItem('tasks', { ...body, status: 'pending' });
    toast.success('Task created');
    return { data: created, task: created };
  },

  'PUT /api/v1/operations/tasks/:id': (body, id) => {
    updateById('tasks', id, body);
    const updated = findById('tasks', id);
    toast.success('Task updated');
    return { data: updated, task: updated };
  },

  'POST /api/v1/operations/tasks/:id/complete': (body, id) => {
    updateById('tasks', id, { status: 'completed', completedAt: new Date().toISOString() });
    const updated = findById('tasks', id);
    toast.success('Task completed');
    return { data: updated, task: updated };
  },

  'DELETE /api/v1/operations/tasks/:id': (body, id) => {
    deleteById('tasks', id);
    toast.success('Task deleted');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // INCIDENTS - /api/v1/incidents
  // ---------------------------------------------------------------------------
  'GET /api/v1/incidents': (params) => {
    const incidents = getCollection('incidents') || [];
    return { data: incidents, incidents, total: incidents.length };
  },

  'GET /api/v1/incidents/:id': (params, id) => {
    const incident = findById('incidents', id);
    if (!incident) return { error: 'Incident not found', status: 404 };
    return { data: incident, incident };
  },

  'POST /api/v1/incidents': (body) => {
    const created = addItem('incidents', { ...body, status: 'open' });
    toast.success('Incident reported');
    return { data: created, incident: created };
  },

  'PUT /api/v1/incidents/:id': (body, id) => {
    updateById('incidents', id, body);
    const updated = findById('incidents', id);
    toast.success('Incident updated');
    return { data: updated, incident: updated };
  },

  // ---------------------------------------------------------------------------
  // WORKFLOWS - /api/v1/workflows
  // ---------------------------------------------------------------------------
  'GET /api/v1/workflows': (params) => {
    const workflows = getCollection('workflows') || [];
    return { data: workflows, workflows, total: workflows.length };
  },

  'GET /api/v1/workflows/:id': (params, id) => {
    const workflow = findById('workflows', id);
    if (!workflow) return { error: 'Workflow not found', status: 404 };
    return { data: workflow, workflow };
  },

  'POST /api/v1/workflows': (body) => {
    const created = addItem('workflows', { ...body, status: 'draft' });
    toast.success('Workflow created');
    return { data: created, workflow: created };
  },

  'PUT /api/v1/workflows/:id': (body, id) => {
    updateById('workflows', id, body);
    const updated = findById('workflows', id);
    toast.success('Workflow updated');
    return { data: updated, workflow: updated };
  },

  'GET /api/v1/workflows/:id/dependencies': (params, id) => {
    return { data: [], dependencies: [] };
  },

  'GET /api/v1/workflows/:id/matching-records-count': (params, id) => {
    return { count: 0 };
  },

  'POST /api/v1/workflows/:id/activate-with-enrollment': (body, id) => {
    updateById('workflows', id, { status: 'active' });
    toast.success('Workflow activated');
    return { success: true };
  },

  // ---------------------------------------------------------------------------
  // MESSAGES - /api/v1/messages
  // ---------------------------------------------------------------------------
  'GET /api/v1/messages/conversations': (params) => {
    const messages = getCollection('messages') || [];
    const owners = getCollection('owners') || [];
    const pets = getCollection('pets') || [];
    const conversationMap = {};
    messages.forEach(msg => {
      const ownerId = msg.ownerId;
      if (!conversationMap[ownerId]) {
        const owner = owners.find(o => o.id === ownerId);
        const ownerPets = pets.filter(p => p.ownerId === ownerId).map(p => ({
          recordId: p.id, name: p.name, species: p.species, breed: p.breed,
        }));
        conversationMap[ownerId] = {
          id: ownerId, conversationId: ownerId,
          owner: owner ? { firstName: owner.firstName, lastName: owner.lastName, email: owner.email, phone: owner.phone, recordId: owner.id } : null,
          pets: ownerPets, messages: [], lastMessage: null, unreadCount: 0,
        };
      }
      const formattedMsg = { ...msg, content: msg.body || msg.replyBody || msg.subject || '', senderType: msg.type === 'outbound' ? 'OWNER' : 'STAFF', senderId: msg.type === 'outbound' ? 'staff-system' : 'current-user' };
      conversationMap[ownerId].messages.push(formattedMsg);
      conversationMap[ownerId].lastMessage = formattedMsg;
      if (!msg.read && msg.type === 'inbound') conversationMap[ownerId].unreadCount++;
    });
    return { data: Object.values(conversationMap), conversations: Object.values(conversationMap), total: Object.keys(conversationMap).length };
  },

  'GET /api/v1/messages/:id': (params, id) => {
    const messages = getCollection('messages') || [];
    const conversationMessages = messages.filter(m => m.ownerId === id || m.conversationId === id || m.id === id)
      .map(msg => ({ ...msg, content: msg.body || msg.replyBody || msg.subject || '', senderType: msg.type === 'outbound' ? 'OWNER' : 'STAFF', senderId: msg.type === 'outbound' ? 'staff-system' : 'current-user' }));
    return { data: conversationMessages, messages: conversationMessages };
  },

  'POST /api/v1/messages': (body) => {
    const created = addItem('messages', { ...body, read: false, createdAt: new Date().toISOString() });
    toast.success('Message sent');
    return { data: created, message: created };
  },

  'PUT /api/v1/messages/:id/read': (body, id) => {
    const messages = getCollection('messages') || [];
    messages.forEach(m => {
      if (m.conversationId === id || m.id === id) {
        m.read = true;
      }
    });
    setCollection('messages', messages);
    return { success: true };
  },

  'GET /api/v1/messages/unread/count': () => {
    const messages = getCollection('messages') || [];
    const unreadCount = messages.filter(m => !m.read).length;
    return { count: unreadCount };
  },

  // ---------------------------------------------------------------------------
  // PACKAGES - /api/v1/financial/packages
  // ---------------------------------------------------------------------------
  'GET /api/v1/financial/packages': (params) => {
    const packages = getCollection('packages') || [];
    if (params?.ownerId) {
      const filtered = packages.filter(p => p.ownerId === params.ownerId);
      return { data: filtered, packages: filtered, total: filtered.length };
    }
    return { data: packages, packages, total: packages.length };
  },

  'GET /api/v1/financial/packages/:id': (params, id) => {
    const pkg = findById('packages', id);
    if (!pkg) return { error: 'Package not found', status: 404 };
    return { data: pkg, package: pkg };
  },

  'POST /api/v1/financial/packages': (body) => {
    const created = addItem('packages', body);
    toast.success('Package created');
    return { data: created, package: created };
  },

  'PUT /api/v1/financial/packages/:id': (body, id) => {
    updateById('packages', id, body);
    const updated = findById('packages', id);
    toast.success('Package updated');
    return { data: updated, package: updated };
  },

  'DELETE /api/v1/financial/packages/:id': (body, id) => {
    deleteById('packages', id);
    toast.success('Package deleted');
    return { success: true };
  },

  'POST /api/v1/financial/packages/:id/use': (body, id) => {
    const pkg = findById('packages', id);
    if (pkg && pkg.remainingUses > 0) {
      updateById('packages', id, { remainingUses: pkg.remainingUses - 1 });
    }
    toast.success('Package session used');
    return { success: true };
  },

  'GET /api/v1/financial/packages/:id/usage': (params, id) => {
    return { data: [], usage: [] };
  },
};

// ============================================================================
// ROUTE MATCHER
// ============================================================================

const matchRoute = (method, path) => {
  // Clean path of query string for matching
  const cleanPath = path.split('?')[0];

  // Direct match first
  const directKey = `${method} ${cleanPath}`;
  if (routes[directKey]) {
    return { handler: routes[directKey], params: [] };
  }

  // Pattern matching for :id params
  for (const routeKey of Object.keys(routes)) {
    const [routeMethod, routePath] = routeKey.split(' ');
    if (routeMethod !== method) continue;

    const routeParts = routePath.split('/');
    const pathParts = cleanPath.split('/');

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
  ensureSeeded();

  const queryParams = parseQueryParams(path);
  const cleanPath = path.split('?')[0];

  const match = matchRoute(method, cleanPath);

  if (!match) {
    // Return empty data for unhandled routes instead of throwing
    return { data: [] };
  }

  try {
    const result = match.handler(body || queryParams, ...match.params);
    const data = camelcaseKeys(result, { deep: true });
    return { data };
  } catch (error) {
    toast.error(error.message || 'An error occurred');
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
  signOut: async () => {
    clearDemoData();
  },
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
