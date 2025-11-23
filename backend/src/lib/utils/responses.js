const ok = (res, data = null, statusCode = 200, headers = {}) => {
  if (headers && Object.keys(headers).length > 0) {
    res.set(headers);
  }

  if (statusCode === 204) {
    return res.status(statusCode).end();
  }

  if (data === null || data === undefined) {
    return res.status(statusCode).json({});
  }

  return res.status(statusCode).json(data);
};

const fail = (res, statusCode = 500, payload = {}) => {
  const body = typeof payload === 'string' ? { message: payload } : payload || {};
  if (!body.message && body.error) {
    body.message = body.error;
  }
  return res.status(statusCode).json(body);
};

module.exports = {
  ok,
  fail,
};

