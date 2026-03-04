import json
import boto3
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
connect_client = boto3.client('connect')
dynamodb = boto3.resource('dynamodb')

# Configuration
CONNECT_INSTANCE_ID = 'your-connect-instance-id'
OUTBOUND_FLOW_ID = 'your-outbound-flow-id'
CALLBACK_TABLE = 'callback-requests'

def lambda_handler(event, context):
    """
    Lambda function to initiate outbound callback calls
    This function is typically triggered by EventBridge or Step Functions
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract callback ID from the event
        callback_id = event.get('CallbackId')
        
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
                'error': 'Callback not found'
            }
        
        callback_item = response['Item']
        
        # Check if callback is still pending
        if callback_item.get('Status') != 'PENDING':
            logger.warning(f"Callback {callback_id} is not in PENDING status")
            return {
                'statusCode': 400,
                'error': 'Callback not pending'
            }
        
        # Check attempt limits
        attempts = int(callback_item.get('Attempts', 0))
        if attempts >= 3:
            logger.warning(f"Max attempts reached for callback {callback_id}")
            # Mark as abandoned
            table.update_item(
                Key={'CallbackId': callback_id},
                UpdateExpression='SET #status = :status',
                ExpressionAttributeNames={'#status': 'Status'},
                ExpressionAttributeValues={':status': 'ABANDONED'}
            )
            return {
                'statusCode': 400,
                'error': 'Max attempts reached'
            }
        
        # Initiate outbound call using Connect API
        phone_number = callback_item.get('CallbackNumber')
        
        start_outbound_response = connect_client.start_outbound_voice_contact(
            DestinationPhoneNumber=phone_number,
            ContactFlowId=OUTBOUND_FLOW_ID,
            InstanceId=CONNECT_INSTANCE_ID,
            Attributes={
                'CallbackId': callback_id,
                'CallbackNumber': phone_number,
                'CallbackReason': callback_item.get('CallbackReason', 'General Support'),
                'CustomerName': callback_item.get('CustomerName', 'Valued Customer'),
                'OriginalContactId': callback_item.get('OriginalContactId', '')
            }
        )
        
        contact_id = start_outbound_response['ContactId']
        
        # Update callback record with outbound contact ID
        table.update_item(
            Key={'CallbackId': callback_id},
            UpdateExpression='SET OutboundContactId = :contact_id, #status = :status, LastAttemptTime = :time',
            ExpressionAttributeNames={'#status': 'Status'},
            ExpressionAttributeValues={
                ':contact_id': contact_id,
                ':status': 'IN_PROGRESS',
                ':time': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"Initiated outbound call for callback {callback_id}, contact ID: {contact_id}")
        
        return {
            'statusCode': 200,
            'callbackId': callback_id,
            'contactId': contact_id,
            'message': 'Outbound call initiated successfully'
        }
        
    except Exception as e:
        logger.error(f"Error initiating outbound call: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'message': 'Failed to initiate outbound call'
        }