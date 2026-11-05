// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import "../src/contracts/UltraRentzEscrow.sol";
import "../src/contracts/EscrowFactory.sol";

contract DeployURZ is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the Implementation contract
        UltraRentzEscrow implementation = new UltraRentzEscrow();

        // 2. Deploy the Factory
        EscrowFactory factory = new EscrowFactory(address(implementation));

        vm.stopBroadcast();
        
        // Logs for verification
        console.log("Implementation deployed at:", address(implementation));
        console.log("Factory deployed at:", address(factory));
        console.log("System Ready. Use factory.createEscrow(...) to deploy configured clones.");
    }
}