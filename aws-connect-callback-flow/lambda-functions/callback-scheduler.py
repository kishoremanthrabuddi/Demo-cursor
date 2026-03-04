import json
import boto3
import uuid
from datetime import datetime, timedelta
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
connect_client = boto3.client('connect')

# DynamoDB table for callback requests
CALLBACK_TABLE = 'callback-requests'

def lambda_handler(event, context):
    """
    Lambda function to handle callback scheduling requests from AWS Connect
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract contact attributes from Connect event
        contact_id = event.get('Details', {}).get('ContactData', {}).get('ContactId')
        customer_endpoint = event.get('Details', {}).get('ContactData', {}).get('CustomerEndpoint', {})
        phone_number = customer_endpoint.get('Address', '')
        
        # Get current timestamp
        current_time = datetime.utcnow()
        callback_time = current_time + timedelta(hours=1)  # Schedule callback in 1 hour
        
        # Generate unique callback ID
        callback_id = str(uuid.uuid4())
        
        # Store callback request in DynamoDB
        table = dynamodb.Table(CALLBACK_TABLE)
        
        callback_item = {
            'CallbackId': callback_id,
            'OriginalContactId': contact_id,
            'CallbackNumber': phone_number,
            'RequestTime': current_time.isoformat(),
            'ScheduledTime': callback_time.isoformat(),
            'Status': 'PENDING',
            'Attempts': 0,
            'CallbackReason': 'General Support',
            'CustomerName': 'Valued Customer'
        }
        
        table.put_item(Item=callback_item)
        
        logger.info(f"Callback scheduled with ID: {callback_id}")
        
        # Schedule the outbound callback task (this would typically trigger a separate process)
        # For this example, we'll return success
        
        return {
            'statusCode': 200,
            'callbackId': callback_id,
            'scheduledTime': callback_time.isoformat(),
            'message': 'Callback successfully scheduled'
        }
        
    except Exception as e:
        logger.error(f"Error scheduling callback: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to schedule callback'
        }


def create_callback_task(callback_id, phone_number, scheduled_time):
    """
    Create a scheduled task for the outbound callback
    This could integrate with AWS Step Functions, EventBridge, or SQS
    """
    # Implementation would depend on your scheduling mechanism
    pass