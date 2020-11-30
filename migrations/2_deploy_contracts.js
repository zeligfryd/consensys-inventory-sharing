var InventorySharing = artifacts.require("./InventorySharing.sol");

module.exports = function(deployer) {
  deployer.deploy(InventorySharing);
};
