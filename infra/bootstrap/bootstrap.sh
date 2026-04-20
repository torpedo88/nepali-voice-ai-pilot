#!/usr/bin/env bash
# bootstrap.sh — one-shot setup before the first `terragrunt apply`.
#
# Idempotent. Safe to re-run. Requires:
#   - oci CLI installed and ~/.oci/config with a [nepali-voice-ai] profile
#   - env vars exported: TF_VAR_tenancy_ocid, TF_VAR_compartment_ocid, OCI_NAMESPACE
set -euo pipefail

OCI_PROFILE="nepali-voice-ai"
SSH_KEY="${HOME}/.ssh/oci_nepali_a1"
S3_CREDS="${HOME}/.oci/s3_credentials"
BUCKET="nepali-voice-ai-tfstate"

say()  { printf "\033[1;34m[bootstrap]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[bootstrap]\033[0m %s\n" "$*" >&2; }
die()  { printf "\033[1;31m[bootstrap]\033[0m %s\n" "$*" >&2; exit 1; }

# --- 1. Prereqs ------------------------------------------------------------
say "Checking oci CLI..."
command -v oci >/dev/null 2>&1 || die "oci CLI not found. Install: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm"
[ -f "${HOME}/.oci/config" ] || die "~/.oci/config not found. Run: oci setup config"

# Profile must exist in ~/.oci/config
grep -q "^\[${OCI_PROFILE}\]" "${HOME}/.oci/config" || die "Profile [${OCI_PROFILE}] not found in ~/.oci/config. Run: oci setup config and add profile '${OCI_PROFILE}'."

# Profile must actually work against OCI
say "Verifying profile '${OCI_PROFILE}' can call OCI..."
oci iam region list --profile "${OCI_PROFILE}" --query 'data[0].name' --raw-output >/dev/null || die "OCI call failed with profile '${OCI_PROFILE}'. Check that the API public key is uploaded in OCI Console → User → API Keys."

for v in TF_VAR_tenancy_ocid TF_VAR_compartment_ocid OCI_NAMESPACE; do
  [ -n "${!v:-}" ] || die "env var $v not set"
done

# --- 2. SSH key ------------------------------------------------------------
if [ ! -f "${SSH_KEY}" ]; then
  say "Generating SSH keypair at ${SSH_KEY}..."
  ssh-keygen -t ed25519 -f "${SSH_KEY}" -N "" -C "nepali-voice-ai oci a1"
else
  say "SSH keypair already exists at ${SSH_KEY}. Skipping."
fi

# --- 3. S3-compat credentials ---------------------------------------------
if [ ! -f "${S3_CREDS}" ]; then
  warn "~/.oci/s3_credentials not found."
  warn "Create a Customer Secret Key in OCI Console:"
  warn "  Identity & Security → Users → (you) → Customer Secret Keys → Generate"
  read -r -p "Access Key ID: " AK
  read -r -s -p "Secret Key: " SK; echo
  mkdir -p "${HOME}/.oci"
  cat > "${S3_CREDS}" <<EOF
[default]
aws_access_key_id = ${AK}
aws_secret_access_key = ${SK}
EOF
  chmod 600 "${S3_CREDS}"
  say "Wrote ${S3_CREDS}."
else
  say "${S3_CREDS} already present. Skipping."
fi

# --- 4. State bucket ------------------------------------------------------
say "Ensuring state bucket '${BUCKET}' exists in compartment ${TF_VAR_compartment_ocid}..."
if oci os bucket get --name "${BUCKET}" --namespace-name "${OCI_NAMESPACE}" --profile "${OCI_PROFILE}" >/dev/null 2>&1; then
  say "Bucket exists. Skipping."
else
  oci os bucket create \
    --name "${BUCKET}" \
    --compartment-id "${TF_VAR_compartment_ocid}" \
    --namespace-name "${OCI_NAMESPACE}" \
    --versioning Enabled \
    --profile "${OCI_PROFILE}"
  say "Bucket created."
fi

# --- 5. Next steps --------------------------------------------------------
cat <<EOF

Bootstrap complete. Next:

  cd infra/live/nepali/network && terragrunt apply
  cd ../compute                && terragrunt apply

Outputs from compute will give you public_ip + ssh_connection_string.
EOF
