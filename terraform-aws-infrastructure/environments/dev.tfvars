# Development Environment Configuration

# Basic Configuration
environment    = "dev"
project_name   = "aws-infrastructure"
aws_region     = "us-west-2"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"

# Compute Configuration
instance_type = "t3.micro"  # Free tier eligible
key_name      = ""          # Optional: Add your EC2 key pair name for SSH access

# Monitoring and Features
enable_monitoring       = false  # Disabled for cost savings in dev
backup_retention_days   = 3      # Shorter retention for dev

# Tags
common_tags = {
  Environment = "dev"
  Project     = "aws-infrastructure"
  Terraform   = "true"
  ManagedBy   = "terraform"
  CostCenter  = "development"
  Owner       = "DevTeam"
}