const fs = require('fs');
const path = require('path');

// Fix the pet validator to allow species field
const validatorPath = path.join(__dirname, '../src/validators/pet.validator.js');
const validatorContent = fs.readFileSync(validatorPath, 'utf8');

// Update the create schema to include species
const updatedContent = validatorContent.replace(
  'name: Joi.string().trim().min(1).max(100).required(),',
  `name: Joi.string().trim().min(1).max(100).required(),
  species: Joi.string().trim().allow('', null).optional(),`
);

// Update the update schema to include species
const finalContent = updatedContent.replace(
  'name: Joi.string().trim().min(1).max(100),',
  `name: Joi.string().trim().min(1).max(100),
  species: Joi.string().trim().allow('', null).optional(),`
);

fs.writeFileSync(validatorPath, finalContent);
console.log('✅ Fixed pet validator to include species field');
