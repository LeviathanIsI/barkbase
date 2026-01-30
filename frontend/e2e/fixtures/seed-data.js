/**
 * Seed Data for E2E Tests
 * Functions to create and cleanup test data via API
 */

import { request } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

/**
 * Create test owner via API
 */
export async function createTestOwner(ownerData) {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const response = await context.post('/customers', {
    data: {
      firstName: ownerData.firstName || 'E2E Test',
      lastName: ownerData.lastName || `Owner ${Date.now()}`,
      email: ownerData.email || `e2e.owner.${Date.now()}@test.com`,
      phone: ownerData.phone || '555-0100',
      address: ownerData.address || '123 Test Street, Test City, TC 12345',
      notes: 'E2E test customer - can be deleted',
      ...ownerData,
    },
  });

  if (!response.ok()) {
    console.warn('Failed to create test owner:', await response.text());
    return null;
  }

  const owner = await response.json();
  await context.dispose();
  return owner;
}

/**
 * Create test pet via API
 */
export async function createTestPet(petData, ownerId) {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const response = await context.post('/pets', {
    data: {
      customerId: ownerId,
      name: petData.name || `E2E Test Pet ${Date.now()}`,
      species: petData.species || 'Dog',
      breed: petData.breed || 'Mixed Breed',
      gender: petData.gender || 'Male',
      weight: petData.weight || 25,
      dateOfBirth: petData.dateOfBirth || '2020-01-01',
      notes: 'E2E test pet - can be deleted',
      ...petData,
    },
  });

  if (!response.ok()) {
    console.warn('Failed to create test pet:', await response.text());
    return null;
  }

  const pet = await response.json();
  await context.dispose();
  return pet;
}

/**
 * Create test service via API
 */
export async function createTestService(serviceData) {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const response = await context.post('/services', {
    data: {
      name: serviceData.name || `E2E Test Service ${Date.now()}`,
      description: serviceData.description || 'Test service',
      price: serviceData.price || 50.0,
      duration: serviceData.duration || 30,
      active: true,
      ...serviceData,
    },
  });

  if (!response.ok()) {
    console.warn('Failed to create test service:', await response.text());
    return null;
  }

  const service = await response.json();
  await context.dispose();
  return service;
}

/**
 * Create test kennel via API
 */
export async function createTestKennel(kennelData) {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const response = await context.post('/kennels', {
    data: {
      name: kennelData.name || `E2E Test Kennel ${Date.now()}`,
      size: kennelData.size || 'medium',
      capacity: kennelData.capacity || 1,
      notes: 'E2E test kennel - can be deleted',
      ...kennelData,
    },
  });

  if (!response.ok()) {
    console.warn('Failed to create test kennel:', await response.text());
    return null;
  }

  const kennel = await response.json();
  await context.dispose();
  return kennel;
}

/**
 * Create test booking via API
 */
export async function createTestBooking(bookingData) {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const response = await context.post('/bookings', {
    data: {
      petId: bookingData.petId,
      customerId: bookingData.customerId,
      serviceId: bookingData.serviceId,
      kennelId: bookingData.kennelId,
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,
      status: bookingData.status || 'confirmed',
      notes: 'E2E test booking - can be deleted',
      ...bookingData,
    },
  });

  if (!response.ok()) {
    console.warn('Failed to create test booking:', await response.text());
    return null;
  }

  const booking = await response.json();
  await context.dispose();
  return booking;
}

/**
 * Create complete booking test data
 * Creates owner, pet, service, kennel, and booking
 */
export async function seedBookingTestData(bookingConfig = {}) {
  const timestamp = Date.now();

  // Create owner
  const owner = await createTestOwner({
    firstName: 'E2E Test',
    lastName: `Owner ${timestamp}`,
    email: `e2e.test.${timestamp}@example.com`,
    phone: `555-${String(timestamp).slice(-4)}`,
  });

  if (!owner) {
    throw new Error('Failed to create test owner');
  }

  // Create pet
  const pet = await createTestPet(
    {
      name: `E2E Test Pet ${timestamp}`,
      species: bookingConfig.species || 'Dog',
      breed: bookingConfig.breed || 'Golden Retriever',
      weight: 65,
    },
    owner.id
  );

  if (!pet) {
    throw new Error('Failed to create test pet');
  }

  // Create service (or use existing)
  let service = bookingConfig.service;
  if (!service) {
    service = await createTestService({
      name: 'Boarding',
      price: 50.0,
    });
  }

  // Create kennel (or use existing)
  let kennel = bookingConfig.kennel;
  if (!kennel) {
    kennel = await createTestKennel({
      name: `Test Kennel ${timestamp}`,
      size: 'medium',
    });
  }

  // Create booking
  const checkInDate = bookingConfig.checkInDate || getDateString(1);
  const checkOutDate = bookingConfig.checkOutDate || getDateString(3);

  const booking = await createTestBooking({
    petId: pet.id,
    customerId: owner.id,
    serviceId: service.id,
    kennelId: kennel?.id,
    checkInDate,
    checkOutDate,
    status: bookingConfig.status || 'confirmed',
  });

  if (!booking) {
    throw new Error('Failed to create test booking');
  }

  return {
    owner,
    pet,
    service,
    kennel,
    booking,
  };
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(dataIds) {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  // Delete in order: bookings, pets, owners, kennels, services
  if (dataIds.bookingId) {
    await context.delete(`/bookings/${dataIds.bookingId}`).catch(() => {});
  }

  if (dataIds.petId) {
    await context.delete(`/pets/${dataIds.petId}`).catch(() => {});
  }

  if (dataIds.ownerId) {
    await context.delete(`/customers/${dataIds.ownerId}`).catch(() => {});
  }

  if (dataIds.kennelId) {
    await context.delete(`/kennels/${dataIds.kennelId}`).catch(() => {});
  }

  if (dataIds.serviceId) {
    await context.delete(`/services/${dataIds.serviceId}`).catch(() => {});
  }

  await context.dispose();
}

/**
 * Cleanup all E2E test data
 * Removes all records with 'E2E' in name or notes
 */
export async function cleanupAllE2EData() {
  const context = await request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  // This is a placeholder - actual implementation would depend on API capabilities
  // In production, you'd want specific endpoints for test data cleanup
  console.log('Cleaning up E2E test data...');

  await context.dispose();
}

/**
 * Helper function to get date string in YYYY-MM-DD format
 */
function getDateString(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Get current date/time string for timestamps
 */
export function getTimestamp() {
  return Date.now();
}

/**
 * Generate unique email for testing
 */
export function generateUniqueEmail(prefix = 'test') {
  return `${prefix}.${Date.now()}@e2e-test.com`;
}

/**
 * Generate unique name for testing
 */
export function generateUniqueName(baseName) {
  return `${baseName} ${Date.now()}`;
}

export default {
  createTestOwner,
  createTestPet,
  createTestService,
  createTestKennel,
  createTestBooking,
  seedBookingTestData,
  cleanupTestData,
  cleanupAllE2EData,
  getTimestamp,
  generateUniqueEmail,
  generateUniqueName,
};
