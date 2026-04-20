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
