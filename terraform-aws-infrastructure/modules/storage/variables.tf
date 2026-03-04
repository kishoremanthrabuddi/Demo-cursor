variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to resources"
  type        = map(string)
}

variable "log_retention_days" {
  description = "Number of days to retain logs in S3"
  type        = number
  default     = 30
}