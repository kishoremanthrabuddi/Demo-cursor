# AWS Infrastructure with Terraform

A production-ready, modular Terraform configuration for deploying AWS infrastructure including VPC, EC2 instances, and S3 storage. Designed for multiple environments (dev, prod) with best practices for security, monitoring, and cost optimization.

## 🏗️ Architecture Overview

This infrastructure creates:

- **VPC** (10.0.0.0/16) with 2 public and 2 private subnets across different AZs
- **Internet Gateway** with appropriate route tables
- **NAT Gateways** for high availability (one per AZ)
- **EC2 instance** in private subnet with IAM role and security groups
- **S3 bucket** for application logs with encryption and lifecycle policies
- **CloudWatch** monitoring and logging
- **Systems Manager** integration for secure access

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Region (us-west-2)               │
├─────────────────────────────────────────────────────────────┤
│  VPC (10.0.0.0/16)                                        │
│  ┌─────────────────────┬─────────────────────────────────┐  │
│  │   AZ-1a             │         AZ-1b                   │  │
│  │  ┌─────────────────┐│  ┌─────────────────────────────┐│  │
│  │  │ Public Subnet   ││  │ Public Subnet               ││  │
│  │  │ 10.0.0.0/24    ││  │ 10.0.1.0/24                ││  │
│  │  │ ┌─────────────┐ ││  │ ┌─────────────────────────┐ ││  │
│  │  │ │ NAT Gateway │ ││  │ │ NAT Gateway             │ ││  │
│  │  │ └─────────────┘ ││  │ └─────────────────────────┘ ││  │
│  │  └─────────────────┘│  └─────────────────────────────┘│  │
│  │  ┌─────────────────┐│  ┌─────────────────────────────┐│  │
│  │  │ Private Subnet  ││  │ Private Subnet              ││  │
│  │  │ 10.0.2.0/24    ││  │ 10.0.3.0/24                ││  │
│  │  │ ┌─────────────┐ ││  │                             ││  │
│  │  │ │ EC2 Instance│ ││  │                             ││  │
│  │  │ └─────────────┘ ││  │                             ││  │
│  │  └─────────────────┘│  └─────────────────────────────┘│  │
│  └─────────────────────┴─────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                S3 Bucket (Logs)                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### 1. Install Required Tools

- **Terraform** >= 1.0
  ```bash
  # macOS
  brew install terraform
  
  # Or download from: https://developer.hashicorp.com/terraform/downloads
  ```

- **AWS CLI** >= 2.0
  ```bash
  # macOS
  brew install awscli
  
  # Or follow: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
  ```

### 2. AWS Configuration

Configure your AWS credentials:

```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-west-2"
```

### 3. S3 Backend (Recommended for Production)

Create an S3 bucket for Terraform state:

```bash
aws s3 mb s3://your-terraform-state-bucket --region us-west-2
aws s3api put-bucket-versioning --bucket your-terraform-state-bucket --versioning-configuration Status=Enabled
```

Create DynamoDB table for state locking:
```bash
aws dynamodb create-table \
    --table-name terraform-state-lock \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-west-2
```

Then uncomment and configure the backend in `main.tf`:
```hcl
backend "s3" {
  bucket         = "your-terraform-state-bucket"
  key            = "infrastructure/terraform.tfstate"
  region         = "us-west-2"
  encrypt        = true
  dynamodb_table = "terraform-state-lock"
}
```

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd terraform-aws-infrastructure
```

### 2. Configure Variables

Copy the example variables file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
```hcl
environment    = "dev"
project_name   = "my-project"
aws_region     = "us-west-2"
instance_type  = "t3.micro"
key_name       = "my-ec2-key"  # Optional: for SSH access
```

### 3. Deploy Infrastructure

Using the helper script (recommended):
```bash
# Initialize Terraform
./scripts/deploy.sh init dev

# Plan the deployment
./scripts/deploy.sh plan dev

# Apply the configuration
./scripts/deploy.sh apply dev
```

Or using Terraform directly:
```bash
# Initialize
terraform init

# Plan
terraform plan -var-file="environments/dev.tfvars"

# Apply
terraform apply -var-file="environments/dev.tfvars"
```

## 📁 Project Structure

```
terraform-aws-infrastructure/
├── main.tf                     # Main Terraform configuration
├── variables.tf                # Input variables
├── outputs.tf                  # Output values
├── terraform.tfvars.example    # Example variables file
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
├── environments/              # Environment-specific configurations
│   ├── dev.tfvars            # Development environment
│   └── prod.tfvars           # Production environment
├── modules/                   # Reusable Terraform modules
│   ├── vpc/                  # VPC module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── compute/              # EC2 and related resources
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── storage/              # S3 and storage resources
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── scripts/                   # Helper scripts
    ├── deploy.sh             # Deployment automation script
    └── user-data.sh          # EC2 initialization script
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `environment` | Environment name (dev/prod) | - | Yes |
| `project_name` | Project identifier | - | Yes |
| `aws_region` | AWS region | `us-west-2` | No |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` | No |
| `instance_type` | EC2 instance type | `t3.micro` | No |
| `key_name` | EC2 key pair name | `""` | No |
| `enable_monitoring` | Enable detailed monitoring | `false` | No |
| `backup_retention_days` | Backup retention period | `7` | No |

### Environment Files

- **`environments/dev.tfvars`**: Development configuration with cost optimization
- **`environments/prod.tfvars`**: Production configuration with enhanced monitoring
- **`terraform.tfvars.example`**: Template for custom configurations

## 🏃‍♂️ Usage Examples

### Deploy to Development
```bash
./scripts/deploy.sh apply dev
```

### Deploy to Production
```bash
./scripts/deploy.sh apply prod
```

### Destroy Infrastructure
```bash
./scripts/deploy.sh destroy dev -y
```

### Validate Configuration
```bash
./scripts/deploy.sh validate
```

### Format Code
```bash
./scripts/deploy.sh format
```

## 📊 Outputs

After successful deployment, Terraform will output:

```
vpc_id                    = "vpc-xxxxxxxxx"
vpc_cidr_block           = "10.0.0.0/16"
public_subnet_ids        = ["subnet-xxxxxx", "subnet-yyyyyy"]
private_subnet_ids       = ["subnet-aaaaaa", "subnet-bbbbbb"]
ec2_instance_id          = "i-xxxxxxxxx"
ec2_instance_private_ip  = "10.0.2.xxx"
log_bucket_name          = "project-dev-logs-xxxxxxxx"
aws_region              = "us-west-2"
environment             = "dev"
```

## 🔒 Security Features

### Network Security
- Private subnets for compute resources
- Security groups with minimal required access
- Network ACLs for additional layer of security
- NAT Gateways for outbound internet access from private subnets

### Access Control
- IAM roles instead of access keys
- Systems Manager Session Manager for secure shell access
- S3 bucket policies and encryption
- Least privilege principle throughout

### Data Protection
- S3 encryption at rest (AES-256)
- EBS encryption for EC2 volumes
- VPC Flow Logs (can be enabled)
- CloudTrail integration (can be added)

## 📈 Monitoring and Logging

### CloudWatch Integration
- EC2 detailed monitoring (configurable)
- Custom CloudWatch metrics
- Log aggregation from EC2 instances
- Application logs shipped to S3

### Log Management
- Application logs stored in S3 with lifecycle policies
- CloudWatch Logs for system-level monitoring
- Log rotation and retention policies
- Structured JSON logging format

## 💰 Cost Optimization

### Development Environment
- `t3.micro` instances (free tier eligible)
- Minimal monitoring to reduce costs
- Shorter backup retention (3 days)
- Single NAT Gateway option (can be configured)

### Production Environment
- Appropriate instance sizing (`t3.small`)
- Enhanced monitoring enabled
- Longer backup retention (30 days)
- High availability with multiple NAT Gateways

### General Cost Saving
- S3 lifecycle policies for log retention
- EBS GP3 volumes for better price/performance
- Spot instances support (can be added)
- Resource tagging for cost allocation

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Terraform Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v1
      
    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-west-2
        
    - name: Terraform Init
      run: terraform init
      
    - name: Terraform Plan
      run: terraform plan -var-file="environments/dev.tfvars"
      
    - name: Terraform Apply
      if: github.ref == 'refs/heads/main'
      run: terraform apply -var-file="environments/dev.tfvars" -auto-approve
```

## 🛠️ Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   ```
   Error: No valid credential sources found
   ```
   **Solution**: Configure AWS credentials using `aws configure` or environment variables.

2. **S3 Backend Access Denied**
   ```
   Error: Failed to get existing workspaces
   ```
   **Solution**: Ensure your AWS user has access to the S3 bucket and DynamoDB table.

3. **Resource Already Exists**
   ```
   Error: resource already exists
   ```
   **Solution**: Import existing resources or use different naming.

4. **Insufficient Permissions**
   ```
   Error: User is not authorized to perform action
   ```
   **Solution**: Ensure your AWS user has the necessary IAM permissions.

### Required IAM Permissions

Your AWS user needs these minimum permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:*",
                "s3:*",
                "iam:*",
                "logs:*",
                "ssm:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### Debugging Commands

```bash
# Check Terraform version
terraform --version

# Validate configuration
terraform validate

# Check formatting
terraform fmt -check

# Show current state
terraform show

# List resources in state
terraform state list

# Debug with detailed logs
export TF_LOG=DEBUG
terraform plan
```

## 🧪 Testing

### Validate Infrastructure

```bash
# Test connectivity to EC2 instance
aws ssm start-session --target <instance-id>

# Check application health
curl http://<instance-private-ip>:8000/health

# Test S3 logging
aws s3 ls s3://<log-bucket-name>/
```

### Load Testing

```bash
# Simple load test using Apache Bench
ab -n 1000 -c 10 http://<instance-ip>:8000/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow Terraform best practices
- Use meaningful variable names
- Add comments for complex logic
- Test changes in dev environment first
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline comments
- **Issues**: Open a GitHub issue for bugs or feature requests
- **AWS Documentation**: [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## 🎯 Future Enhancements

- [ ] Application Load Balancer for high availability
- [ ] RDS database integration
- [ ] Auto Scaling Groups
- [ ] Certificate Manager integration
- [ ] Route 53 DNS management
- [ ] CloudFront CDN setup
- [ ] Lambda functions for serverless components
- [ ] ElastiCache for caching
- [ ] AWS WAF for web application firewall
- [ ] Config Rules for compliance monitoring

## 📚 References

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)

---

**Built with ❤️ using Terraform and AWS**