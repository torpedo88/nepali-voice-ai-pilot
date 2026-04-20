locals {
  env = read_terragrunt_config("${get_terragrunt_dir()}/../env.hcl")
}

remote_state {
  backend = "s3"

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }

  config = {
    bucket                      = local.env.locals.state_bucket
    key                         = "${path_relative_to_include()}/terraform.tfstate"
    region                      = local.env.locals.region
    endpoint                    = "https://${local.env.locals.namespace}.compat.objectstorage.${local.env.locals.region}.oraclecloud.com"
    shared_credentials_file     = pathexpand("~/.oci/s3_credentials")
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    force_path_style            = true
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "oci" {
  config_file_profile = "${local.env.locals.oci_profile}"
  region              = "${local.env.locals.region}"
}
EOF
}

generate "versions" {
  path      = "generated_versions.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  required_version = ">= 1.6"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.30"
    }
  }
}
EOF
}

inputs = {
  compartment_ocid    = local.env.locals.compartment_ocid
  project_name        = local.env.locals.project_name
  ssh_public_key_path = local.env.locals.ssh_public_key_path
}

# Retry on A1 out-of-capacity.
retryable_errors = [
  "(?s).*Out of host capacity.*",
  "(?s).*InternalError.*",
]
retry_max_attempts       = 3
retry_sleep_interval_sec = 60
