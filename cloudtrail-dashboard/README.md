# CloudTrail Dashboard

A production-grade dashboard for monitoring AWS CloudTrail API activity, queried through Amazon Athena, with built-in risk detection.

## Architecture

```
┌─────────────┐       ┌─────────────────┐       ┌─────────┐       ┌────┐
│  React App  │──────▶│  Express API    │──────▶│  Athena │──────▶│ S3 │
│  (Vite +    │ HTTP  │  /api/events    │ SDK   │  Query  │ Scan  │ CT │
│  Tailwind)  │◀──────│  /api/stats     │◀──────│  Engine │◀──────│Logs│
└─────────────┘       └─────────────────┘       └─────────┘       └────┘
     :3000                  :4000
```

## Prerequisites

- **Node.js** >= 18
- **AWS Account** with:
  - CloudTrail enabled, delivering logs to an S3 bucket
  - An Athena workgroup configured
  - An S3 bucket for Athena query results
  - IAM credentials with permissions for `athena:*` and `s3:GetObject` on your CloudTrail bucket

## Quick Start

### 1. Create the Athena Table

Open the AWS Athena console and run the SQL in `athena-schema.sql`. Replace:
- `YOUR_CLOUDTRAIL_BUCKET` with your actual S3 bucket name
- `YOUR_ACCOUNT_ID` with your 12-digit AWS account ID

### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|---|---|
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | IAM access key (or omit to use instance role / SSO) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `ATHENA_DATABASE` | Athena database name (`cloudtrail_logs`) |
| `ATHENA_TABLE` | Table name (`cloudtrail_events`) |
| `ATHENA_OUTPUT_BUCKET` | S3 path for query results (`s3://my-bucket/athena-results/`) |
| `PORT` | API port (default `4000`) |

### 3. Install & Run Backend

```bash
cd backend
npm install
npm run dev    # development with auto-reload
# or
npm start      # production
```

### 4. Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## API Reference

### `GET /api/events`

Returns paginated CloudTrail events with risk annotations.

| Parameter | Type | Description |
|---|---|---|
| `startTime` | ISO 8601 | Filter events after this time |
| `endTime` | ISO 8601 | Filter events before this time |
| `service` | string | AWS service name (e.g. `iam`, `ec2`, `s3`) |
| `user` | string | IAM username |
| `eventName` | string | Partial match on event name |
| `page` | integer | Page number (default 1) |
| `pageSize` | integer | Results per page (default 50, max 200) |

**Response:**
```json
{
  "data": [
    {
      "eventtime": "2025-01-15T10:30:00Z",
      "eventsource": "iam.amazonaws.com",
      "eventname": "ConsoleLogin",
      "username": "admin",
      "risk": {
        "findings": [{ "severity": "HIGH", "name": "Failed Console Login" }],
        "severity": "HIGH",
        "hasRisk": true
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "total": 1250, "totalPages": 25 }
}
```

### `GET /api/stats`

Returns aggregated statistics for dashboard charts. Accepts the same filter parameters as `/events` (except pagination).

**Response:**
```json
{
  "eventsOverTime": [{ "date": "2025-01-15", "count": 340 }],
  "topServices": [{ "service": "iam", "count": 1200 }],
  "topUsers": [{ "user": "deploy-bot", "count": 890 }],
  "loginResults": [{ "result": "Success", "count": 45 }, { "result": "Failed", "count": 3 }],
  "totalEvents": 15000
}
```

### `GET /api/health`

Health check endpoint.

## Risk Detection Rules

| Rule | Severity | Trigger |
|---|---|---|
| Root User Activity | HIGH | Any API call made by the root account |
| Failed Console Login | HIGH | `ConsoleLogin` event with a non-empty `errorcode` |
| Unauthorized Access | HIGH | `AccessDenied` or `UnauthorizedAccess` error codes |
| IAM Policy Change | MEDIUM | Create/Delete/Attach/Detach policy events on `iam.amazonaws.com` |
| Security Group Modification | MEDIUM | Authorize/Revoke/Create/Delete security group events |
| MFA Device Change | MEDIUM | Deactivate or delete MFA device events |
| Network ACL Change | LOW | Create/Replace/Delete network ACL entry events |

## Project Structure

```
cloudtrail-dashboard/
├── athena-schema.sql          # Athena DDL for CloudTrail table
├── backend/
│   ├── .env.example           # Environment variable template
│   ├── package.json
│   └── src/
│       ├── server.js          # Express entry point
│       ├── config/index.js    # Centralized configuration
│       ├── routes/api.js      # API route definitions
│       ├── services/
│       │   ├── athenaClient.js   # Low-level Athena SDK wrapper
│       │   ├── queryService.js   # Business-logic query builder
│       │   └── riskEngine.js     # Risk detection rule engine
│       └── middleware/
│           ├── validation.js     # Request validation
│           └── errorHandler.js   # Global error handler
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               # Root component with tab navigation
        ├── services/api.js       # Axios API client
        ├── hooks/useDashboard.js # State management hook
        ├── utils/format.js       # Formatting helpers
        └── components/
            ├── FilterPanel.jsx   # Time, service, user, event filters
            ├── SummaryCards.jsx   # KPI summary cards
            ├── StatsCharts.jsx   # Line, bar, pie charts (Recharts)
            ├── EventTable.jsx    # Sortable, paginated event table
            └── TimelineView.jsx  # Risk event timeline
```

## IAM Policy (Minimum Required)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "athena:StartQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:StopQueryExecution"
      ],
      "Resource": "arn:aws:athena:*:*:workgroup/primary"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::YOUR_CLOUDTRAIL_BUCKET",
        "arn:aws:s3:::YOUR_CLOUDTRAIL_BUCKET/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::YOUR_ATHENA_RESULTS_BUCKET",
        "arn:aws:s3:::YOUR_ATHENA_RESULTS_BUCKET/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["glue:GetTable", "glue:GetPartitions", "glue:GetDatabase"],
      "Resource": "*"
    }
  ]
}
```
