const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = '123456789012';
const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1'];

const USERS = [
  { type: 'IAMUser', username: 'admin-user', arn: `arn:aws:iam::${ACCOUNT_ID}:user/admin-user`, principalid: 'AIDAEXAMPLE1' },
  { type: 'IAMUser', username: 'deploy-bot', arn: `arn:aws:iam::${ACCOUNT_ID}:user/deploy-bot`, principalid: 'AIDAEXAMPLE2' },
  { type: 'IAMUser', username: 'dev-john', arn: `arn:aws:iam::${ACCOUNT_ID}:user/dev-john`, principalid: 'AIDAEXAMPLE3' },
  { type: 'IAMUser', username: 'dev-sarah', arn: `arn:aws:iam::${ACCOUNT_ID}:user/dev-sarah`, principalid: 'AIDAEXAMPLE4' },
  { type: 'AssumedRole', username: 'lambda-exec-role', arn: `arn:aws:sts::${ACCOUNT_ID}:assumed-role/lambda-exec-role/session1`, principalid: 'AROAEXAMPLE1:session1' },
  { type: 'AssumedRole', username: 'ecs-task-role', arn: `arn:aws:sts::${ACCOUNT_ID}:assumed-role/ecs-task-role/task1`, principalid: 'AROAEXAMPLE2:task1' },
  { type: 'Root', username: 'root', arn: `arn:aws:iam::${ACCOUNT_ID}:root`, principalid: ACCOUNT_ID },
  { type: 'AWSService', username: null, arn: null, principalid: null, invokedby: 'cloudtrail.amazonaws.com' },
];

const EVENTS = [
  { source: 'iam.amazonaws.com', events: ['CreateUser', 'DeleteUser', 'CreatePolicy', 'DeletePolicy', 'AttachUserPolicy', 'DetachUserPolicy', 'CreateRole', 'PutRolePolicy', 'CreateAccessKey', 'ListUsers', 'GetUser', 'ListRoles', 'GetPolicy', 'ListPolicies', 'DeactivateMFADevice'] },
  { source: 'ec2.amazonaws.com', events: ['RunInstances', 'TerminateInstances', 'StopInstances', 'StartInstances', 'DescribeInstances', 'DescribeSecurityGroups', 'AuthorizeSecurityGroupIngress', 'RevokeSecurityGroupIngress', 'CreateSecurityGroup', 'DescribeSubnets', 'DescribeVpcs', 'CreateNetworkAclEntry', 'DeleteNetworkAclEntry'] },
  { source: 's3.amazonaws.com', events: ['CreateBucket', 'DeleteBucket', 'PutObject', 'GetObject', 'DeleteObject', 'ListBuckets', 'PutBucketPolicy', 'GetBucketAcl', 'PutBucketEncryption'] },
  { source: 'lambda.amazonaws.com', events: ['CreateFunction20150331', 'UpdateFunctionCode20150331v2', 'Invoke', 'DeleteFunction20150331', 'ListFunctions20150331', 'GetFunction20150331v2'] },
  { source: 'sts.amazonaws.com', events: ['AssumeRole', 'GetCallerIdentity', 'AssumeRoleWithSAML', 'GetSessionToken'] },
  { source: 'rds.amazonaws.com', events: ['CreateDBInstance', 'DeleteDBInstance', 'DescribeDBInstances', 'ModifyDBInstance', 'CreateDBSnapshot'] },
  { source: 'cloudwatch.amazonaws.com', events: ['PutMetricAlarm', 'DescribeAlarms', 'PutDashboard', 'GetMetricData'] },
  { source: 'kms.amazonaws.com', events: ['CreateKey', 'Decrypt', 'Encrypt', 'GenerateDataKey', 'DescribeKey'] },
  { source: 'dynamodb.amazonaws.com', events: ['CreateTable', 'DeleteTable', 'DescribeTable', 'PutItem', 'GetItem', 'Query'] },
  { source: 'sns.amazonaws.com', events: ['CreateTopic', 'Publish', 'Subscribe', 'ListTopics'] },
  { source: 'sqs.amazonaws.com', events: ['CreateQueue', 'SendMessage', 'ReceiveMessage', 'DeleteQueue'] },
  { source: 'signin.amazonaws.com', events: ['ConsoleLogin'] },
];

const IPS = ['72.21.198.64', '54.239.28.85', '198.51.100.22', '203.0.113.50', '10.0.0.15', '192.168.1.100', '35.180.1.1', '52.94.133.131', 'AWS Internal'];
const USER_AGENTS = [
  'aws-cli/2.15.0 Python/3.11.6',
  'console.amazonaws.com',
  'Boto3/1.34.0 Python/3.10.12',
  'aws-sdk-js/3.400.0',
  'lambda.amazonaws.com',
  'ecs.amazonaws.com',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
];

const ERROR_CODES = ['AccessDenied', 'UnauthorizedAccess', 'Client.UnauthorizedAccess', 'ValidationException', 'ResourceNotFoundException', 'ThrottlingException'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateEvent(timestamp, region) {
  const svcDef = rand(EVENTS);
  const eventName = rand(svcDef.events);
  const user = rand(USERS);
  const ip = rand(IPS);
  const ua = rand(USER_AGENTS);

  const hasError = Math.random() < 0.08;
  const isConsoleLogin = svcDef.source === 'signin.amazonaws.com';

  const event = {
    eventversion: '1.08',
    useridentity: {
      type: user.type,
      principalid: user.principalid || '',
      arn: user.arn || '',
      accountid: ACCOUNT_ID,
      invokedby: user.invokedby || '',
      accesskeyid: 'ASIA' + Array.from({ length: 16 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[randInt(0, 31)]).join(''),
      username: user.username || '',
    },
    eventtime: timestamp.toISOString().replace('.000Z', 'Z'),
    eventsource: svcDef.source,
    eventname: eventName,
    awsregion: region,
    sourceipaddress: ip,
    useragent: ua,
    errorcode: '',
    errormessage: '',
    requestparameters: JSON.stringify({ example: 'param' }),
    responseelements: JSON.stringify({ result: 'success' }),
    requestid: crypto.randomUUID(),
    eventid: crypto.randomUUID(),
    readonly: ['Describe', 'List', 'Get'].some(p => eventName.startsWith(p)) ? 'true' : 'false',
    eventtype: 'AwsApiCall',
    recipientaccountid: ACCOUNT_ID,
  };

  if (isConsoleLogin) {
    const loginFailed = Math.random() < 0.15;
    if (loginFailed) {
      event.errorcode = 'Failed';
      event.errormessage = 'No username found in supplied account';
      event.responseelements = JSON.stringify({ ConsoleLogin: 'Failure' });
    } else {
      event.responseelements = JSON.stringify({ ConsoleLogin: 'Success' });
    }
  } else if (hasError) {
    event.errorcode = rand(ERROR_CODES);
    event.errormessage = `User: ${user.arn || 'unknown'} is not authorized to perform: ${eventName}`;
  }

  return event;
}

const outputDir = path.join(__dirname, 'cloudtrail-data');
if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const startDate = new Date('2026-03-15');
const endDate = new Date('2026-04-05');
let totalEvents = 0;
const allLines = [];

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const eventsPerDay = randInt(150, 400);
  const region = rand(REGIONS);

  for (let i = 0; i < eventsPerDay; i++) {
    const ts = new Date(d);
    ts.setUTCHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);
    allLines.push(JSON.stringify(generateEvent(ts, region)));
    totalEvents++;
  }
}

const chunkSize = 1000;
for (let i = 0; i < allLines.length; i += chunkSize) {
  const chunk = allLines.slice(i, i + chunkSize);
  const fileNum = String(Math.floor(i / chunkSize) + 1).padStart(3, '0');
  const filePath = path.join(outputDir, `events-${fileNum}.json`);
  fs.writeFileSync(filePath, chunk.join('\n') + '\n');
  console.log(`Written ${chunk.length} events to events-${fileNum}.json`);
}

console.log(`\nDone! Total: ${totalEvents} events in ${Math.ceil(allLines.length / chunkSize)} files`);
console.log(`Format: newline-delimited JSON (one event per line)`);
console.log(`Output: ${outputDir}/`);
console.log(`\nNext steps on EC2:`);
console.log(`1. aws s3 rm s3://demo-cloudrail-dashboard-logs/ --recursive`);
console.log(`2. aws s3 sync ${outputDir}/ s3://demo-cloudrail-dashboard-logs/data/`);
