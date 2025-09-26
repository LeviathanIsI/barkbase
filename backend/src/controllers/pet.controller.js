const path = require('path');
const petService = require('../services/pet.service');
const { processImage } = require('../lib/imageProcessor');

const list = async (req, res, next) => {
  try {
    const pets = await petService.listPets(req.tenantId, req.query);
    return res.json(pets);
  } catch (error) {
    return next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const pet = await petService.createPet(req.tenantId, req.body);
    return res.status(201).json(pet);
  } catch (error) {
    return next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const pet = await petService.updatePet(req.tenantId, req.params.petId, req.body);
    return res.json(pet);
  } catch (error) {
    return next(error);
  }
};

const show = async (req, res, next) => {
  try {
    const pet = await petService.getPetById(req.tenantId, req.params.petId);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    return res.json(pet);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await petService.deletePet(req.tenantId, req.params.petId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const addVaccination = async (req, res, next) => {
  try {
    const vaccination = await petService.addVaccination(req.tenantId, req.params.petId, req.body);
    return res.status(201).json(vaccination);
  } catch (error) {
    return next(error);
  }
};

const uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const outputDir = path.dirname(req.file.path);
    const [thumbnailPath] = await processImage({
      inputPath: req.file.path,
      outputDir,
      sizes: [320],
    });

    const relativePath = path.relative(process.cwd(), thumbnailPath).replace(/\\/g, '/');

    const pet = await petService.updatePet(req.tenantId, req.params.petId, {
      photoUrl: `/${relativePath}`,
    });

    return res.json(pet);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  list,
  create,
  update,
  show,
  remove,
  addVaccination,
  uploadPhoto,
};
