# `infra/` — OCI A1.Flex via Terragrunt

Provisions one Always-Free A1.Flex instance (4 OCPU / 24 GB / 100 GB / Ubuntu 22.04 ARM) on a fresh OCI tenancy. State lives in OCI Object Storage via the S3-compat API.

Design: [`../docs/superpowers/specs/2026-04-19-oci-a1-terragrunt-design.md`](../docs/superpowers/specs/2026-04-19-oci-a1-terragrunt-design.md)
Plan: [`../docs/superpowers/plans/2026-04-19-oci-a1-terragrunt.md`](../docs/superpowers/plans/2026-04-19-oci-a1-terragrunt.md)

## Prereqs

- OCI tenancy + user with a **named CLI profile** `nepali-voice-ai` in `~/.oci/config` (`oci setup config` → add profile)
- OCI CLI: `brew install oci-cli`
- Terraform `>= 1.6`: the Homebrew core formula is stuck at 1.5.7. Use HashiCorp's tap (`brew tap hashicorp/tap && brew install hashicorp/tap/terraform`) or download the binary from https://releases.hashicorp.com/terraform/ directly.
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

## Formatting

```bash
# Terragrunt 0.99+ uses `hcl format` (old `hclfmt` is deprecated)
terragrunt hcl format --check --file live/nepali/terragrunt.hcl
terraform fmt -check -recursive modules/
```

## Troubleshooting

- **`Error: 500 Out of host capacity`** — Free-tier A1 is popular. Retry is built in (3 attempts, 60s apart). Otherwise `terragrunt apply` again later, or set `availability_domain_index = 1` in `live/nepali/compute/terragrunt.hcl` `inputs` to try a different AD.
- **State backend 403** — Customer Secret Key wrong or `OCI_NAMESPACE` mismatched. Verify with `oci os ns get --profile nepali-voice-ai`.
- **SSH key rotation** — changing `ssh_public_key_path` triggers instance replacement. Expected for this pilot.
