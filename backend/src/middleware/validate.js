module.exports = (schema, property = 'body') =>
  (req, res, next) => {
    const { value, error } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(422).json({
        message: 'Validation failed',
        details: error.details.map((detail) => ({
          message: detail.message,
          path: detail.path.join('.'),
        })),
      });
    }

    req[property] = value;
    return next();
  };
