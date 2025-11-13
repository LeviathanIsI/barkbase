/**
 * Auth Layer - Main Export File
 *
 * This layer provides authentication and authorization utilities for Lambda functions.
 * Available at /opt/nodejs in Lambda runtime.
 *
 * Usage in Lambda functions:
 *   const { JWTValidator, CognitoClient, PermissionFilter } = require('/opt/nodejs');
 */

const { JWTValidator } = require('./jwt-validator');
const { CognitoClient } = require('./cognito-client');
const { PermissionFilter } = require('./permission-filter');

module.exports = {
    JWTValidator,
    CognitoClient,
    PermissionFilter
};
