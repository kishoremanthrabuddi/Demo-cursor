# CloudTrail Dashboard — Full Project Documentation

## 1. PROJECT OVERVIEW

### What Is This Project?

This is a **security monitoring dashboard** that reads AWS CloudTrail logs and displays them as interactive charts, tables, and a risk-detected timeline. It answers the question: "What is happening in my AWS account, and is any of it suspicious?"

### What Problem Does It Solve?

AWS CloudTrail records every API call made in your account (logins, resource creation, permission changes, etc.) and stores them as JSON files in S3. But:

- There's no built-in dashboard to visualize this data
- The CloudTrail console only shows 90 days of history
- There's no automatic risk flagging for dangerous activity
- Searching millions of events manually is impractical

This dashboard solves all four problems.

### Architecture

```
 YOUR MACHINE                              AWS CLOUD
┌──────────────────────┐                  ┌──────────────────────────┐
│                      │                  │                          │
│  React Frontend      │    HTTP /api     │  S3 Bucket               │
│  localhost:3000      │─────────┐        │  └── CloudTrail JSON     │
│  (Vite + Tailwind)   │         │        │      logs (auto-written) │
│                      │         │        │                          │
├──────────────────────┤         │        │  Amazon Athena           │
│                      │         ▼        │  └── Runs SQL on S3      │
│  Express Backend     │──── AWS SDK ────▶│  └── Returns results     │
│  localhost:4000      │◀────────────────│                          │
│  (Node.js)           │                  │  AWS Glue Catalog        │
│                      │                  │  └── Stores table schema │
└──────────────────────┘                  └──────────────────────────┘
```

**Data flow:** Browser → React → Express API → Athena SDK → Athena scans S3 → Returns rows → Risk engine annotates → JSON response → React renders charts/tables.

---

## 2. TECHNOLOGY STACK

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Backend runtime | Node.js | 20.x | JavaScript server runtime |
| Backend framework | Express | 4.19 | HTTP server and routing |
| AWS SDK | @aws-sdk/client-athena | 3.600+ | Communicate with Amazon Athena |
| Security | helmet | 7.x | HTTP security headers |
| Security | express-rate-limit | 7.x | API rate limiting (100 req/min) |
| Security | cors | 2.8 | Cross-origin resource sharing |
| Logging | morgan | 1.10 | HTTP request logging |
| Frontend framework | React | 18.3 | UI component library |
| Build tool | Vite | 5.3 | Development server and bundler |
| CSS framework | Tailwind CSS | 3.4 | Utility-first styling |
| Charts | Recharts | 2.12 | React charting library |
| HTTP client | Axios | 1.7 | API requests from frontend |
| Query engine | Amazon Athena | — | Serverless SQL on S3 |
| Data store | Amazon S3 | — | CloudTrail log storage |
| Schema catalog | AWS Glue | — | Table metadata for Athena |

---

## 3. PROJECT STRUCTURE

```
cloudtrail-dashboard/
│
├── DOCUMENTATION.md              ← This file
├── SETUP-GUIDE.md                ← Step-by-step setup instructions
├── README.md                     ← Quick-start guide
├── athena-schema.sql             ← SQL to create Athena table
├── .gitignore                    ← Git ignore rules
│
├── backend/
│   ├── package.json              ← Backend dependencies
│   ├── .env.example              ← Environment variable template
│   ├── .env                      ← Your actual config (git-ignored)
│   └── src/
│       ├── server.js             ← Express entry point
│       ├── config/
│       │   └── index.js          ← Centralized configuration
│       ├── routes/
│       │   └── api.js            ← API endpoint definitions
│       ├── services/
│       │   ├── athenaClient.js   ← Low-level Athena SDK wrapper
│       │   ├── queryService.js   ← SQL query builder
│       │   └── riskEngine.js     ← Risk detection rule engine
│       └── middleware/
│           ├── validation.js     ← Input validation
│           └── errorHandler.js   ← Error handling
│
└── frontend/
    ├── package.json              ← Frontend dependencies
    ├── vite.config.js            ← Vite dev server + proxy config
    ├── tailwind.config.js        ← Tailwind CSS configuration
    ├── postcss.config.js         ← PostCSS plugin config
    ├── index.html                ← HTML entry point
    └── src/
        ├── main.jsx              ← React mount point
        ├── index.css             ← Tailwind imports
        ├── App.jsx               ← Root component + tab navigation
        ├── services/
        │   └── api.js            ← Axios HTTP client
        ├── hooks/
        │   └── useDashboard.js   ← Central state management hook
        ├── utils/
        │   └── format.js         ← Date/severity formatting helpers
        └── components/
            ├── FilterPanel.jsx   ← Filter form (time, service, user)
            ├── SummaryCards.jsx  ← KPI summary cards
            ├── StatsCharts.jsx  ← 4 chart visualizations
            ├── EventTable.jsx   ← Sortable paginated event table
            └── TimelineView.jsx ← Risk event timeline
```

**Total: 28 files** (10 backend, 16 frontend, 2 root config + schema)

---

## 4. BACKEND — DETAILED EXPLANATION

### 4.1 server.js — Application Entry Point

**What it does:** Creates the Express HTTP server, applies security middleware, mounts API routes, starts listening on port 4000.

**Middleware applied (in order):**

| Middleware | Purpose |
|-----------|---------|
| `helmet()` | Sets security HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.) |
| `cors()` | Allows the frontend on port 3000 to call the API on port 4000 |
| `morgan()` | Logs every HTTP request (method, URL, status, response time) |
| `express.json()` | Parses JSON request bodies |
| `rateLimit()` | Limits to 100 requests per minute per IP address |

### 4.2 config/index.js — Configuration

**What it does:** Reads environment variables from `.env` and exports a structured config object. If `AWS_ACCESS_KEY_ID` is not set, it returns `undefined` for credentials, which makes the AWS SDK fall back to the default credential chain (`~/.aws/credentials`, instance roles, SSO, etc.).

**Configuration values:**

| Key | Source | Default |
|-----|--------|---------|
| `aws.region` | `AWS_REGION` | `us-east-1` |
| `aws.credentials` | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Default credential chain |
| `athena.database` | `ATHENA_DATABASE` | `cloudtrail_logs` |
| `athena.table` | `ATHENA_TABLE` | `cloudtrail_events` |
| `athena.outputBucket` | `ATHENA_OUTPUT_BUCKET` | — (required) |
| `athena.workGroup` | `ATHENA_WORKGROUP` | `primary` |
| `server.port` | `PORT` | `4000` |

### 4.3 services/athenaClient.js — Athena SDK Wrapper

**What it does:** This is the lowest-level service. It takes a SQL string, sends it to Amazon Athena, polls until the query finishes, and returns the results as an array of plain JavaScript objects.

**How it works step-by-step:**

1. **Parameter sanitization** — Replaces `$1`, `$2`, etc. with escaped string values to prevent SQL injection
2. **StartQueryExecution** — Sends the SQL to Athena. Athena returns a `QueryExecutionId` immediately (it doesn't wait for results)
3. **Polling loop** — Calls `GetQueryExecution` every 1 second (up to 120 times / 2 minutes max) until the state changes from `RUNNING` to `SUCCEEDED`, `FAILED`, or `CANCELLED`
4. **GetQueryResults** — Once succeeded, fetches results page by page (Athena paginates large results)
5. **Row transformation** — Converts Athena's verbose row format (`{Data: [{VarCharValue: "..."}]}`) into plain objects (`{eventtime: "...", eventsource: "..."}`)

### 4.4 services/queryService.js — Query Builder

**What it does:** Builds the actual SQL queries sent to Athena based on the user's filters. Contains two main functions.

**`buildWhereClause(filters)`** — Takes filter object and produces a SQL WHERE clause with parameterized values:

| Filter | SQL Produced | Example |
|--------|-------------|---------|
| `startTime` | `eventtime >= '2026-03-01T00:00:00Z'` | Events after March 1st |
| `endTime` | `eventtime <= '2026-03-31T23:59:59Z'` | Events before March 31st |
| `service` | `eventsource = 'iam.amazonaws.com'` | Only IAM events |
| `user` | `useridentity.username = 'admin'` | Only events by 'admin' |
| `eventName` | `eventname LIKE '%Login%'` | Events containing "Login" |

**`getEvents(filters, page, pageSize)`** — Runs two queries:
1. `SELECT COUNT(*)` — Gets total matching events (for pagination math)
2. `SELECT ... ORDER BY eventtime DESC OFFSET x LIMIT y` — Gets one page of events

**`getStats(filters)`** — Runs five queries **in parallel** using `Promise.all()`:
1. Events grouped by date (for line chart)
2. Top 10 services by event count (for bar chart)
3. Top 10 users by event count (for bar chart)
4. ConsoleLogin events grouped by success/failure (for pie chart)
5. Total event count (for summary card)

### 4.5 services/riskEngine.js — Risk Detection

**What it does:** Takes every CloudTrail event returned from Athena and checks it against 7 security rules. If an event matches any rule, it gets a risk annotation with severity level and finding details.

**The 7 Rules:**

| # | Rule ID | Severity | What It Detects | How It Matches |
|---|---------|----------|-----------------|----------------|
| 1 | `root-activity` | HIGH | Root account used | `user_type === 'Root'` or ARN contains `:root` |
| 2 | `failed-login` | HIGH | Failed console login | `eventname === 'ConsoleLogin'` AND `errorcode` is not empty |
| 3 | `iam-policy-change` | MEDIUM | IAM policy modifications | `eventsource === 'iam.amazonaws.com'` AND eventname is one of 16 policy events (CreatePolicy, AttachRolePolicy, etc.) |
| 4 | `security-group-change` | MEDIUM | Security group modifications | `eventsource === 'ec2.amazonaws.com'` AND eventname is one of 6 SG events (AuthorizeSecurityGroupIngress, etc.) |
| 5 | `unauthorized-access` | HIGH | Access denied errors | `errorcode` is AccessDenied or UnauthorizedAccess |
| 6 | `mfa-disabled` | MEDIUM | MFA device removed | `eventsource === 'iam.amazonaws.com'` AND eventname is DeactivateMFADevice or DeleteVirtualMFADevice |
| 7 | `nacl-change` | LOW | Network ACL changes | `eventsource === 'ec2.amazonaws.com'` AND eventname is one of 3 NACL events |

**Severity levels:**
- **HIGH** (Red `#DC2626`) — Immediate security concern. Investigate now.
- **MEDIUM** (Yellow `#D97706`) — Configuration change that could be dangerous. Review within 24 hours.
- **LOW** (Green `#16A34A`) — Minor infrastructure change. Routine review.

**How enrichment works:**
```
Input:  [{ eventname: "ConsoleLogin", errorcode: "Failed", ... }]
                                    ↓
         assessRisk() checks all 7 rules
                                    ↓
         Rule #2 matches (failed-login, HIGH)
         Rule #5 matches (unauthorized-access, HIGH)
                                    ↓
         getHighestSeverity() → HIGH
                                    ↓
Output: [{ eventname: "ConsoleLogin", ...,
           risk: {
             findings: [
               { name: "Failed Console Login", severity: "HIGH" },
               { name: "Unauthorized Access Attempt", severity: "HIGH" }
             ],
             severity: "HIGH",
             hasRisk: true
           }
         }]
```

### 4.6 routes/api.js — API Endpoints

**Three endpoints:**

#### `GET /api/events`

Returns a paginated list of CloudTrail events with risk annotations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startTime` | ISO 8601 string | No | Filter: events after this timestamp |
| `endTime` | ISO 8601 string | No | Filter: events before this timestamp |
| `service` | string | No | Filter: AWS service (e.g. `iam`, `ec2`, `s3`) |
| `user` | string | No | Filter: IAM username |
| `eventName` | string | No | Filter: partial match on event name |
| `page` | integer | No | Page number (default: 1) |
| `pageSize` | integer | No | Results per page (default: 50, max: 200) |

**Response shape:**
```json
{
  "data": [
    {
      "eventtime": "2026-04-01T10:05:17Z",
      "eventsource": "iam.amazonaws.com",
      "eventname": "CreatePolicy",
      "awsregion": "us-east-1",
      "sourceipaddress": "203.0.113.50",
      "user_type": "IAMUser",
      "user_arn": "arn:aws:iam::123456789012:user/admin",
      "username": "admin",
      "errorcode": null,
      "errormessage": null,
      "readonly": "false",
      "requestparameters": "{...}",
      "responseelements": "{...}",
      "risk": {
        "findings": [
          {
            "ruleId": "iam-policy-change",
            "name": "IAM Policy Change",
            "severity": "MEDIUM",
            "description": "An IAM policy was created, modified, or deleted"
          }
        ],
        "severity": "MEDIUM",
        "hasRisk": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 1074727,
    "totalPages": 21495
  }
}
```

#### `GET /api/stats`

Returns aggregated data for all four dashboard charts. Accepts the same filter parameters (except pagination).

**Response shape:**
```json
{
  "eventsOverTime": [{ "date": "2026-03-31", "count": 340 }],
  "topServices": [{ "service": "iam", "count": 1200 }],
  "topUsers": [{ "user": "deploy-bot", "count": 890 }],
  "loginResults": [
    { "result": "Success", "count": 45 },
    { "result": "Failed", "count": 3 }
  ],
  "totalEvents": 1074727
}
```

#### `GET /api/health`

Returns `{"status":"ok","timestamp":"..."}`. Used to verify the server is running.

### 4.7 middleware/validation.js

Validates all incoming query parameters before they reach the route handler:
- Checks date formats are valid ISO 8601
- Checks `startTime` is before `endTime`
- Validates service name against an allowed list
- Ensures `page` is a positive integer
- Ensures `pageSize` is between 1 and 200

### 4.8 middleware/errorHandler.js

Global Express error handler. Catches any unhandled error, logs the full stack trace, and returns a clean JSON error response. Special handling for Athena-specific errors (returns 502 status code).

---

## 5. FRONTEND — DETAILED EXPLANATION

### 5.1 App.jsx — Root Component

**What it does:** The top-level layout containing the header, tab navigation, filter panel, and conditional rendering of tab content.

**Three tabs:**
- **Overview** — Summary cards + 4 charts + risk timeline
- **Events** — Full sortable/filterable/paginated event table
- **Timeline** — Risk event timeline (same as bottom of Overview)

**State management:** Uses the `useDashboard` custom hook for all data fetching and state.

### 5.2 hooks/useDashboard.js — Central State

**What it does:** A React custom hook that manages ALL dashboard state and API interactions.

**State it manages:**

| State | Type | Purpose |
|-------|------|---------|
| `events` | Array | Current page of CloudTrail events |
| `stats` | Object | Aggregated stats for charts |
| `pagination` | Object | `{page, pageSize, total, totalPages}` |
| `filters` | Object | Currently applied filters |
| `loading` | Object | `{events: bool, stats: bool}` |
| `error` | String | Error message if API call fails |

**Functions it exposes:**

| Function | What it does |
|----------|-------------|
| `applyFilters(newFilters)` | Sets new filters, reloads both events and stats |
| `goToPage(pageNumber)` | Loads a specific page of events |

**On mount:** Automatically loads events (page 1) and stats with no filters.

### 5.3 components/FilterPanel.jsx

**What it does:** A form with 5 filter inputs and Apply/Clear buttons.

**Inputs:**
1. **Start Time** — `datetime-local` input
2. **End Time** — `datetime-local` input
3. **Service** — Dropdown with 12 AWS services (EC2, IAM, S3, Lambda, RDS, CloudFront, DynamoDB, SQS, SNS, CloudWatch, KMS, STS)
4. **User** — Text input for IAM username
5. **Event Name** — Text input for partial match (e.g. "Login")

**Apply** converts local dates to ISO 8601 and calls `onApply(filters)`. **Clear** resets all fields and calls `onApply({})`.

### 5.4 components/SummaryCards.jsx

**What it does:** Displays 4 KPI cards at the top of the Overview tab.

| Card | Value Source | Highlight |
|------|-------------|-----------|
| Total Events | `stats.totalEvents` | — |
| Services Active | `stats.topServices.length` | — |
| Unique Users | `stats.topUsers.length` | — |
| Failed Logins | `stats.loginResults` where result=Failed | Red text if > 0 |

Shows skeleton loading animation while stats are loading.

### 5.5 components/StatsCharts.jsx

**What it does:** Renders 4 Recharts visualizations in a 2x2 grid.

| Chart | Type | Data Source | X Axis | Y Axis |
|-------|------|------------|--------|--------|
| Events Over Time | Line | `stats.eventsOverTime` | Date | Count |
| Top Services | Horizontal Bar | `stats.topServices` | Count | Service name |
| Top Users | Horizontal Bar | `stats.topUsers` | Count | Username |
| Console Login Results | Pie | `stats.loginResults` | — | — |

**Color rules:**
- Line and bar charts use neutral gray (`#374151`) — no unnecessary colors
- Pie chart uses green (`#16A34A`) for Success and red (`#DC2626`) for Failed
- All tooltips and grid lines use light gray

### 5.6 components/EventTable.jsx

**What it does:** A full-featured data table with sorting, expandable rows, risk highlighting, and pagination.

**Columns:**

| Column | Data Field | Sortable |
|--------|-----------|----------|
| Time | `eventtime` | Yes |
| Service | `eventsource` | Yes |
| Event | `eventname` | Yes |
| User | `username` or `user_type` | Yes |
| Source IP | `sourceipaddress` | Yes |
| Region | `awsregion` | Yes |
| Risk | `risk.severity` | No |

**Features:**
- **Client-side sorting** — Click any column header to sort asc/desc
- **Expandable rows** — Click a row to reveal: User ARN, error details, and risk findings with severity badges
- **Risk coloring** — Rows with risk get colored backgrounds: `bg-red-50` (HIGH), `bg-yellow-50` (MEDIUM), `bg-green-50` (LOW)
- **Pagination** — Previous/Next buttons, shows "X events — Page Y of Z"

### 5.7 components/TimelineView.jsx

**What it does:** A vertical timeline showing ONLY events that have risk findings. Non-risky events are excluded.

Each timeline entry shows:
- Colored dot (red/yellow/green based on severity)
- Severity label and timestamp
- Event name and service
- Risk finding names, username, and source IP

---

## 6. ATHENA TABLE SCHEMA

The file `athena-schema.sql` contains the SQL to create the Athena external table that maps to CloudTrail JSON files in S3.

**Key fields queried by the dashboard:**

| Field | Type | Example Value |
|-------|------|--------------|
| `eventtime` | STRING | `2026-04-01T10:05:17Z` |
| `eventsource` | STRING | `iam.amazonaws.com` |
| `eventname` | STRING | `ConsoleLogin` |
| `awsregion` | STRING | `us-east-1` |
| `sourceipaddress` | STRING | `203.0.113.50` |
| `useridentity.type` | STRING | `IAMUser`, `Root`, `AssumedRole` |
| `useridentity.arn` | STRING | `arn:aws:iam::123456789012:user/admin` |
| `useridentity.username` | STRING | `admin` |
| `errorcode` | STRING | `AccessDenied`, `null` |
| `errormessage` | STRING | `User is not authorized...` |
| `readonly` | STRING | `true` or `false` |
| `requestparameters` | STRING | JSON string of API call parameters |
| `responseelements` | STRING | JSON string of API response |

**The LOCATION line** tells Athena where the JSON files are:
```
LOCATION 's3://BUCKET_NAME/AWSLogs/ACCOUNT_ID/CloudTrail/'
```

Athena recursively reads all `.json.gz` files under that path, across all regions and dates.

---

## 7. SECURITY CONSIDERATIONS

| Concern | How It's Handled |
|---------|-----------------|
| SQL injection | Parameters are sanitized (single quotes escaped) before substitution into SQL |
| API abuse | Rate limiting at 100 requests per minute per IP |
| HTTP headers | Helmet sets X-Content-Type-Options, X-Frame-Options, HSTS, etc. |
| CORS | In production, restricted to `FRONTEND_URL` only |
| Credential storage | `.env` is git-ignored; no credentials in source code |
| AWS credential chain | Supports both explicit keys and default chain (SSO, instance roles) |
| Input validation | All query params validated before reaching business logic |

---

## 8. WHAT WE DID DURING SETUP (Our Session)

### Step-by-step record of what happened:

1. **Built the full project** — 28 files across backend and frontend
2. **Created Athena schema** — `athena-schema.sql` with CloudTrail table definition
3. **Phase 4 — Athena table creation:**
   - First attempt returned 0 rows (the `LOCATION` path had a typo)
   - Fixed by providing the exact path: `s3://your-cloudtrail-bucket/AWSLogs/YOUR_ACCOUNT_ID/CloudTrail/`
   - Verified with `SELECT ... LIMIT 10` — returned real data
4. **Installed Node.js** — Downloaded v20.18.3 to `~/.local/node/` (no Homebrew available)
5. **Backend setup:**
   - `npm install` — installed 186 packages
   - `.env` file — initially had placeholder values stuck on disk (editor buffer vs disk mismatch)
   - AWS credentials — IAM user created with access keys
   - **Region typo found:** `~/.aws/config` had `us-eat-1` instead of `us-east-1` — fixed
   - IAM user got "security token invalid" → turned out SCP blocked IAM user Athena access
   - **Solution:** Switched to SSO credentials via `ada credentials update`
   - Removed explicit keys from `.env`, let SDK use `~/.aws/credentials` from ada
   - API returned **1,074,727 events** (4 years of CloudTrail data) successfully
6. **Frontend setup:**
   - `npm install` — installed 190 packages
   - PostCSS config error — changed `export default` to `module.exports` (Node.js CJS requirement)
   - Vite started on port 3000, dashboard loaded

### Key Credential Note

This sandbox uses SSO via `ada`. Before starting the backend, always run:
```bash
ada credentials update --account=YOUR_ACCOUNT_ID --provider=conduit --role=YOUR_ROLE --once
```
These credentials expire after a few hours. Refresh and restart the backend when they expire.

---

## 9. HOW TO RUN THE PROJECT

### Prerequisites
- Node.js v18+ installed
- AWS credentials configured (via ada or ~/.aws/credentials)

### Start Backend (Terminal 1)
```bash
ada credentials update --account=YOUR_ACCOUNT_ID --provider=conduit --role=YOUR_ROLE --once
cd cloudtrail-dashboard/backend
npm start
```
Runs on http://localhost:4000

### Start Frontend (Terminal 2)
```bash
cd cloudtrail-dashboard/frontend
npm run dev
```
Runs on http://localhost:3000

### Open Dashboard
Navigate to http://localhost:3000 in your browser.

---

## 10. API QUERY EXAMPLES

```bash
# Health check
curl http://localhost:4000/api/health

# Get first page of events (default 50 per page)
curl "http://localhost:4000/api/events"

# Get page 3 with 20 events per page
curl "http://localhost:4000/api/events?page=3&pageSize=20"

# Filter by service
curl "http://localhost:4000/api/events?service=iam"

# Filter by time range
curl "http://localhost:4000/api/events?startTime=2026-03-01T00:00:00Z&endTime=2026-03-31T23:59:59Z"

# Filter by user
curl "http://localhost:4000/api/events?user=admin"

# Search by event name
curl "http://localhost:4000/api/events?eventName=Login"

# Combine filters
curl "http://localhost:4000/api/events?service=iam&eventName=Policy&startTime=2026-01-01T00:00:00Z"

# Get stats for charts
curl "http://localhost:4000/api/stats"

# Get filtered stats
curl "http://localhost:4000/api/stats?service=ec2&startTime=2026-03-01T00:00:00Z"
```

---

## 11. LIVE DATA RESULTS

When tested against a sandbox account:

| Metric | Value |
|--------|-------|
| Total events in table | 1,074,727 |
| Date range | ~4 years (2022–2026) |
| Account ID | YOUR_ACCOUNT_ID |
| CloudTrail S3 bucket | YOUR_CLOUDTRAIL_BUCKET |
| Athena query time (first load) | ~85 seconds (scanning full dataset) |
| Athena query time (filtered) | 5–30 seconds |
