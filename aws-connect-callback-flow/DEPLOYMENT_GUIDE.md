# Project Structure

```
aws-connect-callback-flow/
├── README.md                           # Main documentation
├── inbound-call-flow.json             # AWS Connect inbound flow configuration
├── outbound-callback-flow.json        # AWS Connect outbound flow configuration
├── cloudformation-template.json       # Infrastructure as Code template
├── deploy.sh                          # Automated deployment script
├── lambda-functions/                  # Lambda function source code
│   ├── callback-scheduler.py         # Handles callback requests
│   ├── retrieve-callback-info.py     # Fetches callback details
│   ├── update-callback-status.py     # Updates callback status
│   └── initiate-outbound-call.py     # Triggers outbound calls
└── dist/                             # Generated deployment artifacts
    ├── *.zip                        # Lambda deployment packages
    ├── inbound-call-flow-updated.json  # Flow with updated ARNs
    └── outbound-callback-flow-updated.json # Flow with updated ARNs
```

# Quick Start Guide

## 1. Prerequisites Setup
- AWS Account with Connect service enabled
- AWS CLI configured with appropriate permissions
- jq utility installed for JSON processing

## 2. Configuration
Update the following values in `deploy.sh`:
```bash
CONNECT_INSTANCE_ID="your-actual-instance-id"
CONNECT_INSTANCE_ARN="arn:aws:connect:region:account:instance/your-instance-id"
REGION="your-preferred-region"
```

## 3. Deployment
```bash
./deploy.sh
```

## 4. Connect Configuration
1. Import the generated flow files from `dist/` folder
2. Update queue and hours of operation ARNs
3. Assign phone numbers to the inbound flow
4. Test the complete flow

## 5. Verification
- Test inbound calls during business hours
- Verify callback scheduling functionality
- Monitor Lambda function logs in CloudWatch
- Check DynamoDB for callback records

# System Flow

## Inbound Call Process
1. Customer calls → Business hours check
2. Menu options presented (Callback/Queue/Voicemail)
3. Callback option → Lambda stores request → Confirmation
4. Queue option → Transfer to agents
5. Voicemail option → Message recording

## Outbound Callback Process
1. Scheduled callback triggered
2. Lambda retrieves customer info
3. Connect initiates outbound call
4. Customer greeting and agent connection
5. Status update and completion tracking

# Monitoring

## Key Metrics to Monitor
- Callback request volume
- Success/failure rates
- Customer wait times
- Agent availability
- System errors and retries

## CloudWatch Dashboards
Create dashboards for:
- Lambda function performance
- DynamoDB table metrics
- Connect contact flow execution
- Error rates and patterns

# Support

For technical issues:
1. Check CloudWatch logs
2. Verify DynamoDB data integrity
3. Review Connect flow execution logs
4. Validate IAM permissions