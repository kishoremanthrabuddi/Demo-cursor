const {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} = require('@aws-sdk/client-athena');
const config = require('../config');

const athenaClient = new AthenaClient({
  region: config.aws.region,
  ...(config.aws.credentials && { credentials: config.aws.credentials }),
});

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 120;

async function executeQuery(query, params = []) {
  let parameterizedQuery = query;
  params.forEach((param, i) => {
    const sanitized = String(param).replace(/'/g, "''");
    parameterizedQuery = parameterizedQuery.replace(`$${i + 1}`, `'${sanitized}'`);
  });

  const startCmd = new StartQueryExecutionCommand({
    QueryString: parameterizedQuery,
    QueryExecutionContext: { Database: config.athena.database },
    ResultConfiguration: { OutputLocation: config.athena.outputBucket },
    WorkGroup: config.athena.workGroup,
  });

  const { QueryExecutionId } = await athenaClient.send(startCmd);

  let attempts = 0;
  while (attempts < MAX_POLL_ATTEMPTS) {
    const statusCmd = new GetQueryExecutionCommand({ QueryExecutionId });
    const { QueryExecution } = await athenaClient.send(statusCmd);
    const state = QueryExecution.Status.State;

    if (state === 'SUCCEEDED') break;
    if (state === 'FAILED' || state === 'CANCELLED') {
      throw new Error(
        `Athena query ${state}: ${QueryExecution.Status.StateChangeReason}`
      );
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    attempts++;
  }

  if (attempts >= MAX_POLL_ATTEMPTS) {
    throw new Error('Athena query timed out');
  }

  const rows = [];
  let nextToken = undefined;

  do {
    const resultsCmd = new GetQueryResultsCommand({
      QueryExecutionId,
      ...(nextToken && { NextToken: nextToken }),
    });
    const result = await athenaClient.send(resultsCmd);
    const columnInfo = result.ResultSet.ResultSetMetadata.ColumnInfo;
    const resultRows = result.ResultSet.Rows;

    const startIndex = rows.length === 0 ? 1 : 0; // skip header on first page
    for (let i = startIndex; i < resultRows.length; i++) {
      const row = {};
      resultRows[i].Data.forEach((cell, idx) => {
        row[columnInfo[idx].Name] = cell.VarCharValue ?? null;
      });
      rows.push(row);
    }

    nextToken = result.NextToken;
  } while (nextToken);

  return rows;
}

module.exports = { executeQuery };
