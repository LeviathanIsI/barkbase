const facilityService = require('../services/facility.service');

const getFacilitySettings = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const settings = await facilityService.getFacilitySettings(tenantId);
    return res.json(settings);
  } catch (error) {
    return next(error);
  }
};

const updateFacilitySettings = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const settings = await facilityService.updateFacilitySettings(tenantId, req.body);
    return res.json(settings);
  } catch (error) {
    return next(error);
  }
};

const getInventory = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const inventory = await facilityService.getInventory(tenantId);
    return res.json(inventory);
  } catch (error) {
    return next(error);
  }
};

const createInventoryItem = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const item = await facilityService.createInventoryItem(tenantId, req.body);
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
};

const updateInventoryItem = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { itemId } = req.params;
    const item = await facilityService.updateInventoryItem(tenantId, itemId, req.body);
    return res.json(item);
  } catch (error) {
    return next(error);
  }
};

const deleteInventoryItem = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { itemId } = req.params;
    await facilityService.deleteInventoryItem(tenantId, itemId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const getLocations = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const locations = await facilityService.getLocations(tenantId);
    return res.json(locations);
  } catch (error) {
    return next(error);
  }
};

const createBuilding = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const building = await facilityService.createBuilding(tenantId, req.body);
    return res.status(201).json(building);
  } catch (error) {
    return next(error);
  }
};

const updateBuilding = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { buildingId } = req.params;
    const building = await facilityService.updateBuilding(tenantId, buildingId, req.body);
    return res.json(building);
  } catch (error) {
    return next(error);
  }
};

const deleteBuilding = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { buildingId } = req.params;
    await facilityService.deleteBuilding(tenantId, buildingId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const createArea = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const area = await facilityService.createArea(tenantId, req.body);
    return res.status(201).json(area);
  } catch (error) {
    return next(error);
  }
};

const updateArea = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { areaId } = req.params;
    const area = await facilityService.updateArea(tenantId, areaId, req.body);
    return res.json(area);
  } catch (error) {
    return next(error);
  }
};

const deleteArea = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { areaId } = req.params;
    await facilityService.deleteArea(tenantId, areaId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const schedules = await facilityService.getSchedules(tenantId);
    return res.json(schedules);
  } catch (error) {
    return next(error);
  }
};

const createTrainingSchedule = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const schedule = await facilityService.createTrainingSchedule(tenantId, req.body);
    return res.status(201).json(schedule);
  } catch (error) {
    return next(error);
  }
};

const updateTrainingSchedule = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { scheduleId } = req.params;
    const schedule = await facilityService.updateTrainingSchedule(tenantId, scheduleId, req.body);
    return res.json(schedule);
  } catch (error) {
    return next(error);
  }
};

const deleteTrainingSchedule = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { scheduleId } = req.params;
    await facilityService.deleteTrainingSchedule(tenantId, scheduleId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const createMaintenanceSchedule = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const schedule = await facilityService.createMaintenanceSchedule(tenantId, req.body);
    return res.status(201).json(schedule);
  } catch (error) {
    return next(error);
  }
};

const updateMaintenanceSchedule = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { scheduleId } = req.params;
    const schedule = await facilityService.updateMaintenanceSchedule(tenantId, scheduleId, req.body);
    return res.json(schedule);
  } catch (error) {
    return next(error);
  }
};

const deleteMaintenanceSchedule = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { scheduleId } = req.params;
    await facilityService.deleteMaintenanceSchedule(tenantId, scheduleId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
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

