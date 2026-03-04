`# AWS Connect Callback IVR System

This repository contains the complete implementation of an AWS Connect Interactive Voice Response (IVR) system with callback functionality, based on the provided flowchart requirements.

## Architecture Overview

The system consists of two main contact flows:

1. **Inbound Call Flow** - Handles incoming customer calls and callback requests
2. **Outbound Callback Flow** - Manages the callback process to customers

## Components

### Contact Flows

#### 1. Inbound Call Flow (`inbound-call-flow.json`)
- **Business Hours Check**: Validates if the call is within operating hours
- **Menu Options**: Provides customers with three choices:
  - Press 1: Request a callback
  - Press 2: Wait in queue for an agent
  - Press 3: Leave a voicemail
- **Callback Scheduling**: Captures customer information and schedules a callback
- **Queue Management**: Handles queue overflow and agent availability

#### 2. Outbound Callback Flow (`outbound-callback-flow.json`)
- **Customer Greeting**: Personalized message for callback recipients
- **Agent Connection**: Routes the call to available agents
- **Status Tracking**: Updates callback status based on call outcome

### Lambda Functions

#### 1. Callback Scheduler (`callback-scheduler.py`)
**Purpose**: Processes callback requests from the inbound flow
- Stores callback requests in DynamoDB
- Generates unique callback IDs
- Schedules callbacks for the next available time slot

#### 2. Retrieve Callback Info (`retrieve-callback-info.py`)
**Purpose**: Fetches callback details for outbound calls
- Retrieves customer information from DynamoDB
- Updates attempt counters
- Validates callback eligibility

#### 3. Update Callback Status (`update-callback-status.py`)
**Purpose**: Tracks callback completion and failure handling
- Updates callback status (COMPLETED, FAILED, ABANDONED)
- Implements retry logic for failed attempts
- Manages maximum attempt limits

#### 4. Initiate Outbound Call (`initiate-outbound-call.py`)
**Purpose**: Triggers outbound callback calls
- Uses Connect API to start outbound calls
- Passes customer context to the outbound flow
- Handles call initiation failures

## Database Schema

### DynamoDB Table: `callback-requests`

```json
{
  "CallbackId": "string (Primary Key)",
  "OriginalContactId": "string",
  "CallbackNumber": "string",
  "RequestTime": "ISO 8601 timestamp",
  "ScheduledTime": "ISO 8601 timestamp",
  "Status": "PENDING | IN_PROGRESS | COMPLETED | FAILED | ABANDONED",
  "Attempts": "number",
  "CallbackReason": "string",
  "CustomerName": "string",
  "CompletionTime": "ISO 8601 timestamp",
  "LastAttemptTime": "ISO 8601 timestamp",
  "NextRetryTime": "ISO 8601 timestamp",
  "OutboundContactId": "string"
}
```

## Installation & Deployment

### Prerequisites

- AWS Connect instance configured
- DynamoDB table created
- Lambda functions deployed
- IAM roles and permissions configured

### Step 1: Create DynamoDB Table

```bash
aws dynamodb create-table \
    --table-name callback-requests \
    --attribute-definitions \
        AttributeName=CallbackId,AttributeType=S \
    --key-schema \
        AttributeName=CallbackId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
```

### Step 2: Deploy Lambda Functions

1. Package each Lambda function:
   ```bash
   cd lambda-functions
   zip callback-scheduler.zip callback-scheduler.py
   zip retrieve-callback-info.zip retrieve-callback-info.py
   zip update-callback-status.zip update-callback-status.py
   zip initiate-outbound-call.zip initiate-outbound-call.py
   ```

2. Deploy using AWS CLI or console:
   ```bash
   aws lambda create-function \
       --function-name CallbackScheduler \
       --runtime python3.9 \
       --role arn:aws:iam::your-account:role/lambda-execution-role \
       --handler callback-scheduler.lambda_handler \
       --zip-file fileb://callback-scheduler.zip
   ```

### Step 3: Configure Connect Flows

1. Import the contact flows into your Connect instance
2. Update ARNs in the flow JSON files:
   - Lambda function ARNs
   - Queue ARNs
   - Hours of operation ARNs
   - Connect instance ID

### Step 4: Set Up Scheduling (Optional)

For automated callback scheduling, configure:
- EventBridge rules for timing
- Step Functions for complex workflows
- SQS for queuing callback requests

## Configuration

### Required Environment Variables for Lambda Functions

```bash
CONNECT_INSTANCE_ID=your-connect-instance-id
CALLBACK_TABLE=callback-requests
OUTBOUND_FLOW_ID=your-outbound-flow-id
```

### IAM Permissions

Lambda functions require the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:region:account:table/callback-requests"
        },
        {
            "Effect": "Allow",
            "Action": [
                "connect:StartOutboundVoiceContact",
                "connect:DescribeContactFlow"
            ],
            "Resource": "*"
        }
    ]
}
```

## Usage

### Customer Experience

1. **Inbound Call**: Customer dials the Connect number
2. **Business Hours Check**: System verifies operating hours
3. **Menu Selection**: Customer chooses from available options
4. **Callback Request**: If callback selected, customer information is captured
5. **Confirmation**: Customer receives confirmation of callback scheduling
6. **Outbound Callback**: System calls customer back at scheduled time

### Agent Experience

1. **Callback Queue**: Agents receive callback-originated calls in dedicated queue
2. **Customer Context**: Full customer information available in agent workspace
3. **Call Handling**: Standard call handling procedures apply

## Monitoring & Analytics

### Key Metrics

- Callback request volume
- Callback success rate
- Average callback response time
- Queue overflow incidents
- Customer satisfaction scores

### CloudWatch Logs

Each Lambda function logs to CloudWatch for monitoring:
- Callback scheduling events
- Outbound call initiation
- Status updates and failures

## Troubleshooting

### Common Issues

1. **Failed Callbacks**
   - Check customer phone number validity
   - Verify Lambda function permissions
   - Review Connect instance configuration

2. **DynamoDB Errors**
   - Confirm table exists and is accessible
   - Check IAM permissions
   - Monitor table capacity

3. **Flow Execution Errors**
   - Validate flow JSON syntax
   - Ensure all ARNs are correct
   - Check Connect service limits

## Security Considerations

- Customer phone numbers are stored securely in DynamoDB
- Lambda functions use least-privilege IAM roles
- Contact flows implement proper error handling
- All customer data handling complies with privacy regulations

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review Connect contact flow execution logs
3. Validate DynamoDB table access and data integrity
4. Contact system administrator for configuration issues