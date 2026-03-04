#!/bin/bash
# Terraform Helper Script for AWS Infrastructure
# Usage: ./deploy.sh [init|plan|apply|destroy] [environment]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ACTION=""
ENVIRONMENT=""
AUTO_APPROVE=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 <action> <environment> [options]

Actions:
    init        Initialize Terraform (run first time or after adding new providers)
    plan        Show what Terraform will do
    apply       Apply the Terraform configuration
    destroy     Destroy all resources (BE CAREFUL!)
    validate    Validate Terraform configuration
    format      Format Terraform files

Environments:
    dev         Development environment
    prod        Production environment

Options:
    -y, --yes   Auto-approve (skip confirmation prompts)
    -h, --help  Show this help message

Examples:
    $0 init dev
    $0 plan dev
    $0 apply prod
    $0 destroy dev -y

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            init|plan|apply|destroy|validate|format)
                ACTION="$1"
                shift
                ;;
            dev|prod)
                ENVIRONMENT="$1"
                shift
                ;;
            -y|--yes)
                AUTO_APPROVE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown argument: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate arguments
validate_args() {
    if [[ -z "$ACTION" ]]; then
        print_error "Action is required"
        show_usage
        exit 1
    fi

    if [[ "$ACTION" != "validate" && "$ACTION" != "format" && -z "$ENVIRONMENT" ]]; then
        print_error "Environment is required for action: $ACTION"
        show_usage
        exit 1
    fi

    if [[ -n "$ENVIRONMENT" && ! -f "$PROJECT_DIR/environments/${ENVIRONMENT}.tfvars" ]]; then
        print_error "Environment file not found: environments/${ENVIRONMENT}.tfvars"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install Terraform first."
        print_error "Visit: https://developer.hashicorp.com/terraform/downloads"
        exit 1
    fi

    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI first."
        print_error "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid."
        print_error "Run 'aws configure' or set up AWS credentials."
        exit 1
    fi

    print_status "Prerequisites check passed"
}

# Initialize Terraform
terraform_init() {
    print_status "Initializing Terraform..."
    cd "$PROJECT_DIR"
    terraform init
    print_status "Terraform initialization completed"
}

# Validate Terraform configuration
terraform_validate() {
    print_status "Validating Terraform configuration..."
    cd "$PROJECT_DIR"
    terraform validate
    print_status "Terraform configuration is valid"
}

# Format Terraform files
terraform_format() {
    print_status "Formatting Terraform files..."
    cd "$PROJECT_DIR"
    terraform fmt -recursive
    print_status "Terraform files formatted"
}

# Plan Terraform changes
terraform_plan() {
    print_status "Planning Terraform changes for environment: $ENVIRONMENT"
    cd "$PROJECT_DIR"
    terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="terraform-${ENVIRONMENT}.plan"
    print_status "Plan saved to: terraform-${ENVIRONMENT}.plan"
}

# Apply Terraform changes
terraform_apply() {
    print_status "Applying Terraform changes for environment: $ENVIRONMENT"
    cd "$PROJECT_DIR"
    
    if [[ "$AUTO_APPROVE" == "true" ]]; then
        terraform apply -var-file="environments/${ENVIRONMENT}.tfvars" -auto-approve
    else
        # Check if plan exists
        if [[ -f "terraform-${ENVIRONMENT}.plan" ]]; then
            print_status "Using existing plan file: terraform-${ENVIRONMENT}.plan"
            terraform apply "terraform-${ENVIRONMENT}.plan"
        else
            terraform apply -var-file="environments/${ENVIRONMENT}.tfvars"
        fi
    fi
    
    # Clean up plan file after successful apply
    rm -f "terraform-${ENVIRONMENT}.plan"
    
    print_status "Terraform apply completed"
    print_status "Showing outputs..."
    terraform output
}

# Destroy Terraform resources
terraform_destroy() {
    print_warning "This will DESTROY all resources for environment: $ENVIRONMENT"
    
    if [[ "$AUTO_APPROVE" != "true" ]]; then
        echo -n "Are you absolutely sure? Type 'yes' to confirm: "
        read -r confirmation
        if [[ "$confirmation" != "yes" ]]; then
            print_status "Destruction cancelled"
            exit 0
        fi
    fi
    
    print_status "Destroying Terraform resources for environment: $ENVIRONMENT"
    cd "$PROJECT_DIR"
    terraform destroy -var-file="environments/${ENVIRONMENT}.tfvars" ${AUTO_APPROVE:+-auto-approve}
    
    # Clean up plan files
    rm -f "terraform-${ENVIRONMENT}.plan"
    
    print_status "Terraform destroy completed"
}

# Main function
main() {
    parse_args "$@"
    validate_args
    
    print_status "Starting Terraform operation: $ACTION"
    print_status "Project directory: $PROJECT_DIR"
    [[ -n "$ENVIRONMENT" ]] && print_status "Environment: $ENVIRONMENT"
    
    check_prerequisites
    
    case "$ACTION" in
        init)
            terraform_init
            ;;
        validate)
            terraform_validate
            ;;
        format)
            terraform_format
            ;;
        plan)
            terraform_plan
            ;;
        apply)
            terraform_apply
            ;;
        destroy)
            terraform_destroy
            ;;
    esac
    
    print_status "Operation completed successfully!"
}

# Run main function with all arguments
main "$@"