// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Script, console} from "forge-std/Script.sol";
import "../src/contracts/RentDepositVault.sol";

contract DeployVault is Script {
    address constant ARC_TESTNET_USDC = 0x3600000000000000000000000000000000000000;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        RentDepositVault vault = new RentDepositVault(
            ARC_TESTNET_USDC,
            deployer, // aiAgent — your wallet
            deployer  // arbiter — your wallet
        );

        vm.stopBroadcast();

        console.log("RentDepositVault deployed at:", address(vault));
        console.log("USDC (Arc testnet):", ARC_TESTNET_USDC);
        console.log("Agent / Arbiter:", deployer);
    }
}