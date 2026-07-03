const { GitHubApiError } = require('../services/githubService');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof GitHubApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'Duplicate entry.' });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Database connection refused. Is MySQL running and reachable?',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
    ...(process.env.NODE_ENV !== 'production' && { error: err.message }),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
}

module.exports = { errorHandler, notFoundHandler };
