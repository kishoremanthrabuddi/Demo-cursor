"""
AWS Connect Enterprise Security - Security Alert Processor
Lambda function to process IoT security device alerts and create Connect tasks
"""

import json
import boto3
import os
import logging
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
connect_client = boto3.client('connect')
dynamodb = boto3.resource('dynamodb')
iot_client = boto3.client('iot')
sns_client = boto3.client('sns')

# Environment variables
CONNECT_INSTANCE_ID = os.environ['CONNECT_INSTANCE_ID']
CONNECT_CONTACT_FLOW_ID = os.environ['CONNECT_CONTACT_FLOW_ID']
DEVICE_REGISTRY_TABLE = os.environ['DEVICE_REGISTRY_TABLE']
CUSTOMER_PROFILES_TABLE = os.environ['CUSTOMER_PROFILES_TABLE']
SECURITY_INCIDENTS_TABLE = os.environ['SECURITY_INCIDENTS_TABLE']
CRITICAL_ALERTS_SNS_TOPIC = os.environ['CRITICAL_ALERTS_SNS_TOPIC']

# DynamoDB tables
device_table = dynamodb.Table(DEVICE_REGISTRY_TABLE)
customer_table = dynamodb.Table(CUSTOMER_PROFILES_TABLE)
incidents_table = dynamodb.Table(SECURITY_INCIDENTS_TABLE)

def lambda_handler(event, context):
    """
    Main Lambda handler for processing security device alerts
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Parse the IoT message
        alert_data = parse_alert_data(event)
        
        # Validate alert data
        if not validate_alert_data(alert_data):
            logger.error("Invalid alert data received")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid alert data'})
            }
        
        # Get device and customer information
        device_info = get_device_info(alert_data['device_id'])
        customer_info = get_customer_info(device_info.get('customer_id')) if device_info else {}
        
        # Classify alert severity and determine response
        alert_classification = classify_alert(alert_data, device_info, customer_info)
        
        # Store incident in database
        incident_id = store_security_incident(alert_data, alert_classification, device_info, customer_info)
        
        # Execute response based on severity
        response_result = execute_alert_response(
            alert_data, 
            alert_classification, 
            device_info, 
            customer_info, 
            incident_id
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'incident_id': incident_id,
                'alert_classification': alert_classification,
                'response_executed': response_result
            })
        }
        
    except Exception as e:
        logger.error(f"Error processing alert: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def parse_alert_data(event):
    """
    Parse alert data from IoT Rules Engine event
    """
    try:
        # Handle different event sources
        if 'Records' in event:
            # SNS trigger
            message = json.loads(event['Records'][0]['Sns']['Message'])
        else:
            # Direct IoT Rules Engine trigger
            message = event
            
        alert_data = {
            'device_id': message.get('device_id'),
            'alert_type': message.get('alert_type'),
            'severity': message.get('severity'),
            'timestamp': message.get('timestamp', datetime.utcnow().isoformat()),
            'location': message.get('location'),
            'description': message.get('description'),
            'device_type': message.get('device_type'),
            'raw_data': message
        }
        
        return alert_data
        
    except Exception as e:
        logger.error(f"Error parsing alert data: {str(e)}")
        raise

def validate_alert_data(alert_data):
    """
    Validate required alert data fields
    """
    required_fields = ['device_id', 'alert_type', 'severity']
    return all(field in alert_data and alert_data[field] for field in required_fields)

def get_device_info(device_id):
    """
    Retrieve device information from DynamoDB
    """
    try:
        response = device_table.get_item(Key={'device_id': device_id})
        return response.get('Item', {})
    except Exception as e:
        logger.error(f"Error getting device info for {device_id}: {str(e)}")
        return {}

def get_customer_info(customer_id):
    """
    Retrieve customer information from DynamoDB
    """
    if not customer_id:
        return {}
        
    try:
        response = customer_table.get_item(Key={'customer_id': customer_id})
        return response.get('Item', {})
    except Exception as e:
        logger.error(f"Error getting customer info for {customer_id}: {str(e)}")
        return {}

def classify_alert(alert_data, device_info, customer_info):
    """
    Classify alert severity and determine response priority
    """
    base_severity = alert_data.get('severity', 'MEDIUM')
    alert_type = alert_data.get('alert_type', '').upper()
    device_type = device_info.get('device_type', '').upper()
    customer_tier = customer_info.get('support_tier', 'STANDARD').upper()
    
    # Define severity escalation rules
    severity_matrix = {
        'CRITICAL': {
            'priority': 1,
            'response_time': 30,  # seconds
            'connect_queue': 'emergency-security',
            'escalation': 'immediate'
        },
        'HIGH': {
            'priority': 2,
            'response_time': 120,  # seconds
            'connect_queue': 'priority-security', 
            'escalation': 'priority'
        },
        'MEDIUM': {
            'priority': 3,
            'response_time': 300,  # seconds
            'connect_queue': 'standard-security',
            'escalation': 'standard'
        },
        'LOW': {
            'priority': 4,
            'response_time': 3600,  # seconds
            'connect_queue': 'maintenance',
            'escalation': 'scheduled'
        }
    }
    
    # Escalate based on alert type
    critical_alert_types = [
        'SECURITY_BREACH', 'UNAUTHORIZED_ACCESS', 'FIRE_ALARM',
        'INTRUSION_DETECTED', 'EMERGENCY_BUTTON', 'SYSTEM_COMPROMISE'
    ]
    
    high_alert_types = [
        'DOOR_FORCED_OPEN', 'CAMERA_MALFUNCTION', 'NETWORK_INTRUSION',
        'REPEATED_ACCESS_DENIED', 'DEVICE_TAMPERED'
    ]
    
    if alert_type in critical_alert_types:
        base_severity = 'CRITICAL'
    elif alert_type in high_alert_types and base_severity not in ['CRITICAL']:
        base_severity = 'HIGH'
    
    # Escalate based on device type
    critical_device_types = [
        'FIRE_SAFETY', 'ACCESS_CONTROL', 'SECURITY_CAMERA',
        'INTRUSION_DETECTION', 'EMERGENCY_SYSTEM'
    ]
    
    if device_type in critical_device_types and base_severity == 'LOW':
        base_severity = 'MEDIUM'
    
    # Escalate based on customer tier
    if customer_tier == 'PREMIUM' and base_severity in ['MEDIUM', 'LOW']:
        # Escalate premium customers by one level
        if base_severity == 'MEDIUM':
            base_severity = 'HIGH'
        elif base_severity == 'LOW':
            base_severity = 'MEDIUM'
    
    classification = severity_matrix.get(base_severity, severity_matrix['MEDIUM'])
    classification['final_severity'] = base_severity
    classification['original_severity'] = alert_data.get('severity', 'MEDIUM')
    classification['escalation_reasons'] = []
    
    if classification['final_severity'] != classification['original_severity']:
        classification['escalation_reasons'].append(f"Severity escalated from {classification['original_severity']} to {base_severity}")
    
    return classification

def store_security_incident(alert_data, classification, device_info, customer_info):
    """
    Store security incident in DynamoDB
    """
    incident_id = str(uuid.uuid4())
    timestamp = int(datetime.utcnow().timestamp())
    
    # TTL for incident records (1 year)
    ttl = int((datetime.utcnow() + timedelta(days=365)).timestamp())
    
    incident_item = {
        'incident_id': incident_id,
        'device_id': alert_data['device_id'],
        'customer_id': device_info.get('customer_id', ''),
        'alert_type': alert_data['alert_type'],
        'severity': classification['final_severity'],
        'original_severity': classification['original_severity'],
        'priority': classification['priority'],
        'status': 'OPEN',
        'timestamp': timestamp,
        'created_at': datetime.utcnow().isoformat(),
        'location': alert_data.get('location', ''),
        'description': alert_data.get('description', ''),
        'device_type': device_info.get('device_type', ''),
        'customer_name': customer_info.get('company_name', ''),
        'escalation_reasons': classification.get('escalation_reasons', []),
        'response_time_target': classification['response_time'],
        'raw_alert_data': json.loads(json.dumps(alert_data['raw_data'], default=str)),
        'ttl': ttl
    }
    
    try:
        incidents_table.put_item(Item=incident_item)
        logger.info(f"Stored incident {incident_id} for device {alert_data['device_id']}")
        return incident_id
    except Exception as e:
        logger.error(f"Error storing incident: {str(e)}")
        raise

def execute_alert_response(alert_data, classification, device_info, customer_info, incident_id):
    """
    Execute appropriate response based on alert severity
    """
    responses_executed = []
    
    try:
        # Always create Connect task for human review
        connect_response = create_connect_task(
            alert_data, classification, device_info, customer_info, incident_id
        )
        responses_executed.append(f"Connect task created: {connect_response.get('contact_id', 'unknown')}")
        
        # Send SNS notification for high severity alerts
        if classification['final_severity'] in ['CRITICAL', 'HIGH']:
            sns_response = send_critical_alert_notification(
                alert_data, classification, device_info, customer_info, incident_id
            )
            responses_executed.append(f"SNS notification sent: {sns_response}")
        
        # Execute automated device responses for critical alerts
        if classification['final_severity'] == 'CRITICAL':
            device_response = execute_automated_device_response(alert_data, device_info)
            responses_executed.append(f"Automated device response: {device_response}")
        
        return responses_executed
        
    except Exception as e:
        logger.error(f"Error executing alert response: {str(e)}")
        return [f"Error: {str(e)}"]

def create_connect_task(alert_data, classification, device_info, customer_info, incident_id):
    """
    Create Amazon Connect task for human agent handling
    """
    try:
        # Prepare customer context
        customer_context = {
            'device_id': alert_data['device_id'],
            'device_type': device_info.get('device_type', 'Unknown'),
            'device_location': device_info.get('installation_address', alert_data.get('location', 'Unknown')),
            'customer_name': customer_info.get('company_name', 'Unknown'),
            'customer_id': customer_info.get('customer_id', ''),
            'support_tier': customer_info.get('support_tier', 'STANDARD'),
            'primary_contact': customer_info.get('primary_phone', ''),
            'incident_id': incident_id,
            'alert_type': alert_data['alert_type'],
            'severity': classification['final_severity'],
            'timestamp': alert_data['timestamp'],
            'description': alert_data.get('description', ''),
            'escalation_contacts': customer_info.get('escalation_contacts', []),
            'service_hours': customer_info.get('service_hours', '24/7')
        }
        
        task_name = f"Security Alert: {alert_data['alert_type']} - {device_info.get('device_type', 'Device')} ({classification['final_severity']})"
        
        response = connect_client.start_task_contact(
            InstanceId=CONNECT_INSTANCE_ID,
            ContactFlowId=CONNECT_CONTACT_FLOW_ID,
            Name=task_name,
            Description=f"Automated security incident from device {alert_data['device_id']} - {alert_data.get('description', 'No description')}",
            TaskTemplateId=get_task_template_id(classification['final_severity']),
            Attributes={
                'DeviceId': alert_data['device_id'],
                'AlertType': alert_data['alert_type'],
                'Severity': classification['final_severity'],
                'Priority': str(classification['priority']),
                'IncidentId': incident_id,
                'CustomerContext': json.dumps(customer_context),
                'Queue': classification['connect_queue'],
                'ResponseTimeTarget': str(classification['response_time'])
            }
        )
        
        logger.info(f"Created Connect task {response['ContactId']} for incident {incident_id}")
        return response
        
    except Exception as e:
        logger.error(f"Error creating Connect task: {str(e)}")
        raise

def get_task_template_id(severity):
    """
    Get appropriate task template ID based on severity
    """
    template_mapping = {
        'CRITICAL': os.environ.get('CRITICAL_TASK_TEMPLATE_ID', ''),
        'HIGH': os.environ.get('HIGH_TASK_TEMPLATE_ID', ''),
        'MEDIUM': os.environ.get('MEDIUM_TASK_TEMPLATE_ID', ''),
        'LOW': os.environ.get('LOW_TASK_TEMPLATE_ID', '')
    }
    return template_mapping.get(severity, '')

def send_critical_alert_notification(alert_data, classification, device_info, customer_info, incident_id):
    """
    Send SNS notification for critical/high severity alerts
    """
    try:
        message = {
            'incident_id': incident_id,
            'device_id': alert_data['device_id'],
            'alert_type': alert_data['alert_type'],
            'severity': classification['final_severity'],
            'customer': customer_info.get('company_name', 'Unknown'),
            'location': alert_data.get('location', device_info.get('installation_address', 'Unknown')),
            'description': alert_data.get('description', ''),
            'timestamp': alert_data['timestamp']
        }
        
        subject = f"SECURITY ALERT [{classification['final_severity']}]: {alert_data['alert_type']} - {customer_info.get('company_name', alert_data['device_id'])}"
        
        response = sns_client.publish(
            TopicArn=CRITICAL_ALERTS_SNS_TOPIC,
            Subject=subject,
            Message=json.dumps(message, indent=2)
        )
        
        logger.info(f"Sent SNS notification for incident {incident_id}")
        return response['MessageId']
        
    except Exception as e:
        logger.error(f"Error sending SNS notification: {str(e)}")
        raise

def execute_automated_device_response(alert_data, device_info):
    """
    Execute automated device responses for critical alerts
    """
    try:
        responses = []
        device_id = alert_data['device_id']
        alert_type = alert_data['alert_type']
        
        # Define automated responses based on alert type
        if alert_type == 'SECURITY_BREACH':
            # Lock down access control systems
            if device_info.get('device_type') == 'ACCESS_CONTROL':
                iot_response = iot_client.update_thing_shadow(
                    thingName=device_id,
                    payload=json.dumps({
                        'state': {
                            'desired': {
                                'lock_mode': 'EMERGENCY_LOCK',
                                'access_level': 'ADMIN_ONLY'
                            }
                        }
                    })
                )
                responses.append('Emergency lock activated')
        
        elif alert_type == 'FIRE_ALARM':
            # Unlock emergency exits
            if device_info.get('device_type') == 'ACCESS_CONTROL':
                iot_response = iot_client.update_thing_shadow(
                    thingName=device_id,
                    payload=json.dumps({
                        'state': {
                            'desired': {
                                'emergency_mode': True,
                                'unlock_all_exits': True
                            }
                        }
                    })
                )
                responses.append('Emergency exits unlocked')
        
        elif alert_type == 'INTRUSION_DETECTED':
            # Activate recording on security cameras
            if device_info.get('device_type') == 'SECURITY_CAMERA':
                iot_response = iot_client.update_thing_shadow(
                    thingName=device_id,
                    payload=json.dumps({
                        'state': {
                            'desired': {
                                'recording_mode': 'HIGH_ALERT',
                                'motion_sensitivity': 'HIGH'
                            }
                        }
                    })
                )
                responses.append('High alert recording activated')
        
        return responses
        
    except Exception as e:
        logger.error(f"Error executing automated device response: {str(e)}")
        return [f"Error: {str(e)}"]