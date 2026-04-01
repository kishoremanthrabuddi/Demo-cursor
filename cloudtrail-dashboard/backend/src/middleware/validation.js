function validateFilters(req, res, next) {
  const { startTime, endTime, service, page, pageSize } = req.query;

  if (startTime && isNaN(Date.parse(startTime))) {
    return res.status(400).json({ error: 'Invalid startTime format. Use ISO 8601.' });
  }
  if (endTime && isNaN(Date.parse(endTime))) {
    return res.status(400).json({ error: 'Invalid endTime format. Use ISO 8601.' });
  }
  if (startTime && endTime && new Date(startTime) > new Date(endTime)) {
    return res.status(400).json({ error: 'startTime must be before endTime.' });
  }

  const validServices = [
    'ec2', 'iam', 's3', 'lambda', 'rds', 'cloudfront', 'dynamodb',
    'sqs', 'sns', 'cloudwatch', 'kms', 'sts', 'organizations',
  ];
  if (service && !validServices.includes(service.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid service. Must be one of: ${validServices.join(', ')}`,
    });
  }

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({ error: 'page must be a positive integer.' });
  }
  if (pageSize && (isNaN(pageSize) || parseInt(pageSize) < 1 || parseInt(pageSize) > 200)) {
    return res.status(400).json({ error: 'pageSize must be between 1 and 200.' });
  }

  next();
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { validateFilters, asyncHandler };
