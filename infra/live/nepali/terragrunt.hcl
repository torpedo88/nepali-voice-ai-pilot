locals {
  env = read_terragrunt_config("${get_terragrunt_dir()}/../env.hcl")
}

remote_state {
  backend = "local"

  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }

  config = {
    path = "${get_parent_terragrunt_dir()}/../../terraform-state/${path_relative_to_include()}/terraform.tfstate"
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

inputs = {
  compartment_ocid    = local.env.locals.compartment_ocid
  project_name        = local.env.locals.project_name
  ssh_public_key_path = local.env.locals.ssh_public_key_path
}

# Retry on A1 out-of-capacity: use the v0.99+ errors block.
errors {
  retry "a1_capacity" {
    retryable_errors   = [".*Out of host capacity.*", ".*InternalError.*"]
    max_attempts       = 3
    sleep_interval_sec = 60
  }
}
