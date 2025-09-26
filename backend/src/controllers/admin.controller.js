const env = require('../config/env');

const status = (_req, res) => {
  res.json({
    environment: env.nodeEnv,
    databaseProvider: env.database.provider,
  });
};

module.exports = {
  status,
};
