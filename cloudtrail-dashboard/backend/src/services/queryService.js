const { executeQuery } = require('./athenaClient');
const config = require('../config');

const TABLE = `${config.athena.database}.${config.athena.table}`;

function buildWhereClause(filters) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.startTime) {
    conditions.push(`eventtime >= $${paramIndex}`);
    params.push(filters.startTime);
    paramIndex++;
  }
  if (filters.endTime) {
    conditions.push(`eventtime <= $${paramIndex}`);
    params.push(filters.endTime);
    paramIndex++;
  }
  if (filters.service) {
    conditions.push(`eventsource = $${paramIndex}`);
    params.push(
      filters.service.includes('.amazonaws.com')
        ? filters.service
        : `${filters.service.toLowerCase()}.amazonaws.com`
    );
    paramIndex++;
  }
  if (filters.user) {
    conditions.push(`useridentity.username = $${paramIndex}`);
    params.push(filters.user);
    paramIndex++;
  }
  if (filters.eventName) {
    conditions.push(`eventname LIKE $${paramIndex}`);
    params.push(`%${filters.eventName}%`);
    paramIndex++;
  }
  if (filters.errorCode) {
    conditions.push(`errorcode = $${paramIndex}`);
    params.push(filters.errorCode);
    paramIndex++;
  }

  const whereStr = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereStr, params };
}

async function getEvents(filters = {}, page = 1, pageSize = 50) {
  const { whereStr, params } = buildWhereClause(filters);
  const offset = (page - 1) * pageSize;

  const countQuery = `SELECT COUNT(*) as total FROM ${TABLE} ${whereStr}`;
  const countResult = await executeQuery(countQuery, params);
  const total = parseInt(countResult[0]?.total || '0', 10);

  const dataQuery = `
    SELECT
      eventtime,
      eventsource,
      eventname,
      awsregion,
      sourceipaddress,
      useridentity.type AS user_type,
      useridentity.arn AS user_arn,
      useridentity.username AS username,
      errorcode,
      errormessage,
      readonly,
      requestparameters,
      responseelements
    FROM ${TABLE}
    ${whereStr}
    ORDER BY eventtime DESC
    OFFSET ${offset}
    LIMIT ${pageSize}
  `;

  const rows = await executeQuery(dataQuery, params);

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getStats(filters = {}) {
  const { whereStr, params } = buildWhereClause(filters);

  const [eventsOverTime, topServices, topUsers, loginResults, totalCount] =
    await Promise.all([
      executeQuery(
        `SELECT
          DATE(eventtime) AS date,
          COUNT(*) AS count
        FROM ${TABLE}
        ${whereStr}
        GROUP BY DATE(eventtime)
        ORDER BY date`,
        params
      ),

      executeQuery(
        `SELECT
          eventsource AS service,
          COUNT(*) AS count
        FROM ${TABLE}
        ${whereStr}
        GROUP BY eventsource
        ORDER BY count DESC
        LIMIT 10`,
        params
      ),

      executeQuery(
        `SELECT
          COALESCE(useridentity.username, useridentity.type) AS user,
          COUNT(*) AS count
        FROM ${TABLE}
        ${whereStr}
        GROUP BY COALESCE(useridentity.username, useridentity.type)
        ORDER BY count DESC
        LIMIT 10`,
        params
      ),

      executeQuery(
        `SELECT
          CASE
            WHEN errorcode IS NULL OR errorcode = '' THEN 'Success'
            ELSE 'Failed'
          END AS result,
          COUNT(*) AS count
        FROM ${TABLE}
        ${whereStr.length > 0 ? whereStr + ' AND' : 'WHERE'}
          eventname = 'ConsoleLogin'
        GROUP BY
          CASE
            WHEN errorcode IS NULL OR errorcode = '' THEN 'Success'
            ELSE 'Failed'
          END`,
        params
      ),

      executeQuery(
        `SELECT COUNT(*) AS total FROM ${TABLE} ${whereStr}`,
        params
      ),
    ]);

  return {
    eventsOverTime: eventsOverTime.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    })),
    topServices: topServices.map((r) => ({
      service: r.service?.replace('.amazonaws.com', ''),
      count: parseInt(r.count, 10),
    })),
    topUsers: topUsers.map((r) => ({
      user: r.user,
      count: parseInt(r.count, 10),
    })),
    loginResults: loginResults.map((r) => ({
      result: r.result,
      count: parseInt(r.count, 10),
    })),
    totalEvents: parseInt(totalCount[0]?.total || '0', 10),
  };
}

module.exports = { getEvents, getStats };
