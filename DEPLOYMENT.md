# Quick Deployment Guide

## Prerequisites

1. **AWS Account Setup**
   - AWS Account with appropriate permissions
   - AWS CLI configured with credentials
   - Terraform or CloudFormation CLI tools

2. **Required Permissions**
   - Administrative access or specific IAM permissions for:
     - Amazon Connect, IoT Core, DynamoDB, Lambda, S3, KMS, VPC

## Deployment Steps

### Step 1: Deploy Core Infrastructure

```bash
# Using CloudFormation
aws cloudformation create-stack \
  --stack-name enterprise-connect-infrastructure \
  --template-body file://cloudformation/core-infrastructure.yaml \
  --parameters ParameterKey=EnvironmentName,ParameterValue=production \
  --capabilities CAPABILITY_IAM

# Wait for completion
aws cloudformation wait stack-create-complete \
  --stack-name enterprise-connect-infrastructure
```

### Step 2: Deploy Lambda Functions

```bash
# Package and deploy security alert processor
cd lambda-functions/security-alert-processor
zip -r security-alert-processor.zip .
aws lambda create-function \
  --function-name security-alert-processor \
  --runtime python3.9 \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://security-alert-processor.zip

# Deploy device context enricher
cd ../device-context-enricher
zip -r device-context-enricher.zip .
aws lambda create-function \
  --function-name device-context-enricher \
  --runtime python3.9 \
  --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://device-context-enricher.zip
```

### Step 3: Configure Amazon Connect

1. **Create Connect Instance**
   ```bash
   aws connect create-instance \
     --identity-management-type CONNECT_MANAGED \
     --instance-alias enterprise-security-connect \
     --inbound-calls-enabled \
     --outbound-calls-enabled
   ```

2. **Import Contact Flows**
   - Use the Connect admin console to import contact flows from `/contact-flows/`
   - Configure routing profiles and queues

### Step 4: Setup IoT Core

```bash
# Create IoT policy for devices
aws iot create-policy \
  --policy-name SecurityDevicePolicy \
  --policy-document file://iot-policies/device-policy.json

# Create device certificates (repeat for each device)
aws iot create-keys-and-certificate \
  --set-as-active \
  --certificate-pem-outfile device-cert.pem \
  --public-key-outfile device-public.key \
  --private-key-outfile device-private.key
```

## Configuration

### Environment Variables

Set the following environment variables for Lambda functions:

```bash
CONNECT_INSTANCE_ID=arn:aws:connect:region:account:instance/instance-id
CONNECT_CONTACT_FLOW_ID=arn:aws:connect:region:account:instance/instance-id/contact-flow/flow-id
DEVICE_REGISTRY_TABLE=production-device-registry
CUSTOMER_PROFILES_TABLE=production-customer-profiles
SECURITY_INCIDENTS_TABLE=production-security-incidents
CRITICAL_ALERTS_SNS_TOPIC=arn:aws:sns:region:account:critical-alerts
```

## Testing

### Test Device Connection

```python
# Test IoT device connection
import boto3
import json

iot_client = boto3.client('iot-data')

# Publish test alert
test_alert = {
    "device_id": "test-camera-001",
    "alert_type": "MOTION_DETECTED",
    "severity": "MEDIUM",
    "location": "Building A, Floor 2",
    "timestamp": "2024-03-03T10:30:00Z"
}

iot_client.publish(
    topic='topic/security/alerts',
    payload=json.dumps(test_alert)
)
```

### Test Connect Integration

1. Call the Connect instance phone number
2. Test contact flows and routing
3. Verify agent workspace functionality

## Monitoring Setup

Access monitoring dashboards at:
- CloudWatch: `https://console.aws.amazon.com/cloudwatch/`
- Connect metrics: Connect admin console > Analytics
- Custom dashboards: `/monitoring/dashboards/`

## Troubleshooting

### Common Issues

1. **Lambda timeout errors**
   - Increase timeout in Lambda configuration
   - Check VPC endpoint connectivity

2. **Device connection issues**
   - Verify certificates and policies
   - Check VPC endpoint configuration

3. **Connect routing problems**
   - Verify contact flow configuration
   - Check queue assignments and agent availability

### Support Resources

- Architecture documentation: `/docs/`
- AWS Support for enterprise accounts
- Community forums and AWS documentation

## Security Considerations

1. **Rotate credentials regularly**
2. **Monitor CloudTrail logs**
3. **Enable GuardDuty**
4. **Regular security assessments**

## Cost Management

- Enable AWS Cost Explorer
- Set up billing alerts
- Use resource tagging for cost allocation
- Review and optimize regularly

For detailed documentation, see `/docs/architecture-overview.md`