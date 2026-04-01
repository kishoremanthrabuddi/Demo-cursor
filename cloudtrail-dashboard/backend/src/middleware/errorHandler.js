function errorHandler(err, req, res, _next) {
  console.error(`[ERROR] ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.message?.includes('Athena query')) {
    return res.status(502).json({
      error: 'Query execution failed',
      detail: err.message,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
