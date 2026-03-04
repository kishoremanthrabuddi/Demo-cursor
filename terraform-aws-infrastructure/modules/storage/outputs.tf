output "log_bucket_name" {
  description = "Name of the S3 bucket for logs"
  value       = aws_s3_bucket.log_bucket.bucket
}

output "log_bucket_arn" {
  description = "ARN of the S3 bucket for logs"
  value       = aws_s3_bucket.log_bucket.arn
}

output "log_bucket_id" {
  description = "ID of the S3 bucket for logs"
  value       = aws_s3_bucket.log_bucket.id
}

output "log_bucket_domain_name" {
  description = "Domain name of the S3 bucket for logs"
  value       = aws_s3_bucket.log_bucket.bucket_domain_name
}