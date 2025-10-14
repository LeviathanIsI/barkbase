const { validationResult } = require('express-validator');

/**
 * Middleware to validate request using express-validator
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(400).json({
      message: 'Validation failed',
      errors: extractedErrors,
    });
  };
};

module.exports = {
  validate,
};

