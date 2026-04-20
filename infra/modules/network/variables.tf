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
