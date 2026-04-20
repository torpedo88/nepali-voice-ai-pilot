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
