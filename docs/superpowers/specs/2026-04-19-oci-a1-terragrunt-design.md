# OCI A1.Flex Instance via Terragrunt — Design

**Date:** 2026-04-19
**Author:** Avsek (Abhishek) Maharjan
**Status:** Draft — pending implementation plan

## Goal

Provision infrastructure on a fresh OCI tenancy to host a single ARM-based
Always-Free A1.Flex instance suitable for running the Nepali Voice AI pilot
(Whisper STT + Claude + Edge-TTS). Use Terragrunt in its idiomatic
"modules + live" layout so the setup can grow to additional instances or
environments later without restructuring.

## Non-goals

- No DNS, TLS, reverse proxy, or application deployment (infra only).
- No monitoring, logging, or backup beyond OCI defaults.
- No container orchestration (OKE, k3s).
- No separate dev/prod environments.
- No CI/CD automation for `terragrunt apply` — manual from laptop.

## Scope

One A1.Flex instance, 4 OCPU / 24 GB RAM, 100 GB boot volume, Ubuntu 22.04
LTS (aarch64), public IP, SSH + web ports (22, 80, 443, 7860) open to the
internet. Fresh VCN + public subnet + internet gateway + security list.
Terraform state in OCI Object Storage via the S3-compatibility API.

## Repo Layout

```
infra/
  .gitignore                     # *.tfstate*, .terraform/, *.tfvars.secret, oci_api_key*.pem
  README.md                      # bootstrap + apply instructions
  bootstrap/
    bootstrap.sh                 # one-shot: SSH key, s3 credentials, state bucket
  modules/
    network/                     # VCN + public subnet + IG + route table + security list
      main.tf
      variables.tf
      outputs.tf
      versions.tf
    compute/                     # A1.Flex instance + cloud-init
      main.tf
      variables.tf
      outputs.tf
      versions.tf
      cloud-init.yaml
  live/
    nepali/
      terragrunt.hcl             # root: remote_state, provider gen, common inputs
      env.hcl                    # non-secret locals (region, project_name, etc.)
      network/
        terragrunt.hcl
      compute/
        terragrunt.hcl           # dependency on network
```

## Root `terragrunt.hcl` Responsibilities

- **`remote_state`** — OCI Object Storage via Terraform's `s3` backend
  pointed at `https://<namespace>.compat.objectstorage.<region>.oraclecloud.com`.
  State key = `${path_relative_to_include()}/terraform.tfstate`.
  Auth via Customer Secret Keys in `~/.oci/s3_credentials`.
  No locking backend — solo single-writer use is acceptable; migrate to a
  locking-aware backend if/when sharing.
- **`generate "provider"`** — writes `provider.tf`. `region` is
  interpolated directly from `env.hcl` locals (single source of truth);
  identity fields (`tenancy_ocid`, `user_ocid`, `fingerprint`,
  `private_key_path`) come from env vars (`TF_VAR_tenancy_ocid`,
  `TF_VAR_user_ocid`, `TF_VAR_fingerprint`, `TF_VAR_private_key_path`) so
  secrets never touch the repo.
- **`generate "versions"`** — pins `terraform >= 1.6`, `oci ~> 5.30`.
- **`inputs`** — merges `env.hcl` values into every child stack.

## Module: `network`

**Resources:**
- `oci_core_vcn` — CIDR `10.0.0.0/16`, DNS label `nepalivcn`.
- `oci_core_internet_gateway` — enabled, attached to VCN.
- `oci_core_route_table` — default route `0.0.0.0/0` → IG.
- `oci_core_subnet` — regional public subnet `10.0.1.0/24`, associates the
  route table above.
- `oci_core_security_list` — stateful:
  - Egress: all protocols to `0.0.0.0/0`.
  - Ingress TCP from `0.0.0.0/0` on ports **22, 80, 443, 7860**.
  - Ingress ICMP type 3 code 4 (path MTU discovery).

**Inputs:** `compartment_ocid`, `project_name`, `vcn_cidr`
(default `10.0.0.0/16`), `subnet_cidr` (default `10.0.1.0/24`).

**Outputs:** `vcn_id`, `subnet_id`, `security_list_id`.

## Module: `compute`

**Resources:**
- `data "oci_identity_availability_domains"` — to pick an AD.
- `data "oci_core_images"` — filters
  `operating_system = "Canonical Ubuntu"`, `operating_system_version = "22.04"`,
  `shape = "VM.Standard.A1.Flex"`; uses `images[0].id` so the module stays
  valid as Canonical publishes new ARM builds.
- `oci_core_instance`:
  - Shape `VM.Standard.A1.Flex` with `ocpus = 4`, `memory_in_gbs = 24`.
  - Availability domain:
    `availability_domains[var.availability_domain_index].name`
    (default index 0).
  - Boot volume: **100 GB**.
  - `create_vnic_details.assign_public_ip = true`, hostname label
    `nepali-a1`.
  - `metadata.ssh_authorized_keys` = contents of public key file.
  - `metadata.user_data` = base64-encoded `cloud-init.yaml`.

**`cloud-init.yaml`:**
- `apt update && apt upgrade -y`.
- Install `python3.11`, `python3.11-venv`, `python3-pip`, `ffmpeg`, `git`,
  `tmux`, `htop`, `ufw`.
- Enable UFW with 22, 80, 443, 7860 allowed (belt-and-suspenders vs OCI SL).
- Keep default `ubuntu` user; no root SSH.

**Inputs:** `compartment_ocid`, `project_name`, `subnet_id` (from network
dep), `ssh_public_key_path`, `instance_shape_config`
(`{ ocpus = 4, memory_in_gbs = 24 }` default), `boot_volume_size_in_gbs`
(default 100), `availability_domain_index` (default 0).

**Outputs:** `instance_id`, `public_ip`, `private_ip`,
`ssh_connection_string` (e.g. `ssh -i ~/.ssh/oci_nepali_a1 ubuntu@<ip>`).

## Terragrunt Child Stacks

**`live/nepali/network/terragrunt.hcl`:**
```hcl
include "root" { path = find_in_parent_folders() }
terraform { source = "../../../modules/network" }
```

**`live/nepali/compute/terragrunt.hcl`:**
```hcl
include "root" { path = find_in_parent_folders() }
terraform { source = "../../../modules/compute" }
dependency "network" {
  config_path = "../network"
  mock_outputs = { subnet_id = "ocid1.subnet.oc1..mock" }
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
}
inputs = { subnet_id = dependency.network.outputs.subnet_id }
```

## `env.hcl` (committed, no secrets)

```hcl
locals {
  region              = "us-ashburn-1"  # override for your home region
  compartment_ocid    = get_env("TF_VAR_compartment_ocid")
  tenancy_ocid        = get_env("TF_VAR_tenancy_ocid")
  namespace           = get_env("OCI_NAMESPACE")
  project_name        = "nepali-voice-ai"
  ssh_public_key_path = "~/.ssh/oci_nepali_a1.pub"
}
```

## `bootstrap/bootstrap.sh`

Idempotent, run once before the first `terragrunt apply`:
1. Verify `oci` CLI is installed and `~/.oci/config` exists.
2. If `~/.ssh/oci_nepali_a1` is missing:
   `ssh-keygen -t ed25519 -f ~/.ssh/oci_nepali_a1 -N "" -C "nepali-voice-ai oci a1"`.
3. If `~/.oci/s3_credentials` is missing, prompt for OCI Customer Secret Key
   ID and secret, write `[default]` block.
4. Create state bucket if absent:
   `oci os bucket create --name nepali-voice-ai-tfstate --compartment-id $TF_VAR_compartment_ocid`.
5. Print next-step commands.

## Apply Order

Documented in `infra/README.md`:
```bash
./infra/bootstrap/bootstrap.sh
cd infra/live/nepali/network && terragrunt apply
cd ../compute                && terragrunt apply
# → outputs public_ip + ssh_connection_string
```

## Error Handling

- **A1 out-of-capacity** — Terraform errors out cleanly; user re-runs
  `terragrunt apply` later. Optionally add `retry_sleep_interval_sec` and a
  pattern in `retryable_errors` in root config.
- **State bucket missing** — `bootstrap.sh` creates it; README enforces the
  order.
- **Wrong AD** — override `availability_domain_index` without editing the
  module.
- **SSH key rotation** — triggers instance replacement on next apply
  (acceptable for a pilot; documented in README).

## Testing / Verification

No automated tests (matches the rest of the repo). Manual checks in
`infra/README.md`:
1. `terragrunt plan` in both stacks shows no diff after apply.
2. `ssh -i ~/.ssh/oci_nepali_a1 ubuntu@<public_ip>` succeeds.
3. On the box: `python3.11 --version`, `ffmpeg -version` (cloud-init ran).
4. `nc -zv <public_ip> 7860` (port reachable; connection refused is fine
   until an app listens).
5. `terragrunt hclfmt --check` + `terraform fmt -check -recursive modules/`
   pass.

## Secrets Handling

- Nothing sensitive committed to repo.
- OCIDs, API fingerprint, private key path, Customer Secret Keys live in
  local shell env / `~/.oci/`.
- `infra/.gitignore` covers `*.tfstate*`, `.terraform/`,
  `*.tfvars.secret`, `oci_api_key*.pem`.

## Future Extensions (deliberately deferred)

- Add a second env by copying `live/nepali/` to `live/nepali-prod/`.
- Add an NSG module for per-instance rules when adding internal services.
- Add DNS + Let's Encrypt + Caddy/nginx when fronting a real app.
- Migrate state to a locking-aware backend if the tree becomes multi-user.
