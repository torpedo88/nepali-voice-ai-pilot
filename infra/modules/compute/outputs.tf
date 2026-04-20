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
