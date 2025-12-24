/**
 * Test Data for E2E Tests
 * Centralized test data management
 */

export const testUsers = {
  admin: {
    email: 'joshua.r.bradford1@gmail.com',
    password: 'Josh1987!?!?',
    role: 'admin',
  },
  staff: {
    email: 'joshua.r.bradford1@gmail.com',
    password: 'Josh1987!?!?',
    role: 'staff',
  },
  viewer: {
    email: 'joshua.r.bradford1@gmail.com',
    password: 'Josh1987!?!?',
    role: 'viewer',
  },
};

// Test pet data
export const testPets = {
  dog: {
    name: 'E2E Test Dog',
    species: 'Dog',
    breed: 'Golden Retriever',
    gender: 'Male',
    weight: 65,
    color: 'Golden',
    dateOfBirth: '2020-01-15',
    microchip: 'TEST123456789',
    notes: 'E2E test pet - can be deleted',
  },
  cat: {
    name: 'E2E Test Cat',
    species: 'Cat',
    breed: 'Persian',
    gender: 'Female',
    weight: 10,
    color: 'White',
    dateOfBirth: '2021-06-20',
    notes: 'E2E test cat - can be deleted',
  },
  exotic: {
    name: 'E2E Test Rabbit',
    species: 'Other',
    breed: 'Holland Lop',
    gender: 'Male',
    weight: 4,
    color: 'Brown',
    notes: 'E2E test exotic pet - can be deleted',
  },
};

// Test owner data
export const testOwners = {
  primary: {
    firstName: 'E2E Test',
    lastName: 'Owner',
    email: 'e2e.test.owner@example.com',
    phone: '555-0100',
    address: '123 Test Street, Test City, TC 12345',
    notes: 'E2E test owner - can be deleted',
  },
  secondary: {
    firstName: 'E2E Secondary',
    lastName: 'Customer',
    email: 'e2e.secondary@example.com',
    phone: '555-0200',
    address: '456 Test Avenue, Test Town, TT 67890',
    notes: 'Secondary E2E test owner',
  },
};

// Test booking data
export const testBookings = {
  standard: {
    service: 'Boarding',
    checkInDate: getDateString(1), // Tomorrow
    checkOutDate: getDateString(3), // 3 days from now
    notes: 'E2E test booking',
  },
  daycare: {
    service: 'Daycare',
    checkInDate: getDateString(0), // Today
    checkOutDate: getDateString(0), // Same day
    notes: 'E2E daycare test',
  },
  extended: {
    service: 'Boarding',
    checkInDate: getDateString(7), // Next week
    checkOutDate: getDateString(14), // 2 weeks from now
    notes: 'E2E extended stay test',
  },
};

// Test kennel data
export const testKennels = {
  small: {
    name: 'E2E Small Kennel',
    size: 'small',
    capacity: 1,
    notes: 'E2E test kennel',
  },
  large: {
    name: 'E2E Large Kennel',
    size: 'large',
    capacity: 2,
    notes: 'E2E test large kennel',
  },
};

// Test task data
export const testTasks = {
  feeding: {
    type: 'FEEDING',
    title: 'E2E Test Feeding Task',
    description: 'Feed the test pet',
    priority: 'high',
  },
  medication: {
    type: 'MEDICATION',
    title: 'E2E Test Medication Task',
    description: 'Administer test medication',
    priority: 'urgent',
  },
  grooming: {
    type: 'GROOMING',
    title: 'E2E Test Grooming Task',
    description: 'Groom the test pet',
    priority: 'normal',
  },
};

/**
 * Helper function to get date string in YYYY-MM-DD format
 * @param {number} daysFromNow - Number of days from today
 * @returns {string} Date string
 */
function getDateString(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Generate unique test data with timestamp
 * @param {object} baseData - Base data object
 * @returns {object} Data with unique identifiers
 */
export function generateUniqueTestData(baseData) {
  const timestamp = Date.now();
  const uniqueData = { ...baseData };

  if (uniqueData.name) {
    uniqueData.name = `${uniqueData.name} ${timestamp}`;
  }
  if (uniqueData.email) {
    uniqueData.email = uniqueData.email.replace('@', `+${timestamp}@`);
  }
  if (uniqueData.title) {
    uniqueData.title = `${uniqueData.title} ${timestamp}`;
  }

  return uniqueData;
}

/**
 * Get random item from array
 * @param {array} arr - Array to pick from
 * @returns {any} Random item
 */
export function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate random phone number
 * @returns {string} Phone number
 */
export function generatePhoneNumber() {
  return `555-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

/**
 * Generate random email
 * @param {string} prefix - Email prefix
 * @returns {string} Email address
 */
export function generateEmail(prefix = 'test') {
  return `${prefix}.${Date.now()}@e2e-test.com`;
}

export default {
  testUsers,
  testPets,
  testOwners,
  testBookings,
  testKennels,
  testTasks,
  generateUniqueTestData,
  getRandomItem,
  generatePhoneNumber,
  generateEmail,
};
