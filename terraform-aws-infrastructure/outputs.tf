output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = module.vpc.internet_gateway_id
}

output "ec2_instance_id" {
  description = "ID of the EC2 instance"
  value       = module.compute.instance_id
}

output "ec2_instance_private_ip" {
  description = "Private IP address of the EC2 instance"
  value       = module.compute.instance_private_ip
}

output "ec2_security_group_id" {
  description = "ID of the EC2 security group"
  value       = module.compute.security_group_id
}

output "iam_role_arn" {
  description = "ARN of the IAM role for EC2"
  value       = module.compute.iam_role_arn
}

output "log_bucket_name" {
  description = "Name of the S3 bucket for application logs"
  value       = module.storage.log_bucket_name
}

output "log_bucket_arn" {
  description = "ARN of the S3 bucket for application logs"
  value       = module.storage.log_bucket_arn
}

output "aws_region" {
  description = "AWS region used for this deployment"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}