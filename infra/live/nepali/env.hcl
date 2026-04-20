locals {
  # Region — override to your OCI home region.
  region = "us-phoenix-1"

  # Named profile in ~/.oci/config used by the OCI provider.
  # Created by: `oci setup config` → "Add profile to existing config" → nepali-voice-ai
  oci_profile = "nepali-voice-ai"

  # OCIDs (sourced from env vars; never committed). Can't be inferred from the
  # profile name at HCL parse time, so we still need these two.
  tenancy_ocid     = get_env("TF_VAR_tenancy_ocid")
  compartment_ocid = get_env("TF_VAR_compartment_ocid")

  # Object Storage namespace for the state backend endpoint.
  # Get yours with: oci os ns get --profile nepali-voice-ai --query data --raw-output
  namespace = get_env("OCI_NAMESPACE")

  # Project-wide naming + inputs.
  project_name        = "nepali-voice-ai"
  ssh_public_key_path = pathexpand("~/.ssh/oci_nepali_a1.pub")

  # State bucket (created by bootstrap.sh).
  state_bucket = "nepali-voice-ai-tfstate"
}
