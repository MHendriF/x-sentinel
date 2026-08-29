/**
 * Shared HTTP helpers: typed errors + zod body validation middleware.
 * Route handlers can throw; Express 5 forwards everything to the central
 * error handler in server/index.js.
 */

class HttpError extends Error {
  constructor(status, message, code = 'HTTP_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function httpError(status, message, code) {
  return new HttpError(status, message, code);
}

function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue && issue.path.length > 0 ? issue.path.join('.') : '';
      const message = path ? `Field '${path}': ${issue.message}` : issue.message;
      return next(httpError(400, message, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { HttpError, httpError, validateBody };
