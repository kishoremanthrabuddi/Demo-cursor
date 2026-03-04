"""
Device Context Enricher Lambda Function
Enriches customer and device context for Amazon Connect agents
"""

import json
import boto3
import os
import logging
from datetime import datetime, timedelta
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
iot_client = boto3.client('iot')
s3_client = boto3.client('s3')

# Environment variables
DEVICE_REGISTRY_TABLE = os.environ['DEVICE_REGISTRY_TABLE']
CUSTOMER_PROFILES_TABLE = os.environ['CUSTOMER_PROFILES_TABLE'] 
SECURITY_INCIDENTS_TABLE = os.environ['SECURITY_INCIDENTS_TABLE']

# DynamoDB tables
device_table = dynamodb.Table(DEVICE_REGISTRY_TABLE)
customer_table = dynamodb.Table(CUSTOMER_PROFILES_TABLE)
incidents_table = dynamodb.Table(SECURITY_INCIDENTS_TABLE)

def lambda_handler(event, context):
    """
    Main handler for enriching device and customer context
    """
    try:
        logger.info(f"Context enrichment request: {json.dumps(event)}")
        
        # Parse request
        request_type = event.get('requestType', 'device_context')
        device_id = event.get('deviceId')
        customer_id = event.get('customerId')
        
        if request_type == 'device_context' and device_id:
            return get_device_context(device_id)
        elif request_type == 'customer_context' and customer_id:
            return get_customer_context(customer_id)
        elif request_type == 'incident_history' and (device_id or customer_id):
            return get_incident_history(device_id, customer_id)
        elif request_type == 'device_status' and device_id:
            return get_real_time_device_status(device_id)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid request parameters'})
            }
            
    except Exception as e:
        logger.error(f"Error in context enrichment: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def get_device_context(device_id):
    """
    Get comprehensive device context including device info, customer, and recent activity
    """
    try:
        # Get device information
        device_response = device_table.get_item(Key={'device_id': device_id})
        device_info = device_response.get('Item', {})
        
        if not device_info:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f'Device {device_id} not found'})
            }
        
        # Get customer information
        customer_id = device_info.get('customer_id')
        customer_info = {}
        if customer_id:
            customer_response = customer_table.get_item(Key={'customer_id': customer_id})
            customer_info = customer_response.get('Item', {})
        
        # Get recent incidents for this device
        recent_incidents = get_device_recent_incidents(device_id)
        
        # Get real-time device status
        device_status = get_device_shadow_status(device_id)
        
        # Calculate device health metrics
        health_metrics = calculate_device_health(device_id, device_info)
        
        context = {
            'device_info': {
                'device_id': device_info.get('device_id'),
                'device_type': device_info.get('device_type'),
                'model': device_info.get('model'),
                'manufacturer': device_info.get('manufacturer'),
                'firmware_version': device_info.get('firmware_version'),
                'installation_date': device_info.get('installation_date'),
                'installation_address': device_info.get('installation_address'),
                'location_details': {
                    'building': device_info.get('building'),
                    'floor': device_info.get('floor'),
                    'zone': device_info.get('zone'),
                    'coordinates': device_info.get('coordinates')
                },
                'warranty_info': {
                    'status': device_info.get('warranty_status'),
                    'expiry_date': device_info.get('warranty_expiry'),
                    'service_contract': device_info.get('service_contract')
                },
                'maintenance_info': {
                    'last_maintenance': device_info.get('last_maintenance'),
                    'next_scheduled': device_info.get('next_maintenance'),
                    'maintenance_type': device_info.get('maintenance_type')
                }
            },
            'customer_info': {
                'customer_id': customer_info.get('customer_id'),
                'company_name': customer_info.get('company_name'),
                'support_tier': customer_info.get('support_tier', 'STANDARD'),
                'service_hours': customer_info.get('service_hours', '24/7'),
                'primary_contact': {
                    'name': customer_info.get('primary_contact_name'),
                    'phone': customer_info.get('primary_phone'),
                    'email': customer_info.get('primary_email')
                },
                'escalation_contacts': customer_info.get('escalation_contacts', []),
                'billing_info': {
                    'account_status': customer_info.get('account_status'),
                    'payment_method': customer_info.get('payment_method')
                }
            },
            'device_status': device_status,
            'health_metrics': health_metrics,
            'recent_incidents': recent_incidents,
            'recommendations': generate_agent_recommendations(device_info, customer_info, recent_incidents, device_status)
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(context, default=decimal_default)
        }
        
    except Exception as e:
        logger.error(f"Error getting device context: {str(e)}")
        raise

def get_customer_context(customer_id):
    """
    Get comprehensive customer context including all devices and recent activity
    """
    try:
        # Get customer information
        customer_response = customer_table.get_item(Key={'customer_id': customer_id})
        customer_info = customer_response.get('Item', {})
        
        if not customer_info:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f'Customer {customer_id} not found'})
            }
        
        # Get all customer devices
        devices_response = device_table.query(
            IndexName='customer-index',
            KeyConditionExpression='customer_id = :customer_id',
            ExpressionAttributeValues={':customer_id': customer_id}
        )
        customer_devices = devices_response.get('Items', [])
        
        # Get recent incidents for all customer devices
        customer_incidents = get_customer_recent_incidents(customer_id)
        
        # Calculate customer metrics
        customer_metrics = calculate_customer_metrics(customer_id, customer_devices)
        
        context = {
            'customer_info': {
                'customer_id': customer_info.get('customer_id'),
                'company_name': customer_info.get('company_name'),
                'industry': customer_info.get('industry'),
                'company_size': customer_info.get('company_size'),
                'support_tier': customer_info.get('support_tier', 'STANDARD'),
                'service_hours': customer_info.get('service_hours', '24/7'),
                'timezone': customer_info.get('timezone'),
                'preferred_language': customer_info.get('preferred_language', 'English'),
                'contacts': {
                    'primary': {
                        'name': customer_info.get('primary_contact_name'),
                        'title': customer_info.get('primary_contact_title'),
                        'phone': customer_info.get('primary_phone'),
                        'email': customer_info.get('primary_email')
                    },
                    'technical': {
                        'name': customer_info.get('technical_contact_name'),
                        'phone': customer_info.get('technical_phone'),
                        'email': customer_info.get('technical_email')
                    },
                    'escalation': customer_info.get('escalation_contacts', [])
                },
                'addresses': {
                    'headquarters': customer_info.get('hq_address'),
                    'billing': customer_info.get('billing_address'),
                    'service_locations': customer_info.get('service_locations', [])
                }
            },
            'devices_overview': {
                'total_devices': len(customer_devices),
                'devices_by_type': get_devices_by_type(customer_devices),
                'online_devices': len([d for d in customer_devices if d.get('status') == 'ONLINE']),
                'devices_with_issues': len([d for d in customer_devices if d.get('health_status') not in ['GOOD', 'HEALTHY']])
            },
            'devices': customer_devices,
            'recent_incidents': customer_incidents,
            'customer_metrics': customer_metrics,
            'recommendations': generate_customer_recommendations(customer_info, customer_devices, customer_incidents)
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(context, default=decimal_default)
        }
        
    except Exception as e:
        logger.error(f"Error getting customer context: {str(e)}")
        raise

def get_incident_history(device_id, customer_id):
    """
    Get incident history for device or customer
    """
    try:
        incidents = []
        
        if device_id:
            # Query incidents by device
            response = incidents_table.query(
                IndexName='device-timestamp-index',
                KeyConditionExpression='device_id = :device_id',
                ExpressionAttributeValues={':device_id': device_id},
                ScanIndexForward=False,  # Most recent first
                Limit=50
            )
            incidents.extend(response.get('Items', []))
        
        if customer_id:
            # Query incidents by customer
            response = incidents_table.scan(
                FilterExpression='customer_id = :customer_id',
                ExpressionAttributeValues={':customer_id': customer_id},
                Limit=100
            )
            incidents.extend(response.get('Items', []))
        
        # Remove duplicates and sort by timestamp
        unique_incidents = {inc['incident_id']: inc for inc in incidents}.values()
        sorted_incidents = sorted(unique_incidents, key=lambda x: x.get('timestamp', 0), reverse=True)
        
        # Add trend analysis
        incident_trends = analyze_incident_trends(sorted_incidents[:30])  # Last 30 incidents
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'incidents': sorted_incidents[:50],  # Return top 50
                'total_count': len(sorted_incidents),
                'trends': incident_trends
            }, default=decimal_default)
        }
        
    except Exception as e:
        logger.error(f"Error getting incident history: {str(e)}")
        raise

def get_real_time_device_status(device_id):
    """
    Get real-time device status from IoT Device Shadow
    """
    try:
        response = iot_client.get_thing_shadow(thingName=device_id)
        shadow_data = json.loads(response['payload'].read())
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'device_id': device_id,
                'shadow_data': shadow_data,
                'last_updated': shadow_data.get('metadata', {}).get('desired', {}).get('timestamp'),
                'connectivity': 'ONLINE' if shadow_data else 'OFFLINE'
            })
        }
        
    except iot_client.exceptions.ResourceNotFoundException:
        return {
            'statusCode': 404,
            'body': json.dumps({'error': f'Device shadow not found for {device_id}'})
        }
    except Exception as e:
        logger.error(f"Error getting device shadow: {str(e)}")
        raise

def get_device_recent_incidents(device_id, days=7):
    """
    Get recent incidents for a specific device
    """
    try:
        cutoff_timestamp = int((datetime.utcnow() - timedelta(days=days)).timestamp())
        
        response = incidents_table.query(
            IndexName='device-timestamp-index',
            KeyConditionExpression='device_id = :device_id AND #ts > :cutoff',
            ExpressionAttributeNames={'#ts': 'timestamp'},
            ExpressionAttributeValues={
                ':device_id': device_id,
                ':cutoff': cutoff_timestamp
            },
            ScanIndexForward=False,  # Most recent first
            Limit=20
        )
        
        return response.get('Items', [])
        
    except Exception as e:
        logger.error(f"Error getting recent incidents: {str(e)}")
        return []

def get_customer_recent_incidents(customer_id, days=30):
    """
    Get recent incidents for all customer devices
    """
    try:
        cutoff_timestamp = int((datetime.utcnow() - timedelta(days=days)).timestamp())
        
        response = incidents_table.scan(
            FilterExpression='customer_id = :customer_id AND #ts > :cutoff',
            ExpressionAttributeNames={'#ts': 'timestamp'},
            ExpressionAttributeValues={
                ':customer_id': customer_id,
                ':cutoff': cutoff_timestamp
            },
            Limit=50
        )
        
        incidents = response.get('Items', [])
        return sorted(incidents, key=lambda x: x.get('timestamp', 0), reverse=True)
        
    except Exception as e:
        logger.error(f"Error getting customer incidents: {str(e)}")
        return []

def get_device_shadow_status(device_id):
    """
    Get device status from IoT Device Shadow
    """
    try:
        response = iot_client.get_thing_shadow(thingName=device_id)
        shadow_data = json.loads(response['payload'].read())
        
        reported_state = shadow_data.get('state', {}).get('reported', {})
        
        return {
            'connectivity': 'ONLINE',
            'last_seen': shadow_data.get('metadata', {}).get('reported', {}).get('timestamp'),
            'battery_level': reported_state.get('battery_level'),
            'signal_strength': reported_state.get('signal_strength'),
            'health_status': reported_state.get('health_status', 'UNKNOWN'),
            'location': reported_state.get('location'),
            'operational_status': reported_state.get('operational_status', 'UNKNOWN'),
            'error_codes': reported_state.get('error_codes', [])
        }
        
    except iot_client.exceptions.ResourceNotFoundException:
        return {
            'connectivity': 'OFFLINE',
            'last_seen': None,
            'health_status': 'UNKNOWN'
        }
    except Exception as e:
        logger.error(f"Error getting device shadow status: {str(e)}")
        return {'connectivity': 'ERROR', 'error': str(e)}

def calculate_device_health(device_id, device_info):
    """
    Calculate device health metrics
    """
    try:
        # Get recent incidents count
        recent_incidents = get_device_recent_incidents(device_id, days=30)
        incident_count = len(recent_incidents)
        
        # Calculate uptime (mock calculation - would use real telemetry in production)
        uptime_percentage = max(0, 100 - (incident_count * 2))  # Simplified calculation
        
        # Device age in months
        install_date = device_info.get('installation_date')
        device_age_months = 0
        if install_date:
            install_dt = datetime.fromisoformat(install_date.replace('Z', '+00:00'))
            device_age_months = (datetime.utcnow() - install_dt.replace(tzinfo=None)).days // 30
        
        # Health score calculation
        health_score = calculate_health_score(uptime_percentage, incident_count, device_age_months)
        
        return {
            'health_score': health_score,
            'uptime_percentage': uptime_percentage,
            'incident_count_30_days': incident_count,
            'device_age_months': device_age_months,
            'last_maintenance': device_info.get('last_maintenance'),
            'maintenance_overdue': is_maintenance_overdue(device_info),
            'warranty_status': device_info.get('warranty_status'),
            'firmware_status': get_firmware_status(device_info)
        }
        
    except Exception as e:
        logger.error(f"Error calculating device health: {str(e)}")
        return {'health_score': 0, 'error': str(e)}

def calculate_customer_metrics(customer_id, devices):
    """
    Calculate customer-level metrics
    """
    try:
        total_devices = len(devices)
        online_devices = len([d for d in devices if d.get('status') == 'ONLINE'])
        
        # Calculate average health score
        health_scores = []
        for device in devices:
            health_metrics = calculate_device_health(device['device_id'], device)
            health_scores.append(health_metrics.get('health_score', 50))
        
        avg_health_score = sum(health_scores) / len(health_scores) if health_scores else 0
        
        # Get recent customer incidents
        recent_incidents = get_customer_recent_incidents(customer_id, days=30)
        
        return {
            'total_devices': total_devices,
            'online_devices': online_devices,
            'offline_devices': total_devices - online_devices,
            'average_health_score': round(avg_health_score, 2),
            'incidents_last_30_days': len(recent_incidents),
            'devices_by_type': get_devices_by_type(devices),
            'fleet_uptime': round((online_devices / total_devices * 100), 2) if total_devices > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error calculating customer metrics: {str(e)}")
        return {}

def get_devices_by_type(devices):
    """
    Group devices by type
    """
    device_types = {}
    for device in devices:
        device_type = device.get('device_type', 'UNKNOWN')
        device_types[device_type] = device_types.get(device_type, 0) + 1
    return device_types

def calculate_health_score(uptime, incident_count, age_months):
    """
    Calculate overall device health score (0-100)
    """
    # Base score from uptime
    score = uptime * 0.6
    
    # Penalty for incidents
    incident_penalty = min(incident_count * 5, 30)
    score -= incident_penalty
    
    # Age factor (devices degrade over time)
    age_penalty = min(age_months * 0.5, 20)
    score -= age_penalty
    
    return max(0, min(100, round(score)))

def is_maintenance_overdue(device_info):
    """
    Check if device maintenance is overdue
    """
    try:
        next_maintenance = device_info.get('next_maintenance')
        if not next_maintenance:
            return False
            
        next_date = datetime.fromisoformat(next_maintenance.replace('Z', '+00:00'))
        return datetime.utcnow() > next_date.replace(tzinfo=None)
        
    except Exception:
        return False

def get_firmware_status(device_info):
    """
    Get firmware update status
    """
    current_version = device_info.get('firmware_version', '0.0.0')
    # In production, this would check against latest available firmware
    return {
        'current_version': current_version,
        'update_available': False,  # Would be determined by actual firmware registry
        'security_patches_needed': False
    }

def analyze_incident_trends(incidents):
    """
    Analyze incident trends and patterns
    """
    try:
        if not incidents:
            return {}
            
        # Count by severity
        severity_counts = {}
        alert_type_counts = {}
        monthly_counts = {}
        
        for incident in incidents:
            severity = incident.get('severity', 'UNKNOWN')
            alert_type = incident.get('alert_type', 'UNKNOWN')
            
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            alert_type_counts[alert_type] = alert_type_counts.get(alert_type, 0) + 1
            
            # Monthly grouping
            timestamp = incident.get('timestamp', 0)
            if timestamp:
                incident_date = datetime.fromtimestamp(timestamp)
                month_key = incident_date.strftime('%Y-%m')
                monthly_counts[month_key] = monthly_counts.get(month_key, 0) + 1
        
        return {
            'severity_distribution': severity_counts,
            'alert_type_distribution': alert_type_counts,
            'monthly_trend': monthly_counts,
            'total_incidents': len(incidents),
            'most_common_alert': max(alert_type_counts.items(), key=lambda x: x[1])[0] if alert_type_counts else None
        }
        
    except Exception as e:
        logger.error(f"Error analyzing incident trends: {str(e)}")
        return {}

def generate_agent_recommendations(device_info, customer_info, incidents, device_status):
    """
    Generate recommendations for agent based on context
    """
    recommendations = []
    
    try:
        # Check maintenance status
        if is_maintenance_overdue(device_info):
            recommendations.append({
                'type': 'MAINTENANCE',
                'priority': 'HIGH',
                'message': 'Device maintenance is overdue. Schedule maintenance visit.',
                'action': 'Schedule technician visit'
            })
        
        # Check incident patterns
        if len(incidents) > 5:  # More than 5 incidents recently
            recommendations.append({
                'type': 'RELIABILITY',
                'priority': 'MEDIUM',
                'message': f'Device has {len(incidents)} recent incidents. Consider reliability assessment.',
                'action': 'Escalate to technical team'
            })
        
        # Check connectivity
        if device_status.get('connectivity') == 'OFFLINE':
            recommendations.append({
                'type': 'CONNECTIVITY',
                'priority': 'HIGH',
                'message': 'Device is currently offline. Check network connectivity.',
                'action': 'Verify network connection'
            })
        
        # Customer tier recommendations
        support_tier = customer_info.get('support_tier', 'STANDARD')
        if support_tier == 'PREMIUM':
            recommendations.append({
                'type': 'SERVICE',
                'priority': 'HIGH',
                'message': 'Premium customer - prioritize resolution and consider proactive follow-up.',
                'action': 'Offer premium support options'
            })
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return []

def generate_customer_recommendations(customer_info, devices, incidents):
    """
    Generate customer-level recommendations
    """
    recommendations = []
    
    try:
        # Fleet health check
        offline_devices = len([d for d in devices if d.get('status') != 'ONLINE'])
        if offline_devices > 0:
            recommendations.append({
                'type': 'FLEET_HEALTH',
                'priority': 'MEDIUM',
                'message': f'{offline_devices} devices are offline. Consider fleet health assessment.',
                'action': 'Investigate offline devices'
            })
        
        # Incident frequency
        if len(incidents) > 10:  # High incident rate
            recommendations.append({
                'type': 'INCIDENT_MANAGEMENT',
                'priority': 'HIGH',
                'message': 'High incident frequency detected. Consider preventive measures.',
                'action': 'Recommend proactive maintenance program'
            })
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Error generating customer recommendations: {str(e)}")
        return []

def decimal_default(obj):
    """
    JSON serializer for objects not serializable by default json code
    """
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError