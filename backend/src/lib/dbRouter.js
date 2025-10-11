const basePrisma = require('../config/prisma');

const getDbForTenant = () => basePrisma;

module.exports = {
  getDbForTenant,
  basePrisma,
};

