const { forTenant } = require('../lib/tenantPrisma');

/**
 * Get facility settings for a tenant
 */
const getFacilitySettings = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  
  const tenant = await tenantDb.tenant.findUnique({
    where: { recordId: tenantId },
    select: { settings: true }
  });

  // Return facility settings with defaults
  const facilitySettings = tenant?.settings?.facility || {};
  
  return {
    terminology: {
      kennel: 'Kennel',
      suite: 'Suite', 
      cabin: 'Cabin',
      daycare: 'Daycare',
      medical: 'Medical Room',
      ...facilitySettings.terminology
    },
    kennelNaming: {
      useNumbers: true,
      useNames: false,
      prefix: '',
      startNumber: 1,
      ...facilitySettings.kennelNaming
    },
    inventory: {
      notifications: {
        recipients: [],
        frequency: 'daily',
        expiryAlertDays: 30,
        includeInReports: true
      },
      ...facilitySettings.inventory
    },
    locations: {
      buildings: [],
      areas: [],
      emergencyInfo: {
        evacuationRoute: '',
        assemblyPoint: '',
        emergencyContacts: ''
      },
      ...facilitySettings.locations
    },
    schedules: {
      training: [],
      maintenance: [],
      cleaning: [],
      ...facilitySettings.schedules
    }
  };
};

/**
 * Update facility settings for a tenant
 */
const updateFacilitySettings = async (tenantId, newSettings) => {
  const tenantDb = forTenant(tenantId);
  
  // Get current settings
  const tenant = await tenantDb.tenant.findUnique({
    where: { recordId: tenantId },
    select: { settings: true }
  });

  const currentSettings = tenant?.settings || {};
  
  // Merge facility settings
  const updatedSettings = {
    ...currentSettings,
    facility: {
      ...currentSettings.facility,
      ...newSettings
    }
  };

  // Update tenant settings
  const updatedTenant = await tenantDb.tenant.update({
    where: { recordId: tenantId },
    data: { settings: updatedSettings },
    select: { settings: true }
  });

  return updatedTenant.settings.facility;
};

/**
 * Get inventory data (stored in tenant settings)
 */
const getInventory = async (tenantId) => {
  const settings = await getFacilitySettings(tenantId);
  return {
    food: settings.inventory.food || [],
    medications: settings.inventory.medications || [],
    supplies: settings.inventory.supplies || [],
    notifications: settings.inventory.notifications
  };
};

/**
 * Create inventory item
 */
const createInventoryItem = async (tenantId, itemData) => {
  const settings = await getFacilitySettings(tenantId);
  const { category, ...item } = itemData;
  
  // Add ID and timestamps
  const newItem = { recordId: Date.now().toString(),
    ...item,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add to appropriate category
  if (!settings.inventory[category]) {
    settings.inventory[category] = [];
  }
  settings.inventory[category].push(newItem);

  // Save updated settings
  await updateFacilitySettings(tenantId, { inventory: settings.inventory });
  
  return newItem;
};

/**
 * Update inventory item
 */
const updateInventoryItem = async (tenantId, itemId, itemData) => {
  const settings = await getFacilitySettings(tenantId);
  const { category, ...updates } = itemData;
  
  // Find and update the item
  const categoryItems = settings.inventory[category] || [];
  const itemIndex = categoryItems.findIndex(item => item.recordId === itemId);
  
  if (itemIndex === -1) {
    throw Object.assign(new Error('Inventory item not found'), { statusCode: 404 });
  }

  categoryItems[itemIndex] = {
    ...categoryItems[itemIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // Save updated settings
  await updateFacilitySettings(tenantId, { inventory: settings.inventory });
  
  return categoryItems[itemIndex];
};

/**
 * Delete inventory item
 */
const deleteInventoryItem = async (tenantId, itemId) => {
  const settings = await getFacilitySettings(tenantId);
  
  // Find and remove the item from all categories
  ['food', 'medications', 'supplies'].forEach(category => {
    if (settings.inventory[category]) {
      settings.inventory[category] = settings.inventory[category].filter(item => item.recordId !== itemId);
    }
  });

  // Save updated settings
  await updateFacilitySettings(tenantId, { inventory: settings.inventory });
};

/**
 * Get locations data
 */
const getLocations = async (tenantId) => {
  const settings = await getFacilitySettings(tenantId);
  return {
    buildings: settings.locations.buildings || [],
    areas: settings.locations.areas || [],
    emergencyInfo: settings.locations.emergencyInfo || {}
  };
};

/**
 * Create building
 */
const createBuilding = async (tenantId, buildingData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const newBuilding = { recordId: Date.now().toString(),
    ...buildingData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  settings.locations.buildings.push(newBuilding);
  await updateFacilitySettings(tenantId, { locations: settings.locations });
  
  return newBuilding;
};

/**
 * Update building
 */
const updateBuilding = async (tenantId, buildingId, buildingData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const buildingIndex = settings.locations.buildings.findIndex(b => b.recordId === buildingId);
  if (buildingIndex === -1) {
    throw Object.assign(new Error('Building not found'), { statusCode: 404 });
  }

  settings.locations.buildings[buildingIndex] = {
    ...settings.locations.buildings[buildingIndex],
    ...buildingData,
    updatedAt: new Date().toISOString()
  };

  await updateFacilitySettings(tenantId, { locations: settings.locations });
  return settings.locations.buildings[buildingIndex];
};

/**
 * Delete building
 */
const deleteBuilding = async (tenantId, buildingId) => {
  const settings = await getFacilitySettings(tenantId);
  
  settings.locations.buildings = settings.locations.buildings.filter(b => b.recordId !== buildingId);
  // Also remove areas associated with this building
  settings.locations.areas = settings.locations.areas.filter(a => a.buildingId !== buildingId);
  
  await updateFacilitySettings(tenantId, { locations: settings.locations });
};

/**
 * Create area
 */
const createArea = async (tenantId, areaData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const newArea = { recordId: Date.now().toString(),
    ...areaData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  settings.locations.areas.push(newArea);
  await updateFacilitySettings(tenantId, { locations: settings.locations });
  
  return newArea;
};

/**
 * Update area
 */
const updateArea = async (tenantId, areaId, areaData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const areaIndex = settings.locations.areas.findIndex(a => a.recordId === areaId);
  if (areaIndex === -1) {
    throw Object.assign(new Error('Area not found'), { statusCode: 404 });
  }

  settings.locations.areas[areaIndex] = {
    ...settings.locations.areas[areaIndex],
    ...areaData,
    updatedAt: new Date().toISOString()
  };

  await updateFacilitySettings(tenantId, { locations: settings.locations });
  return settings.locations.areas[areaIndex];
};

/**
 * Delete area
 */
const deleteArea = async (tenantId, areaId) => {
  const settings = await getFacilitySettings(tenantId);
  
  settings.locations.areas = settings.locations.areas.filter(a => a.recordId !== areaId);
  await updateFacilitySettings(tenantId, { locations: settings.locations });
};

/**
 * Get schedules data
 */
const getSchedules = async (tenantId) => {
  const settings = await getFacilitySettings(tenantId);
  return {
    training: settings.schedules.training || [],
    maintenance: settings.schedules.maintenance || [],
    cleaning: settings.schedules.cleaning || []
  };
};

/**
 * Create training schedule
 */
const createTrainingSchedule = async (tenantId, scheduleData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const newSchedule = { recordId: Date.now().toString(),
    ...scheduleData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  settings.schedules.training.push(newSchedule);
  await updateFacilitySettings(tenantId, { schedules: settings.schedules });
  
  return newSchedule;
};

/**
 * Update training schedule
 */
const updateTrainingSchedule = async (tenantId, scheduleId, scheduleData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const scheduleIndex = settings.schedules.training.findIndex(s => s.recordId === scheduleId);
  if (scheduleIndex === -1) {
    throw Object.assign(new Error('Training schedule not found'), { statusCode: 404 });
  }

  settings.schedules.training[scheduleIndex] = {
    ...settings.schedules.training[scheduleIndex],
    ...scheduleData,
    updatedAt: new Date().toISOString()
  };

  await updateFacilitySettings(tenantId, { schedules: settings.schedules });
  return settings.schedules.training[scheduleIndex];
};

/**
 * Delete training schedule
 */
const deleteTrainingSchedule = async (tenantId, scheduleId) => {
  const settings = await getFacilitySettings(tenantId);
  
  settings.schedules.training = settings.schedules.training.filter(s => s.recordId !== scheduleId);
  await updateFacilitySettings(tenantId, { schedules: settings.schedules });
};

/**
 * Create maintenance schedule
 */
const createMaintenanceSchedule = async (tenantId, scheduleData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const newSchedule = { recordId: Date.now().toString(),
    ...scheduleData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  settings.schedules.maintenance.push(newSchedule);
  await updateFacilitySettings(tenantId, { schedules: settings.schedules });
  
  return newSchedule;
};

/**
 * Update maintenance schedule
 */
const updateMaintenanceSchedule = async (tenantId, scheduleId, scheduleData) => {
  const settings = await getFacilitySettings(tenantId);
  
  const scheduleIndex = settings.schedules.maintenance.findIndex(s => s.recordId === scheduleId);
  if (scheduleIndex === -1) {
    throw Object.assign(new Error('Maintenance schedule not found'), { statusCode: 404 });
  }

  settings.schedules.maintenance[scheduleIndex] = {
    ...settings.schedules.maintenance[scheduleIndex],
    ...scheduleData,
    updatedAt: new Date().toISOString()
  };

  await updateFacilitySettings(tenantId, { schedules: settings.schedules });
  return settings.schedules.maintenance[scheduleIndex];
};

/**
 * Delete maintenance schedule
 */
const deleteMaintenanceSchedule = async (tenantId, scheduleId) => {
  const settings = await getFacilitySettings(tenantId);
  
  settings.schedules.maintenance = settings.schedules.maintenance.filter(s => s.recordId !== scheduleId);
  await updateFacilitySettings(tenantId, { schedules: settings.schedules });
};

module.exports = {
  getFacilitySettings,
  updateFacilitySettings,
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLocations,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createArea,
  updateArea,
  deleteArea,
  getSchedules,
  createTrainingSchedule,
  updateTrainingSchedule,
  deleteTrainingSchedule,
  createMaintenanceSchedule,
  updateMaintenanceSchedule,
  deleteMaintenanceSchedule,
};

