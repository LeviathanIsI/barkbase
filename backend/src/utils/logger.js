const { logger, withTenant, withReq } = require('../lib/logger');

module.exports = logger;
module.exports.withTenant = (tenantId) => withTenant(logger, tenantId);
module.exports.withReq = (reqId) => withReq(logger, reqId);
