#!/bin/bash
# User Data Script for EC2 Instance
# This script runs when the instance first boots

set -e  # Exit on any error

# Variables passed from Terraform
LOG_BUCKET="${log_bucket}"
ENVIRONMENT="${environment}"
PROJECT="${project}"
REGION="${region}"

# Log all output to a file and CloudWatch
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting user data script execution at $(date)"
echo "Project: $PROJECT, Environment: $ENVIRONMENT, Region: $REGION"

# Update the system
echo "Updating system packages..."
yum update -y

# Install essential packages
echo "Installing essential packages..."
yum install -y \
    awscli \
    htop \
    tree \
    curl \
    wget \
    unzip \
    git \
    amazon-cloudwatch-agent \
    amazon-ssm-agent

# Configure AWS CLI region
echo "Configuring AWS CLI..."
aws configure set default.region $REGION

# Install Docker (optional but useful for containerized applications)
echo "Installing Docker..."
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
echo "Setting up application directory..."
mkdir -p /opt/app
chown ec2-user:ec2-user /opt/app

# Create log directory for application logs
mkdir -p /var/log/app
chown ec2-user:ec2-user /var/log/app

# Configure CloudWatch Agent
echo "Configuring CloudWatch Agent..."
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/user-data.log",
                        "log_group_name": "/aws/ec2/$PROJECT-$ENVIRONMENT",
                        "log_stream_name": "{instance_id}/user-data.log",
                        "timezone": "UTC"
                    },
                    {
                        "file_path": "/var/log/app/*.log",
                        "log_group_name": "/aws/ec2/$PROJECT-$ENVIRONMENT",
                        "log_stream_name": "{instance_id}/app.log",
                        "timezone": "UTC"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "$PROJECT/$ENVIRONMENT",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Start CloudWatch Agent
echo "Starting CloudWatch Agent..."
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Create a sample application (Hello World web server)
echo "Creating sample application..."
cat > /opt/app/app.py << 'EOF'
#!/usr/bin/env python3
import os
import json
import logging
from datetime import datetime
from flask import Flask, jsonify
import boto3

app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/app/application.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Initialize S3 client
s3_client = boto3.client('s3')
LOG_BUCKET = os.environ.get('LOG_BUCKET', '')

@app.route('/')
def hello():
    logger.info("Hello endpoint accessed")
    return jsonify({
        'message': 'Hello from AWS Infrastructure!',
        'timestamp': datetime.utcnow().isoformat(),
        'environment': os.environ.get('ENVIRONMENT', 'unknown'),
        'project': os.environ.get('PROJECT', 'unknown')
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/logs')
def upload_logs():
    try:
        # Example: Upload current log to S3
        log_content = f"Log entry at {datetime.utcnow().isoformat()}\n"
        key = f"application-logs/{datetime.utcnow().strftime('%Y/%m/%d')}/app-{datetime.utcnow().strftime('%H%M%S')}.log"
        
        s3_client.put_object(
            Bucket=LOG_BUCKET,
            Key=key,
            Body=log_content,
            ContentType='text/plain'
        )
        
        logger.info(f"Log uploaded to S3: s3://{LOG_BUCKET}/{key}")
        return jsonify({'message': 'Log uploaded to S3', 'key': key})
    except Exception as e:
        logger.error(f"Error uploading log: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
EOF

# Create systemd service for the application
echo "Creating systemd service..."
cat > /etc/systemd/system/app.service << EOF
[Unit]
Description=Sample Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/app
Environment=LOG_BUCKET=$LOG_BUCKET
Environment=ENVIRONMENT=$ENVIRONMENT
Environment=PROJECT=$PROJECT
ExecStart=/usr/bin/python3 /opt/app/app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Install Python dependencies
echo "Installing Python dependencies..."
yum install -y python3 python3-pip
pip3 install flask boto3

# Make the application executable
chmod +x /opt/app/app.py

# Enable and start the application service
echo "Starting application service..."
systemctl daemon-reload
systemctl enable app.service
systemctl start app.service

# Create a log rotation configuration
echo "Configuring log rotation..."
cat > /etc/logrotate.d/app << EOF
/var/log/app/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        systemctl reload app.service
    endscript
}
EOF

# Create a cron job to sync logs to S3 daily
echo "Setting up S3 log sync..."
cat > /etc/cron.daily/s3-log-sync << 'EOF'
#!/bin/bash
# Sync application logs to S3
AWS_REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
LOG_BUCKET=$(aws ssm get-parameter --name "/app/log-bucket" --query "Parameter.Value" --output text 2>/dev/null || echo "$LOG_BUCKET")

if [ -n "$LOG_BUCKET" ]; then
    aws s3 sync /var/log/app/ s3://$LOG_BUCKET/instance-logs/$(curl -s http://169.254.169.254/latest/meta-data/instance-id)/ \
        --exclude "*.tmp" \
        --delete \
        --region $AWS_REGION
fi
EOF

chmod +x /etc/cron.daily/s3-log-sync

# Store configuration in SSM Parameter Store for future reference
echo "Storing configuration in SSM..."
aws ssm put-parameter \
    --name "/app/log-bucket" \
    --value "$LOG_BUCKET" \
    --type "String" \
    --overwrite \
    --region $REGION 2>/dev/null || true

# Final status check
echo "Performing final status checks..."
systemctl status docker
systemctl status amazon-ssm-agent
systemctl status amazon-cloudwatch-agent
systemctl status app.service

# Create a status file
cat > /opt/app/setup-status.json << EOF
{
    "setup_completed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "project": "$PROJECT",
    "environment": "$ENVIRONMENT",
    "log_bucket": "$LOG_BUCKET",
    "region": "$REGION",
    "services": {
        "docker": "$(systemctl is-active docker)",
        "ssm-agent": "$(systemctl is-active amazon-ssm-agent)",
        "cloudwatch-agent": "$(systemctl is-active amazon-cloudwatch-agent)",
        "app": "$(systemctl is-active app.service)"
    }
}
EOF

echo "User data script completed successfully at $(date)"
echo "Application is running on port 8000"
echo "Health check available at: http://localhost:8000/health"