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
    Lambda function to update callback status after completion or failure
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract callback information from Connect contact attributes
        contact_attributes = event.get('Details', {}).get('ContactData', {}).get('Attributes', {})
        callback_id = contact_attributes.get('CallbackId')
        original_contact_id = contact_attributes.get('OriginalContactId')
        
        # Determine status based on the call outcome
        # This would be enhanced based on actual Connect event data
        disconnect_reason = event.get('Details', {}).get('ContactData', {}).get('DisconnectReason')
        
        if disconnect_reason == 'CUSTOMER_DISCONNECT':
            status = 'COMPLETED'
        elif disconnect_reason == 'AGENT_DISCONNECT':
            status = 'COMPLETED'
        else:
            status = 'FAILED'
        
        if not callback_id:
            logger.warning("No CallbackId found in contact attributes")
            return {
                'statusCode': 400,
                'message': 'No CallbackId provided'
            }
        
        # Update callback status in DynamoDB
        table = dynamodb.Table(CALLBACK_TABLE)
        
        update_expression = 'SET #status = :status, CompletionTime = :completion_time'
        expression_values = {
            ':status': status,
            ':completion_time': datetime.utcnow().isoformat()
        }
        
        # Add additional fields based on status
        if status == 'FAILED':
            update_expression += ', NextRetryTime = :retry_time'
            # Schedule retry for 30 minutes later
            retry_time = datetime.utcnow().timestamp() + (30 * 60)
            expression_values[':retry_time'] = datetime.fromtimestamp(retry_time).isoformat()
        
        table.update_item(
            Key={'CallbackId': callback_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames={'#status': 'Status'},
            ExpressionAttributeValues=expression_values
        )
        
        logger.info(f"Updated callback status to {status} for ID: {callback_id}")
        
        # Send notification or trigger additional workflows if needed
        if status == 'FAILED':
            handle_failed_callback(callback_id)
        
        return {
            'statusCode': 200,
            'callbackId': callback_id,
            'status': status,
            'message': f'Callback status updated to {status}'
        }
        
    except Exception as e:
        logger.error(f"Error updating callback status: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to update callback status'
        }


def handle_failed_callback(callback_id):
    """
    Handle failed callback attempts - could trigger retry logic or notifications
    """
    try:
        table = dynamodb.Table(CALLBACK_TABLE)
        
        # Get current callback info
        response = table.get_item(Key={'CallbackId': callback_id})
        
        if 'Item' in response:
            callback_item = response['Item']
            attempts = int(callback_item.get('Attempts', 0))
            
            # If max attempts reached, mark as abandoned
            if attempts >= 3:
                table.update_item(
                    Key={'CallbackId': callback_id},
                    UpdateExpression='SET #status = :status',
                    ExpressionAttributeNames={'#status': 'Status'},
                    ExpressionAttributeValues={':status': 'ABANDONED'}
                )
                logger.info(f"Callback {callback_id} marked as abandoned after {attempts} attempts")
            else:
                logger.info(f"Callback {callback_id} marked for retry (attempt {attempts})")
    
    except Exception as e:
        logger.error(f"Error handling failed callback: {str(e)}")