// Timing Middleware: Measures execution time for every endpoint to prove < 2s SLA compliance

export function timingMiddleware(req, res, next) {
  req._perfStartTimestamp = performance.now();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const elapsed = Math.round((performance.now() - req._perfStartTimestamp) * 100) / 100;
    res.setHeader('X-Response-Time-Ms', elapsed);
    res.setHeader('X-SLA-Threshold-Ms', 2000);

    // If body is an object, inject performance metadata
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (!body.meta) body.meta = {};
      body.meta.executionTimeMs = elapsed;
      body.meta.slaCompliant = elapsed < 2000;
      body.meta.timestamp = new Date().toISOString();
    }

    return originalJson(body);
  };

  // Helper response methods
  res.apiSuccess = (data, message = 'Success', extraMeta = {}) => {
    return res.json({
      success: true,
      message,
      data,
      meta: extraMeta
    });
  };

  res.apiError = (message = 'Internal Error', statusCode = 500, details = null) => {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
      meta: {}
    });
  };

  next();
}
