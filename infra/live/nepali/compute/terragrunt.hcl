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
  subnet_id                 = dependency.network.outputs.subnet_id
  availability_domain_index = 2 # AD-3
  instance_shape_config = {
    ocpus         = 2
    memory_in_gbs = 12
  }
}
