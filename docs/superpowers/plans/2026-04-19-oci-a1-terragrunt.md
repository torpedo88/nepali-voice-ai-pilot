# OCI A1.Flex Terragrunt Infra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision a single OCI A1.Flex Always-Free ARM instance (4 OCPU / 24 GB / 100 GB / Ubuntu 22.04) on a fresh tenancy using Terragrunt, with state in OCI Object Storage.

**Architecture:** Idiomatic Terragrunt "modules + live" layout. Two reusable modules (`network`, `compute`). One env (`live/nepali/`) with two stacks wired by `dependency`. OCI provider auth via env vars, state backend via S3-compatibility API with Customer Secret Keys.

**Tech Stack:** Terraform `>= 1.6`, Terragrunt `>= 0.55`, OCI provider `~> 5.30`, OCI CLI (for bootstrap), `ssh-keygen`, bash.

**Source spec:** `docs/superpowers/specs/2026-04-19-oci-a1-terragrunt-design.md`

**Testing note:** Terraform modules don't get unit tests in this plan — verification is `terragrunt hclfmt --check`, `terraform fmt -check`, `terraform validate` (after provider install), `terragrunt plan` (mock-outputs enabled), and a single end-to-end `terragrunt apply` at the end. This matches the repo's convention (no formal test runner; `tests/test_setup.py` is import-only).

---

## File Structure

```
infra/
  .gitignore                         # Task 2
  README.md                          # Task 13
  bootstrap/
    bootstrap.sh                     # Task 12
  modules/
    network/
      versions.tf                    # Task 3
      variables.tf                   # Task 3
      main.tf                        # Task 4
      outputs.tf                     # Task 4
    compute/
      versions.tf                    # Task 6
      variables.tf                   # Task 6
      cloud-init.yaml                # Task 7
      main.tf                        # Task 8
      outputs.tf                     # Task 8
  live/
    nepali/
      env.hcl                        # Task 9
      terragrunt.hcl                 # Task 10
      network/
        terragrunt.hcl               # Task 11
      compute/
        terragrunt.hcl               # Task 11
```

---

## Task 1: Scaffold `infra/` root and commit empty skeleton

**Files:**
- Create: `infra/` (directory only)

- [ ] **Step 1: Create the directory skeleton**

```bash
cd /Users/abhishekmaharjan/nepali-voice-ai/nepali-voice-ai-pilot
mkdir -p infra/bootstrap
mkdir -p infra/modules/network
mkdir -p infra/modules/compute
mkdir -p infra/live/nepali/network
mkdir -p infra/live/nepali/compute
```

- [ ] **Step 2: Verify layout**

Run: `find infra -type d | sort`
Expected:
```
infra
infra/bootstrap
infra/live
infra/live/nepali
infra/live/nepali/compute
infra/live/nepali/network
infra/modules
infra/modules/compute
infra/modules/network
```

- [ ] **Step 3: Add a placeholder so git tracks the tree**

Create `infra/.keep` with empty content so the initial commit is not empty.

```bash
touch infra/.keep
```

- [ ] **Step 4: Commit**

```bash
git add infra/.keep
git commit -m "infra: scaffold Terragrunt directory layout"
```

---

## Task 2: Add `infra/.gitignore`

**Files:**
- Create: `infra/.gitignore`

- [ ] **Step 1: Write the gitignore**

Create `infra/.gitignore`:

```gitignore
# Terraform state + locks
*.tfstate
*.tfstate.*
*.tfstate.backup
.terraform/
.terraform.lock.hcl

# Terragrunt cache
.terragrunt-cache/

# Generated files (provider.tf, backend.tf, versions.tf written by root terragrunt.hcl)
**/provider.tf
**/backend.tf

# Secret tfvars (never commit)
*.tfvars.secret
*.auto.tfvars
terraform.tfvars

# OCI API keys
oci_api_key*.pem
s3_credentials
```

- [ ] **Step 2: Remove placeholder and verify gitignore is active**

```bash
rm infra/.keep
git status infra/
```
Expected: shows only `infra/.gitignore` as new.

- [ ] **Step 3: Commit**

```bash
git add infra/.gitignore
git rm --cached infra/.keep 2>/dev/null || true
git add -u infra/
git commit -m "infra: add Terraform + Terragrunt gitignore"
```

---

## Task 3: `network` module — `versions.tf` + `variables.tf`

**Files:**
- Create: `infra/modules/network/versions.tf`
- Create: `infra/modules/network/variables.tf`

- [ ] **Step 1: Write `versions.tf`**

Create `infra/modules/network/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.30"
    }
  }
}
```

- [ ] **Step 2: Write `variables.tf`**

Create `infra/modules/network/variables.tf`:

```hcl
variable "compartment_ocid" {
  description = "OCID of the compartment to create network resources in."
  type        = string
}

variable "project_name" {
  description = "Short name used as prefix/display-name for resources."
  type        = string
  default     = "nepali-voice-ai"
}

variable "vcn_cidr" {
  description = "CIDR block for the VCN."
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_cidr" {
  description = "CIDR block for the public subnet."
  type        = string
  default     = "10.0.1.0/24"
}

variable "allowed_ingress_ports" {
  description = "TCP ports opened to 0.0.0.0/0 via the security list."
  type        = list(number)
  default     = [22, 80, 443, 7860]
}
```

- [ ] **Step 3: Format-check**

Run: `terraform fmt -check -recursive infra/modules/network/`
Expected: exit 0, no output.

If not installed yet, install Terraform: `brew install terraform` (macOS).

- [ ] **Step 4: Commit**

```bash
git add infra/modules/network/versions.tf infra/modules/network/variables.tf
git commit -m "infra(network): add module versions and variables"
```

---

## Task 4: `network` module — `main.tf` + `outputs.tf`

**Files:**
- Create: `infra/modules/network/main.tf`
- Create: `infra/modules/network/outputs.tf`

- [ ] **Step 1: Write `main.tf`**

Create `infra/modules/network/main.tf`:

```hcl
resource "oci_core_vcn" "this" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = [var.vcn_cidr]
  display_name   = "${var.project_name}-vcn"
  dns_label      = "nepalivcn"
}

resource "oci_core_internet_gateway" "this" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.project_name}-ig"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.project_name}-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.this.id
  }
}

resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.this.id
  display_name   = "${var.project_name}-public-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  dynamic "ingress_security_rules" {
    for_each = var.allowed_ingress_ports
    content {
      protocol = "6" # TCP
      source   = "0.0.0.0/0"
      tcp_options {
        min = ingress_security_rules.value
        max = ingress_security_rules.value
      }
    }
  }

  # Path MTU discovery (OCI best practice)
  ingress_security_rules {
    protocol = "1" # ICMP
    source   = "0.0.0.0/0"
    icmp_options {
      type = 3
      code = 4
    }
  }
}

resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.this.id
  cidr_block                 = var.subnet_cidr
  display_name               = "${var.project_name}-public-subnet"
  dns_label                  = "nepalipub"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.public.id]
  prohibit_public_ip_on_vnic = false
}
```

- [ ] **Step 2: Write `outputs.tf`**

Create `infra/modules/network/outputs.tf`:

```hcl
output "vcn_id" {
  description = "OCID of the VCN."
  value       = oci_core_vcn.this.id
}

output "subnet_id" {
  description = "OCID of the public subnet."
  value       = oci_core_subnet.public.id
}

output "security_list_id" {
  description = "OCID of the public security list."
  value       = oci_core_security_list.public.id
}
```

- [ ] **Step 3: Validate module syntax**

```bash
cd infra/modules/network
terraform init -backend=false
terraform validate
cd -
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 4: Format-check**

Run: `terraform fmt -check -recursive infra/modules/network/`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add infra/modules/network/main.tf infra/modules/network/outputs.tf
git commit -m "infra(network): add VCN, subnet, IG, route table, security list"
```

---

## Task 5: Generate the SSH keypair (bootstrap prep)

**Files:**
- Create (locally, outside repo): `~/.ssh/oci_nepali_a1`, `~/.ssh/oci_nepali_a1.pub`

- [ ] **Step 1: Check if keypair already exists**

```bash
ls -la ~/.ssh/oci_nepali_a1 ~/.ssh/oci_nepali_a1.pub 2>/dev/null
```
If both files exist, skip to Step 3.

- [ ] **Step 2: Generate ed25519 keypair**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/oci_nepali_a1 -N "" -C "nepali-voice-ai oci a1"
```
Expected: writes private key (0600) and `.pub` file.

- [ ] **Step 3: Verify**

```bash
ls -la ~/.ssh/oci_nepali_a1 ~/.ssh/oci_nepali_a1.pub
cat ~/.ssh/oci_nepali_a1.pub
```
Expected: private key perms `-rw-------`, public key prints starting with `ssh-ed25519`.

No commit — key lives outside the repo.

---

## Task 6: `compute` module — `versions.tf` + `variables.tf`

**Files:**
- Create: `infra/modules/compute/versions.tf`
- Create: `infra/modules/compute/variables.tf`

- [ ] **Step 1: Write `versions.tf`**

Create `infra/modules/compute/versions.tf`:

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.30"
    }
  }
}
```

- [ ] **Step 2: Write `variables.tf`**

Create `infra/modules/compute/variables.tf`:

```hcl
variable "compartment_ocid" {
  description = "OCID of the compartment."
  type        = string
}

variable "project_name" {
  description = "Short name used as prefix/display-name for resources."
  type        = string
  default     = "nepali-voice-ai"
}

variable "subnet_id" {
  description = "OCID of the subnet to attach the primary VNIC to."
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key to inject via cloud-init/metadata."
  type        = string
}

variable "instance_shape_config" {
  description = "Flex shape config: OCPUs and memory (GB)."
  type = object({
    ocpus         = number
    memory_in_gbs = number
  })
  default = {
    ocpus         = 4
    memory_in_gbs = 24
  }
}

variable "boot_volume_size_in_gbs" {
  description = "Boot volume size in GB."
  type        = number
  default     = 100
}

variable "availability_domain_index" {
  description = "Zero-based index into the AD list returned by oci_identity_availability_domains."
  type        = number
  default     = 0
}

variable "hostname_label" {
  description = "DNS hostname label for the instance (must be RFC-1035 compliant)."
  type        = string
  default     = "nepali-a1"
}
```

- [ ] **Step 3: Format-check**

Run: `terraform fmt -check -recursive infra/modules/compute/`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add infra/modules/compute/versions.tf infra/modules/compute/variables.tf
git commit -m "infra(compute): add module versions and variables"
```

---

## Task 7: `compute` module — `cloud-init.yaml`

**Files:**
- Create: `infra/modules/compute/cloud-init.yaml`

- [ ] **Step 1: Write `cloud-init.yaml`**

Create `infra/modules/compute/cloud-init.yaml`:

```yaml
#cloud-config

package_update: true
package_upgrade: true

packages:
  - python3.11
  - python3.11-venv
  - python3-pip
  - ffmpeg
  - git
  - tmux
  - htop
  - ufw

runcmd:
  - [ ufw, allow, "22/tcp" ]
  - [ ufw, allow, "80/tcp" ]
  - [ ufw, allow, "443/tcp" ]
  - [ ufw, allow, "7860/tcp" ]
  - [ ufw, --force, enable ]
  - [ systemctl, enable, --now, ufw ]

write_files:
  - path: /etc/motd
    content: |
      Nepali Voice AI — OCI A1.Flex
      Provisioned by Terragrunt. See docs/superpowers/specs/ in the repo.
    permissions: "0644"
```

- [ ] **Step 2: Lint YAML syntax**

```bash
python3 -c "import yaml, sys; yaml.safe_load(open('infra/modules/compute/cloud-init.yaml'))"
```
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add infra/modules/compute/cloud-init.yaml
git commit -m "infra(compute): add cloud-init with python3.11, ffmpeg, UFW"
```

---

## Task 8: `compute` module — `main.tf` + `outputs.tf`

**Files:**
- Create: `infra/modules/compute/main.tf`
- Create: `infra/modules/compute/outputs.tf`

- [ ] **Step 1: Write `main.tf`**

Create `infra/modules/compute/main.tf`:

```hcl
data "oci_identity_availability_domains" "this" {
  compartment_id = var.compartment_ocid
}

data "oci_core_images" "ubuntu_2204_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "a1" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.this.availability_domains[var.availability_domain_index].name
  display_name        = "${var.project_name}-a1"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.instance_shape_config.ocpus
    memory_in_gbs = var.instance_shape_config.memory_in_gbs
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_2204_arm.images[0].id
    boot_volume_size_in_gbs = var.boot_volume_size_in_gbs
  }

  create_vnic_details {
    subnet_id              = var.subnet_id
    assign_public_ip       = true
    hostname_label         = var.hostname_label
    skip_source_dest_check = false
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  lifecycle {
    ignore_changes = [
      # Image OCID rotates as Canonical publishes new builds; don't churn the instance.
      source_details[0].source_id,
    ]
  }
}
```

- [ ] **Step 2: Write `outputs.tf`**

Create `infra/modules/compute/outputs.tf`:

```hcl
output "instance_id" {
  description = "OCID of the A1.Flex instance."
  value       = oci_core_instance.a1.id
}

output "public_ip" {
  description = "Public IP of the primary VNIC."
  value       = oci_core_instance.a1.public_ip
}

output "private_ip" {
  description = "Private IP of the primary VNIC."
  value       = oci_core_instance.a1.private_ip
}

output "ssh_connection_string" {
  description = "Ready-to-paste SSH command."
  value       = "ssh -i ${var.ssh_public_key_path == "" ? "~/.ssh/oci_nepali_a1" : replace(var.ssh_public_key_path, ".pub", "")} ubuntu@${oci_core_instance.a1.public_ip}"
}
```

- [ ] **Step 3: Validate module syntax**

```bash
cd infra/modules/compute
terraform init -backend=false
terraform validate
cd -
```
Expected: `Success! The configuration is valid.`

- [ ] **Step 4: Format-check**

Run: `terraform fmt -check -recursive infra/modules/compute/`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add infra/modules/compute/main.tf infra/modules/compute/outputs.tf
git commit -m "infra(compute): add A1.Flex instance, image lookup, cloud-init wiring"
```

---

## Task 9: `live/nepali/env.hcl`

**Files:**
- Create: `infra/live/nepali/env.hcl`

- [ ] **Step 1: Write `env.hcl`**

Create `infra/live/nepali/env.hcl`:

```hcl
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
```

- [ ] **Step 2: Commit**

```bash
git add infra/live/nepali/env.hcl
git commit -m "infra(live): add nepali env.hcl with region and common locals"
```

---

## Task 10: `live/nepali/terragrunt.hcl` (root config)

**Files:**
- Create: `infra/live/nepali/terragrunt.hcl`

- [ ] **Step 1: Write root terragrunt config**

Create `infra/live/nepali/terragrunt.hcl`:

```hcl
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
```

- [ ] **Step 2: Format-check**

```bash
cd infra/live/nepali
terragrunt hclfmt --check
cd -
```
Expected: exit 0, no output.

If `terragrunt` not installed: `brew install terragrunt`.

- [ ] **Step 3: Commit**

```bash
git add infra/live/nepali/terragrunt.hcl
git commit -m "infra(live): add root terragrunt config with S3 state + OCI provider gen"
```

---

## Task 11: Child stacks — `network/terragrunt.hcl` + `compute/terragrunt.hcl`

**Files:**
- Create: `infra/live/nepali/network/terragrunt.hcl`
- Create: `infra/live/nepali/compute/terragrunt.hcl`

- [ ] **Step 1: Write network stack**

Create `infra/live/nepali/network/terragrunt.hcl`:

```hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/network"
}
```

- [ ] **Step 2: Write compute stack**

Create `infra/live/nepali/compute/terragrunt.hcl`:

```hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/compute"
}

dependency "network" {
  config_path = "../network"

  mock_outputs = {
    subnet_id = "ocid1.subnet.oc1..mock"
  }
  mock_outputs_allowed_terraform_commands = ["validate", "plan", "init"]
}

inputs = {
  subnet_id = dependency.network.outputs.subnet_id
}
```

- [ ] **Step 3: Format-check**

```bash
cd infra/live/nepali
terragrunt hclfmt --check
cd -
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add infra/live/nepali/network/terragrunt.hcl infra/live/nepali/compute/terragrunt.hcl
git commit -m "infra(live): wire network and compute stacks with dependency"
```

---

## Task 12: `bootstrap/bootstrap.sh`

**Files:**
- Create: `infra/bootstrap/bootstrap.sh`

- [ ] **Step 1: Write the script**

Create `infra/bootstrap/bootstrap.sh`:

```bash
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
```

- [ ] **Step 2: Make executable + lint**

```bash
chmod +x infra/bootstrap/bootstrap.sh
bash -n infra/bootstrap/bootstrap.sh
```
Expected: no output, exit 0.

If `shellcheck` is available:
```bash
shellcheck infra/bootstrap/bootstrap.sh
```
Expected: no warnings (or only informational).

- [ ] **Step 3: Commit**

```bash
git add infra/bootstrap/bootstrap.sh
git commit -m "infra(bootstrap): add idempotent setup script for SSH key + state bucket"
```

---

## Task 13: `infra/README.md`

**Files:**
- Create: `infra/README.md`

- [ ] **Step 1: Write the README**

Create `infra/README.md`:

````markdown
# `infra/` — OCI A1.Flex via Terragrunt

Provisions one Always-Free A1.Flex instance (4 OCPU / 24 GB / 100 GB / Ubuntu 22.04 ARM) on a fresh OCI tenancy. State lives in OCI Object Storage via the S3-compat API.

Design: [`../docs/superpowers/specs/2026-04-19-oci-a1-terragrunt-design.md`](../docs/superpowers/specs/2026-04-19-oci-a1-terragrunt-design.md)
Plan: [`../docs/superpowers/plans/2026-04-19-oci-a1-terragrunt.md`](../docs/superpowers/plans/2026-04-19-oci-a1-terragrunt.md)

## Prereqs

- OCI tenancy + user with a **named CLI profile** `nepali-voice-ai` in `~/.oci/config` (`oci setup config` → add profile)
- OCI CLI: `brew install oci-cli`
- Terraform `>= 1.6`: `brew install terraform`
- Terragrunt `>= 0.55`: `brew install terragrunt`
- Customer Secret Key in OCI Console (Identity → Users → you → Customer Secret Keys) — used for the Object Storage S3 API

## Env vars

Export these in your shell (e.g. `~/.zshrc` or a `.envrc` via direnv):

```bash
export TF_VAR_tenancy_ocid="ocid1.tenancy.oc1..xxx"
export TF_VAR_compartment_ocid="ocid1.compartment.oc1..xxx"  # can equal tenancy_ocid for root
export OCI_NAMESPACE="$(oci os ns get --profile nepali-voice-ai --query data --raw-output)"
```

User OCID, fingerprint, and private key path are read by the OCI provider from the `[nepali-voice-ai]` profile in `~/.oci/config` — no env vars needed for those.

Also edit `live/nepali/env.hcl` if your home region isn't `us-phoenix-1`.

## Bootstrap (once)

```bash
./bootstrap/bootstrap.sh
```

Generates `~/.ssh/oci_nepali_a1{,.pub}`, prompts for Customer Secret Key if `~/.oci/s3_credentials` is missing, and creates the state bucket `nepali-voice-ai-tfstate`.

## Apply

```bash
cd live/nepali/network && terragrunt apply
cd ../compute         && terragrunt apply
```

`compute` outputs `public_ip` and `ssh_connection_string`.

## Verify

```bash
terragrunt output ssh_connection_string
ssh -i ~/.ssh/oci_nepali_a1 ubuntu@<public_ip>

# On the box:
python3.11 --version    # Python 3.11.x
ffmpeg -version         # ffmpeg n4.x / n5.x
sudo ufw status         # 22, 80, 443, 7860 allowed
```

## Destroy

```bash
cd live/nepali/compute && terragrunt destroy
cd ../network          && terragrunt destroy
```

## Layout

```
infra/
├── bootstrap/bootstrap.sh
├── modules/
│   ├── network/        # VCN + public subnet + IG + security list
│   └── compute/        # A1.Flex instance + cloud-init
└── live/nepali/
    ├── env.hcl
    ├── terragrunt.hcl  # root: state backend, provider gen
    ├── network/
    └── compute/
```

## Troubleshooting

- **`Error: 500 Out of host capacity`** — Free-tier A1 is popular. Retry is built in (3 attempts, 60s apart). Otherwise `terragrunt apply` again later, or set `availability_domain_index = 1` in `live/nepali/compute/terragrunt.hcl` `inputs` to try a different AD.
- **State backend 403** — Customer Secret Key wrong or `OCI_NAMESPACE` mismatched. Verify with `oci os ns get`.
- **SSH key rotation** — changing `ssh_public_key_path` triggers instance replacement. Expected for this pilot.
````

- [ ] **Step 2: Commit**

```bash
git add infra/README.md
git commit -m "infra: add README with bootstrap, apply, verify, destroy steps"
```

---

## Task 14: End-to-end verification (manual)

**Files:** none created; this exercises the live path.

- [ ] **Step 1: Export env vars (if not already)**

Use the block from `infra/README.md` → `Env vars`. Verify:

```bash
echo "$TF_VAR_tenancy_ocid" | head -c 20
echo "$OCI_NAMESPACE"
```
Expected: values non-empty.

- [ ] **Step 2: Run bootstrap**

```bash
./infra/bootstrap/bootstrap.sh
```
Expected: ends with "Bootstrap complete. Next: …". No errors.

- [ ] **Step 3: `terragrunt plan` on network**

```bash
cd infra/live/nepali/network
terragrunt init
terragrunt plan
```
Expected: plan shows ~5 resources to add (VCN, IG, route table, SL, subnet). No errors.

- [ ] **Step 4: `terragrunt apply` on network**

```bash
terragrunt apply -auto-approve
```
Expected: Apply complete! Resources: 5 added.

- [ ] **Step 5: `terragrunt plan` on compute**

```bash
cd ../compute
terragrunt init
terragrunt plan
```
Expected: plan shows 1 resource to add (oci_core_instance.a1). `subnet_id` is the real OCID from the network stack.

- [ ] **Step 6: `terragrunt apply` on compute**

```bash
terragrunt apply -auto-approve
```
Expected: Apply complete! Outputs include `public_ip` and `ssh_connection_string`. If "Out of host capacity" — wait, retry.

- [ ] **Step 7: SSH + cloud-init verification**

```bash
IP=$(terragrunt output -raw public_ip)
# Wait ~2 min for cloud-init to finish installing packages
ssh -o StrictHostKeyChecking=accept-new -i ~/.ssh/oci_nepali_a1 ubuntu@$IP 'python3.11 --version && ffmpeg -version | head -1 && sudo ufw status | grep -E "22|80|443|7860"'
```
Expected:
- `Python 3.11.x`
- `ffmpeg version …`
- Four UFW rules listed for 22, 80, 443, 7860.

- [ ] **Step 8: Final `terragrunt plan` shows no drift**

In both `network/` and `compute/`:
```bash
terragrunt plan
```
Expected: `No changes. Your infrastructure matches the configuration.`

- [ ] **Step 9: Commit nothing (state is remote, code already committed)**

```bash
cd /Users/abhishekmaharjan/nepali-voice-ai/nepali-voice-ai-pilot
git status
```
Expected: clean working tree.

---

## Self-Review Notes

- **Spec coverage:** Every section of the design spec maps to a task:
  - Repo layout → Task 1, 2
  - Root terragrunt + state backend → Task 10
  - Network module → Task 3, 4
  - Compute module + cloud-init → Task 6, 7, 8
  - env.hcl → Task 9
  - Child stacks + dependency → Task 11
  - bootstrap.sh → Task 12
  - Apply order + README + verification → Task 13, 14
  - Error handling (A1 capacity retry) → Task 10 (retryable_errors block)
- **No placeholders:** every code block is complete.
- **Type/name consistency:** variable names, output names, and `dependency.network.outputs.subnet_id` all align across tasks.
- **Out-of-scope items from spec** (DNS, monitoring, OKE, CI/CD, multi-env) deliberately have no tasks — matches YAGNI scope.
