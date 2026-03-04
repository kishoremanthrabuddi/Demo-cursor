import json
import boto3
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')

# DynamoDB table for callback requests
CALLBACK_TABLE = 'callback-requests'

def lambda_handler(event, context):
    """
    Lambda function to retrieve callback information for outbound calls
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract callback ID from the event (passed from Connect or scheduling system)
        callback_id = event.get('Details', {}).get('Parameters', {}).get('CallbackId')
        
        if not callback_id:
            raise ValueError("CallbackId not provided in event")
        
        # Retrieve callback information from DynamoDB
        table = dynamodb.Table(CALLBACK_TABLE)
        
        response = table.get_item(
            Key={'CallbackId': callback_id}
        )
        
        if 'Item' not in response:
            logger.error(f"Callback not found for ID: {callback_id}")
            return {
                'statusCode': 404,
                'error': 'Callback not found',
                'message': f'No callback found with ID: {callback_id}'
            }
        
        callback_item = response['Item']
        
        # Check if callback is still valid and not already completed
        if callback_item.get('Status') == 'COMPLETED':
            logger.warning(f"Callback already completed: {callback_id}")
            return {
                'statusCode': 400,
                'error': 'Callback already completed',
                'message': 'This callback has already been completed'
            }
        
        # Update attempt count
        current_attempts = int(callback_item.get('Attempts', 0))
        new_attempts = current_attempts + 1
        
        table.update_item(
            Key={'CallbackId': callback_id},
            UpdateExpression='SET Attempts = :attempts, LastAttemptTime = :time',
            ExpressionAttributeValues={
                ':attempts': new_attempts,
                ':time': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"Retrieved callback info for ID: {callback_id}")
        
        return {
            'statusCode': 200,
            'CallbackNumber': callback_item.get('CallbackNumber'),
            'CallbackReason': callback_item.get('CallbackReason', 'General Support'),
            'CustomerName': callback_item.get('CustomerName', 'Valued Customer'),
            'OriginalContactId': callback_item.get('OriginalContactId'),
            'RequestTime': callback_item.get('RequestTime'),
            'Attempts': new_attempts,
            'message': 'Callback information retrieved successfully'
        }
        
    except Exception as e:
        logger.error(f"Error retrieving callback info: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to retrieve callback information'
        }