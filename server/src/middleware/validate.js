// server/src/middleware/validate.js
// Purpose: Generic request validation middleware using Zod schemas.

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    const issues = error.issues || error.errors;
    if (issues && issues.length > 0) {
      const firstMsg = issues[0]?.message || 'Validation failed';
      return res.status(400).json({
        error: firstMsg,
        details: issues.map((e) => ({
          field: (e.path || []).join('.'),
          message: e.message,
        })),
      });
    }
    return res.status(400).json({ error: error.message || 'Invalid request data' });
  }
};
