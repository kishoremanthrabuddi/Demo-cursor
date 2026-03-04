# Production Environment Configuration

# Basic Configuration
environment    = "prod"
project_name   = "aws-infrastructure"
aws_region     = "us-west-2"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"

# Compute Configuration
instance_type = "t3.small"  # Slightly larger for production workloads
key_name      = ""          # Optional: Add your EC2 key pair name for SSH access

# Monitoring and Features
enable_monitoring       = true   # Enabled for production monitoring
backup_retention_days   = 30     # Longer retention for production

# Tags
common_tags = {
  Environment = "prod"
  Project     = "aws-infrastructure"
  Terraform   = "true"
  ManagedBy   = "terraform"
  CostCenter  = "production"
  Owner       = "OpsTeam"
  Compliance  = "required"
}