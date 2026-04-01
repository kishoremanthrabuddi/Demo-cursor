# CloudTrail Dashboard — Complete Setup Guide (AWS Org Sandbox)

This document walks you through every single step, from zero, to get the
CloudTrail Dashboard running against your AWS Organization sandbox account.

No step is assumed. If you follow this top-to-bottom, you will have a
working dashboard.

---

## TABLE OF CONTENTS

```
PHASE 1 — Understand What We Built
PHASE 2 — Prepare Your Local Machine
PHASE 3 — AWS Sandbox Configuration (Console Steps)
  Step 3.1  Find your Account ID
  Step 3.2  Verify CloudTrail is enabled
  Step 3.3  Create S3 bucket for Athena query results
  Step 3.4  Create an IAM user for the dashboard
  Step 3.5  Create and attach the IAM policy
  Step 3.6  Generate access keys
PHASE 4 — Athena Table Setup (Console Steps)
  Step 4.1  Open Athena console
  Step 4.2  Set up a query result location
  Step 4.3  Create the database
  Step 4.4  Create the CloudTrail table
  Step 4.5  Test with a sample query
PHASE 5 — Backend Setup (Your Machine)
  Step 5.1  Install Node.js
  Step 5.2  Install backend dependencies
  Step 5.3  Configure environment variables
  Step 5.4  Start the backend
  Step 5.5  Test the API
PHASE 6 — Frontend Setup (Your Machine)
  Step 6.1  Install frontend dependencies
  Step 6.2  Start the frontend
  Step 6.3  Open the dashboard
PHASE 7 — Verification & Troubleshooting
PHASE 8 — How It All Connects (Architecture Deep Dive)
```

---

## PHASE 1 — UNDERSTAND WHAT WE BUILT

Before touching AWS, understand the four pieces involved:

```
 YOUR LAPTOP                          AWS CLOUD (Sandbox Account)
┌──────────────────────┐             ┌──────────────────────────────┐
│                      │             │                              │
│  React Frontend      │   HTTP      │  S3 Bucket A                 │
│  (localhost:3000)    │────────┐    │  └── CloudTrail log files    │
│  - Charts            │        │    │      (JSON, auto-delivered)  │
│  - Event table       │        │    │                              │
│  - Filters           │        │    │  S3 Bucket B                 │
│  - Timeline          │        │    │  └── Athena query results    │
│                      │        │    │      (CSV output files)      │
├──────────────────────┤        │    │                              │
│                      │        │    │  Athena                      │
│  Express Backend     │────────┘    │  └── Reads S3 Bucket A       │
│  (localhost:4000)    │──── SDK ───▶│  └── Writes to S3 Bucket B   │
│  - /api/events       │◀───────────│  └── Returns query results   │
│  - /api/stats        │             │                              │
│  - Risk engine       │             │  CloudTrail                  │
│                      │             │  └── Records every API call  │
└──────────────────────┘             │  └── Writes JSON to Bucket A │
                                     └──────────────────────────────┘
```

**In plain English:**
- AWS CloudTrail automatically records every API call anyone makes in
  your sandbox account (login, create EC2, change IAM, etc.)
- CloudTrail writes these as JSON files to an S3 bucket
- Amazon Athena can run SQL queries on those JSON files directly
- Our Express backend sends SQL to Athena, gets results back
- Our React frontend shows those results as charts, tables, and a
  risk-detected timeline

---

## PHASE 2 — PREPARE YOUR LOCAL MACHINE

### Step 2.1 — Install Node.js (if not installed)

Check if you have it:

```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/en/download
- Use the LTS version (v20 or v22)
- macOS: download the .pkg installer, double-click, follow prompts
- Or use Homebrew: `brew install node`

Verify after install:

```bash
node --version    # should show v18+ or v20+ or v22+
npm --version     # should show 9+ or 10+
```

### Step 2.2 — Install AWS CLI (optional but helpful)

```bash
brew install awscli
# or download from: https://aws.amazon.com/cli/
```

This isn't required (the dashboard uses the AWS SDK directly) but helps
you verify credentials work.

---

## PHASE 3 — AWS SANDBOX CONFIGURATION

Log into your AWS Organization sandbox account via the AWS Console.

### Step 3.1 — Find Your Account ID

1. Click your username in the top-right corner of the AWS Console
2. Your 12-digit Account ID is displayed (e.g. `123456789012`)
3. **Write this down** — you need it in Step 4.4

### Step 3.2 — Verify CloudTrail Is Enabled

1. Go to **AWS Console → CloudTrail** (search "CloudTrail" in the search bar)
2. Click **Trails** in the left sidebar
3. You should see at least one trail listed

**If a trail exists:**
- Click on it
- Under **S3 bucket**, note the bucket name (e.g. `aws-cloudtrail-logs-123456789012-abc123`)
- **Write down this bucket name** — you need it in Step 4.4
- Confirm **Status** = "Logging" (green checkmark)

**If NO trail exists** (unlikely for an Org sandbox, but just in case):
1. Click **Create trail**
2. Trail name: `management-events-trail`
3. Create new S3 bucket: `cloudtrail-logs-<your-account-id>` (use your actual account ID)
4. Leave defaults for everything else
5. Click **Create trail**
6. **Write down the S3 bucket name**

### Step 3.3 — Create S3 Bucket for Athena Query Results

Athena needs a separate bucket to store its query output files. This is
NOT the same as your CloudTrail bucket.

1. Go to **AWS Console → S3**
2. Click **Create bucket**
3. Bucket name: `athena-results-<your-account-id>` (e.g. `athena-results-123456789012`)
4. Region: same region as your CloudTrail trail (usually `us-east-1`)
5. Leave all other settings as defaults
6. Click **Create bucket**
7. **Write down this bucket name**

### Step 3.4 — Create an IAM User for the Dashboard

This user's credentials are what the backend uses to talk to Athena.

1. Go to **AWS Console → IAM → Users**
2. Click **Create user**
3. User name: `cloudtrail-dashboard-user`
4. Do NOT check "Provide user access to the AWS Management Console"
5. Click **Next**
6. Select **Attach policies directly**
7. Don't attach anything yet (we'll create a custom policy). Click **Next**
8. Click **Create user**

### Step 3.5 — Create and Attach the IAM Policy

1. Go to **AWS Console → IAM → Policies**
2. Click **Create policy**
3. Click the **JSON** tab
4. Paste this policy (replace the 3 placeholder values):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AthenaAccess",
      "Effect": "Allow",
      "Action": [
        "athena:StartQueryExecution",
        "athena:GetQueryExecution",
        "athena:GetQueryResults",
        "athena:StopQueryExecution",
        "athena:GetWorkGroup"
      ],
      "Resource": "arn:aws:athena:*:*:workgroup/primary"
    },
    {
      "Sid": "ReadCloudTrailBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::REPLACE_WITH_CLOUDTRAIL_BUCKET_NAME",
        "arn:aws:s3:::REPLACE_WITH_CLOUDTRAIL_BUCKET_NAME/*"
      ]
    },
    {
      "Sid": "AthenaResultsBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::REPLACE_WITH_ATHENA_RESULTS_BUCKET_NAME",
        "arn:aws:s3:::REPLACE_WITH_ATHENA_RESULTS_BUCKET_NAME/*"
      ]
    },
    {
      "Sid": "GlueAccess",
      "Effect": "Allow",
      "Action": [
        "glue:GetTable",
        "glue:GetTables",
        "glue:GetPartitions",
        "glue:GetDatabase",
        "glue:GetDatabases",
        "glue:CreateTable",
        "glue:CreateDatabase"
      ],
      "Resource": [
        "arn:aws:glue:*:*:catalog",
        "arn:aws:glue:*:*:database/cloudtrail_logs",
        "arn:aws:glue:*:*:table/cloudtrail_logs/*"
      ]
    }
  ]
}
```

**Replace these 3 values:**
- `REPLACE_WITH_CLOUDTRAIL_BUCKET_NAME` → the bucket from Step 3.2
  (e.g. `aws-cloudtrail-logs-123456789012-abc123`)
- `REPLACE_WITH_ATHENA_RESULTS_BUCKET_NAME` → the bucket from Step 3.3
  (e.g. `athena-results-123456789012`)

5. Click **Next**
6. Policy name: `CloudTrailDashboardPolicy`
7. Click **Create policy**

Now attach it to the user:
1. Go to **IAM → Users → cloudtrail-dashboard-user**
2. Click **Add permissions → Attach policies directly**
3. Search for `CloudTrailDashboardPolicy`
4. Check it, click **Next**, then **Add permissions**

### Step 3.6 — Generate Access Keys

1. Go to **IAM → Users → cloudtrail-dashboard-user**
2. Click the **Security credentials** tab
3. Under **Access keys**, click **Create access key**
4. Select **Application running outside AWS**
5. Click **Next**, then **Create access key**
6. **IMPORTANT: Copy both values NOW** (you cannot see the secret again):
   - Access key ID: `AKIA...............`
   - Secret access key: `wJal...............`
7. Click **Done**

---

## PHASE 4 — ATHENA TABLE SETUP

### Step 4.1 — Open Athena Console

1. Go to **AWS Console → Athena** (search "Athena" in the search bar)
2. Make sure you are in the **same region** as your CloudTrail bucket

### Step 4.2 — Set Up Query Result Location

The first time you use Athena, it asks where to store results.

1. If prompted, click **Settings** (top right) or **Edit settings**
2. Set **Query result location** to: `s3://athena-results-YOUR_ACCOUNT_ID/`
   (use the bucket you created in Step 3.3, with a trailing slash)
3. Click **Save**

### Step 4.3 — Create the Database

In the Athena query editor, paste and run:

```sql
CREATE DATABASE IF NOT EXISTS cloudtrail_logs;
```

Click **Run**. You should see "Query successful" in a few seconds.

### Step 4.4 — Create the CloudTrail Table

This is the critical step. Paste this into the Athena editor, but
**FIRST replace the two placeholders on the LOCATION line**:

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS cloudtrail_logs.cloudtrail_events (
    eventversion STRING,
    useridentity STRUCT<
        type: STRING,
        principalid: STRING,
        arn: STRING,
        accountid: STRING,
        invokedby: STRING,
        accesskeyid: STRING,
        username: STRING,
        sessioncontext: STRUCT<
            attributes: STRUCT<
                mfaauthenticated: STRING,
                creationdate: STRING
            >,
            sessionissuer: STRUCT<
                type: STRING,
                principalid: STRING,
                arn: STRING,
                accountid: STRING,
                username: STRING
            >
        >
    >,
    eventtime STRING,
    eventsource STRING,
    eventname STRING,
    awsregion STRING,
    sourceipaddress STRING,
    useragent STRING,
    errorcode STRING,
    errormessage STRING,
    requestparameters STRING,
    responseelements STRING,
    additionaleventdata STRING,
    requestid STRING,
    eventid STRING,
    resources ARRAY<STRUCT<
        arn: STRING,
        accountid: STRING,
        type: STRING
    >>,
    eventtype STRING,
    apiversion STRING,
    readonly STRING,
    recipientaccountid STRING,
    serviceeventdetails STRING,
    sharedeventid STRING,
    vpcendpointid STRING
)
COMMENT 'CloudTrail table for the CloudTrail Dashboard'
ROW FORMAT SERDE 'org.apache.hive.hcatalog.data.JsonSerDe'
STORED AS INPUTFORMAT 'com.amazon.emr.cloudtrail.CloudTrailInputFormat'
OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://YOUR_CLOUDTRAIL_BUCKET/AWSLogs/YOUR_ACCOUNT_ID/CloudTrail/'
TBLPROPERTIES ('classification'='cloudtrail');
```

**Replace on the LOCATION line:**
- `YOUR_CLOUDTRAIL_BUCKET` → actual bucket name from Step 3.2
- `YOUR_ACCOUNT_ID` → your 12-digit account ID from Step 3.1

**Example LOCATION line after replacement:**
```
LOCATION 's3://aws-cloudtrail-logs-123456789012-abc123/AWSLogs/123456789012/CloudTrail/'
```

Click **Run**. Should say "Query successful."

### Step 4.5 — Test With a Sample Query

Paste and run:

```sql
SELECT eventtime, eventsource, eventname, useridentity.username
FROM cloudtrail_logs.cloudtrail_events
LIMIT 10;
```

**If you see rows of data** — your table is working. Move on to Phase 5.

**If you see zero rows:**
- Your CloudTrail may not have delivered logs yet (wait 15 minutes and
  try again — CloudTrail delivers logs every ~5 minutes)
- Check if the LOCATION path is correct by browsing the S3 bucket
  manually. Look for a path like:
  `s3://bucket/AWSLogs/ACCOUNT_ID/CloudTrail/us-east-1/2026/03/31/`

**If you get an error:**
- "Access Denied" → the IAM user doesn't have S3 read on the CT bucket
- "Table not found" → make sure you selected database `cloudtrail_logs`
  in the Athena editor dropdown
- "SerDe" error → the LOCATION path doesn't point to valid CloudTrail
  JSON files

---

## PHASE 5 — BACKEND SETUP (YOUR MACHINE)

### Step 5.1 — Verify Node.js

```bash
node --version   # must show v18 or higher
npm --version
```

### Step 5.2 — Install Backend Dependencies

```bash
cd cloudtrail-dashboard/backend
npm install
```

This installs Express, AWS SDK, and all other packages listed in
`package.json`. Takes about 30-60 seconds.

### Step 5.3 — Configure Environment Variables

```bash
cp .env.example .env
```

Now open `.env` in your editor and fill in EVERY value using the
information you collected in Phase 3:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA_YOUR_KEY_FROM_STEP_3.6
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_FROM_STEP_3.6
ATHENA_DATABASE=cloudtrail_logs
ATHENA_TABLE=cloudtrail_events
ATHENA_OUTPUT_BUCKET=s3://athena-results-YOUR_ACCOUNT_ID/
CLOUDTRAIL_S3_BUCKET=your-cloudtrail-bucket-name-from-step-3.2
CLOUDTRAIL_S3_PREFIX=AWSLogs/YOUR_ACCOUNT_ID/CloudTrail/
PORT=4000
NODE_ENV=development
```

**Concrete example with fake values:**

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
ATHENA_DATABASE=cloudtrail_logs
ATHENA_TABLE=cloudtrail_events
ATHENA_OUTPUT_BUCKET=s3://athena-results-123456789012/
CLOUDTRAIL_S3_BUCKET=aws-cloudtrail-logs-123456789012-abc123
CLOUDTRAIL_S3_PREFIX=AWSLogs/123456789012/CloudTrail/
PORT=4000
NODE_ENV=development
```

### Step 5.4 — Start the Backend

```bash
npm run dev
```

You should see:

```
CloudTrail Dashboard API running on port 4000 [development]
```

**Leave this terminal running.** Open a NEW terminal for the next steps.

### Step 5.5 — Test the API

In a new terminal:

```bash
# Health check (should return {"status":"ok","timestamp":"..."})
curl http://localhost:4000/api/health

# Fetch first page of events (will take 5-30 seconds — Athena query)
curl "http://localhost:4000/api/events?pageSize=5"

# Fetch stats
curl "http://localhost:4000/api/stats"
```

If `/api/events` returns data, the backend is working. If you get an
error, check the terminal running the backend — it will show the
Athena error message.

---

## PHASE 6 — FRONTEND SETUP (YOUR MACHINE)

Open a SECOND terminal (keep the backend running in the first one).

### Step 6.1 — Install Frontend Dependencies

```bash
cd cloudtrail-dashboard/frontend
npm install
```

### Step 6.2 — Start the Frontend

```bash
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### Step 6.3 — Open the Dashboard

Open your browser and go to: **http://localhost:3000**

You should see:
1. The header "CloudTrail Dashboard"
2. Filter panel at the top
3. Summary cards (Total Events, Services Active, etc.)
4. Four charts loading
5. A risk event timeline at the bottom

**The first load takes 10-30 seconds** because Athena is running 6
queries in parallel to populate the charts and event table.

---

## PHASE 7 — VERIFICATION & TROUBLESHOOTING

### Verify Everything Works (Checklist)

| Check | How | Expected |
|---|---|---|
| Backend is running | Look at terminal 1 | "running on port 4000" |
| Frontend is running | Look at terminal 2 | "VITE ready" on port 3000 |
| Health endpoint | `curl localhost:4000/api/health` | `{"status":"ok"}` |
| Browser loads | Open localhost:3000 | Dashboard appears |
| Charts have data | Look at Overview tab | Line/bar/pie charts populated |
| Events table works | Click "Events" tab | Rows of CloudTrail events |
| Filters work | Set service=IAM, click Apply | Table filters to IAM events only |
| Risk detection works | Look for colored rows | Red/yellow/green highlights |
| Pagination works | Click Next in Events tab | New page of results loads |

### Common Problems & Solutions

**Problem: "Athena query FAILED: ... Access Denied"**
- Cause: IAM user can't read the CloudTrail S3 bucket
- Fix: Check the IAM policy from Step 3.5. Make sure the bucket
  names in the policy EXACTLY match your actual bucket names.

**Problem: "Athena query FAILED: ... Table not found"**
- Cause: Database or table name mismatch
- Fix: In `.env`, verify `ATHENA_DATABASE=cloudtrail_logs` and
  `ATHENA_TABLE=cloudtrail_events`. Run the CREATE TABLE from Step
  4.4 again in the Athena console if needed.

**Problem: Events come back but all empty / zero rows**
- Cause: LOCATION path in the CREATE TABLE statement is wrong
- Fix: Browse S3 manually. Find the actual path where CloudTrail
  JSON files (.json.gz) live. It's usually:
  `s3://bucket/AWSLogs/ACCOUNT_ID/CloudTrail/REGION/YEAR/MONTH/DAY/`
  Make sure the LOCATION in Step 4.4 points to the parent directory.

**Problem: "Network Error" in the browser**
- Cause: Backend isn't running, or proxy isn't working
- Fix: Make sure `npm run dev` is running in the backend terminal
  on port 4000. The frontend Vite config proxies `/api/*` to 4000.

**Problem: Charts show but no risk events in timeline**
- This is normal if nobody has done anything risky. The risk engine
  only flags root activity, failed logins, IAM changes, etc. Try
  doing something in the sandbox to generate events:
  - Log in with wrong password (failed ConsoleLogin)
  - Create/delete an IAM policy
  - Modify a security group

**Problem: "ECONNREFUSED" on npm install**
- You need internet access to install packages
- If you're behind a corporate proxy, configure npm:
  `npm config set proxy http://proxy.company.com:8080`

---

## PHASE 8 — HOW IT ALL CONNECTS (ARCHITECTURE DEEP DIVE)

### The Full Request Flow

When you open the dashboard, here's exactly what happens:

```
1. Browser loads http://localhost:3000
   → Vite serves the React app (HTML + JS + CSS)

2. React app mounts, useDashboard hook fires
   → Calls fetchEvents() and fetchStats() in parallel

3. fetchEvents() sends: GET http://localhost:3000/api/events?page=1&pageSize=50
   → Vite dev server sees "/api" prefix
   → Proxies request to http://localhost:4000/api/events?page=1&pageSize=50

4. Express receives the request
   → validation middleware checks query params
   → routes/api.js calls queryService.getEvents()

5. queryService.getEvents() builds two SQL strings:
   a) SELECT COUNT(*) FROM cloudtrail_logs.cloudtrail_events  (for pagination)
   b) SELECT ... FROM cloudtrail_logs.cloudtrail_events ORDER BY eventtime DESC LIMIT 50

6. Each SQL goes to athenaClient.executeQuery() which:
   a) Calls Athena StartQueryExecution (sends SQL to AWS)
   b) Polls GetQueryExecution every 1 second until SUCCEEDED
   c) Calls GetQueryResults to get rows
   d) Transforms rows from Athena format to plain objects

7. Back in routes/api.js, raw rows go through riskEngine.enrichEventsWithRisk()
   → Each event is checked against 7 risk rules
   → Matching events get { risk: { severity: "HIGH", findings: [...] } } attached

8. Express sends JSON response back through the proxy to the browser

9. React receives JSON, updates state via useDashboard hook
   → EventTable renders rows (risky ones get colored backgrounds)
   → StatsCharts renders the 4 Recharts visualizations
   → TimelineView filters for risk events and renders the timeline
```

### File Responsibilities (What Each File Does)

**Backend:**

| File | What It Does |
|---|---|
| `server.js` | Starts Express, applies security middleware (helmet, cors, rate limiting), mounts routes |
| `config/index.js` | Reads .env file and exports a config object used everywhere |
| `routes/api.js` | Defines GET /events, GET /stats, GET /health. Calls services, returns JSON |
| `services/athenaClient.js` | Low-level AWS SDK wrapper. Takes SQL string → returns array of row objects. Handles polling. |
| `services/queryService.js` | Business logic. Builds WHERE clauses from filters. Runs COUNT + SELECT for pagination. Runs 5 parallel queries for /stats. |
| `services/riskEngine.js` | 7 rule definitions. Each rule has a `match()` function. `enrichEventsWithRisk()` annotates every event. |
| `middleware/validation.js` | Validates query params (date format, service names, page numbers) before they reach the route handler |
| `middleware/errorHandler.js` | Catches unhandled errors, logs them, returns clean JSON error responses |

**Frontend:**

| File | What It Does |
|---|---|
| `App.jsx` | Root layout. Header, tab navigation (Overview/Events/Timeline), filter panel, conditional rendering |
| `hooks/useDashboard.js` | Central state: events, stats, pagination, filters, loading, errors. Calls API on mount and filter changes. |
| `services/api.js` | Axios HTTP client. Three functions: fetchEvents(), fetchStats(), checkHealth() |
| `utils/format.js` | Helper functions: date formatting, severity→color mapping, strip ".amazonaws.com" |
| `components/FilterPanel.jsx` | 6-field form (start time, end time, service dropdown, user, event name). Apply/Clear buttons. |
| `components/SummaryCards.jsx` | 4 KPI cards: Total Events, Active Services, Unique Users, Failed Logins |
| `components/StatsCharts.jsx` | 4 Recharts visualizations: Line (events over time), 2 horizontal Bars (services, users), Pie (login success/fail) |
| `components/EventTable.jsx` | Sortable columns, expandable rows with detail panel, colored risk rows, pagination controls |
| `components/TimelineView.jsx` | Vertical timeline showing only risky events with colored severity dots |

### Why These Technology Choices

| Choice | Why |
|---|---|
| Athena over direct S3 | SQL is easier than parsing millions of JSON files. Athena is serverless — no infrastructure to manage. |
| Express over Lambda | Persistent connections avoid Lambda cold starts. Athena queries take 5-30 seconds — Lambda timeout management is messier. |
| React + Vite | Fast dev experience, hot reload, proxy built in. Vite builds to static files for production. |
| Recharts | Lightweight React charting library. No DOM manipulation conflicts. |
| Tailwind | Utility-first CSS. No CSS files to manage. Consistent design without a heavy UI framework. |
| Server-side risk engine | Risk rules run in Node.js, not in SQL. This means: (a) rules are in plain JavaScript — easy to modify/add, (b) they don't slow down Athena queries, (c) frontend stays simple. |

---

## QUICK REFERENCE — VALUES YOU NEED

Fill this out as you go through the guide:

```
My AWS Account ID:        ____________________________
CloudTrail S3 Bucket:     ____________________________
Athena Results S3 Bucket: ____________________________
AWS Region:               ____________________________
IAM Access Key ID:        ____________________________
IAM Secret Access Key:    ____________________________
```

These 6 values are ALL you need to connect this dashboard to your
sandbox account.
