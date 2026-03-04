#!/bin/bash

# AWS Connect Callback IVR System - Deployment Script
# This script automates the deployment of the callback system

set -e

# Configuration - Update these values for your environment
REGION="us-west-2"
STACK_NAME="connect-callback-system"
CONNECT_INSTANCE_ID="your-connect-instance-id"
CONNECT_INSTANCE_ARN="arn:aws:connect:us-west-2:123456789012:instance/your-instance-id"

echo "🚀 Deploying AWS Connect Callback IVR System..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed (for JSON processing)
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it for JSON processing."
    exit 1
fi

# Validate AWS credentials
echo "🔑 Validating AWS credentials..."
aws sts get-caller-identity > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ AWS credentials validated"
else
    echo "❌ AWS credentials not found or invalid"
    exit 1
fi

# Create Lambda deployment packages
echo "📦 Creating Lambda deployment packages..."
mkdir -p dist

for function in callback-scheduler retrieve-callback-info update-callback-status initiate-outbound-call; do
    echo "  Packaging $function..."
    cd lambda-functions
    zip -q "../dist/${function}.zip" "${function}.py"
    cd ..
done

echo "✅ Lambda packages created"

# Deploy CloudFormation stack
echo "☁️  Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file cloudformation-template.json \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        ConnectInstanceId=$CONNECT_INSTANCE_ID \
        ConnectInstanceArn=$CONNECT_INSTANCE_ARN \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack deployed successfully"
else
    echo "❌ CloudFormation stack deployment failed"
    exit 1
fi

# Get Lambda function ARNs from CloudFormation outputs
echo "📋 Retrieving Lambda function ARNs..."
CALLBACK_SCHEDULER_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`CallbackSchedulerFunctionArn`].OutputValue' \
    --output text \
    --region $REGION)

RETRIEVE_INFO_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`RetrieveCallbackInfoFunctionArn`].OutputValue' \
    --output text \
    --region $REGION)

UPDATE_STATUS_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`UpdateCallbackStatusFunctionArn`].OutputValue' \
    --output text \
    --region $REGION)

INITIATE_CALL_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`InitiateOutboundCallFunctionArn`].OutputValue' \
    --output text \
    --region $REGION)

# Update Lambda function code
echo "🔄 Updating Lambda function code..."
for function in callback-scheduler retrieve-callback-info update-callback-status initiate-outbound-call; do
    echo "  Updating $function..."
    
    # Convert function name to proper case for AWS function naming
    case $function in
        "callback-scheduler")
            aws_function_name="CallbackScheduler"
            ;;
        "retrieve-callback-info")
            aws_function_name="RetrieveCallbackInfo"
            ;;
        "update-callback-status")
            aws_function_name="UpdateCallbackStatus"
            ;;
        "initiate-outbound-call")
            aws_function_name="InitiateOutboundCall"
            ;;
    esac
    
    aws lambda update-function-code \
        --function-name $aws_function_name \
        --zip-file "fileb://dist/${function}.zip" \
        --region $REGION > /dev/null
done

echo "✅ Lambda functions updated"

# Update Connect flow configurations with actual ARNs
echo "🔧 Updating Connect flow configurations..."

# Update inbound flow
cp inbound-call-flow.json dist/inbound-call-flow-updated.json
sed -i.bak "s|arn:aws:lambda:us-west-2:123456789012:function:CallbackScheduler|$CALLBACK_SCHEDULER_ARN|g" dist/inbound-call-flow-updated.json

# Update outbound flow
cp outbound-callback-flow.json dist/outbound-callback-flow-updated.json
sed -i.bak "s|arn:aws:lambda:us-west-2:123456789012:function:RetrieveCallbackInfo|$RETRIEVE_INFO_ARN|g" dist/outbound-callback-flow-updated.json
sed -i.bak "s|arn:aws:lambda:us-west-2:123456789012:function:UpdateCallbackStatus|$UPDATE_STATUS_ARN|g" dist/outbound-callback-flow-updated.json

echo "✅ Connect flow configurations updated"

# Display deployment summary
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Stack Name: $STACK_NAME"
echo "  - Region: $REGION"
echo "  - DynamoDB Table: callback-requests"
echo ""
echo "🔗 Lambda Function ARNs:"
echo "  - Callback Scheduler: $CALLBACK_SCHEDULER_ARN"
echo "  - Retrieve Callback Info: $RETRIEVE_INFO_ARN"
echo "  - Update Callback Status: $UPDATE_STATUS_ARN"
echo "  - Initiate Outbound Call: $INITIATE_CALL_ARN"
echo ""
echo "📁 Updated flow files:"
echo "  - dist/inbound-call-flow-updated.json"
echo "  - dist/outbound-callback-flow-updated.json"
echo ""
echo "⚠️  Next Steps:"
echo "  1. Import the updated flow files into your AWS Connect instance"
echo "  2. Update queue ARNs and hours of operation ARNs in the flows"
echo "  3. Test the flows with your Connect instance"
echo "  4. Configure phone numbers to use the inbound flow"
echo ""
echo "📚 For detailed instructions, see README.md"