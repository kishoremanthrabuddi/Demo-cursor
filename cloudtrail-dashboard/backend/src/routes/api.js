const express = require('express');
const { getEvents, getStats } = require('../services/queryService');
const { enrichEventsWithRisk } = require('../services/riskEngine');
const { validateFilters, asyncHandler } = require('../middleware/validation');

const router = express.Router();

router.get(
  '/events',
  validateFilters,
  asyncHandler(async (req, res) => {
    const {
      startTime,
      endTime,
      service,
      user,
      eventName,
      page = 1,
      pageSize = 50,
    } = req.query;

    const filters = {};
    if (startTime) filters.startTime = startTime;
    if (endTime) filters.endTime = endTime;
    if (service) filters.service = service;
    if (user) filters.user = user;
    if (eventName) filters.eventName = eventName;

    const result = await getEvents(filters, parseInt(page), parseInt(pageSize));
    result.data = enrichEventsWithRisk(result.data);

    res.json(result);
  })
);

router.get(
  '/stats',
  validateFilters,
  asyncHandler(async (req, res) => {
    const { startTime, endTime, service, user, eventName } = req.query;

    const filters = {};
    if (startTime) filters.startTime = startTime;
    if (endTime) filters.endTime = endTime;
    if (service) filters.service = service;
    if (user) filters.user = user;
    if (eventName) filters.eventName = eventName;

    const stats = await getStats(filters);
    res.json(stats);
  })
);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
