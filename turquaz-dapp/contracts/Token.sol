//SPDX-License-Identifier: UNLICENSED

// Solidity files have to start with this pragma.
// It will be used by the Solidity compiler to validate its version.
pragma solidity ^0.8.9;

// We import this library to be able to use console.log
import "hardhat/console.sol";
import "./ERC20.sol";


// This is the main building block for smart contracts.
contract Token is ERC20 {
    // Some string type variables to identify the token.

    constructor(string memory _name, string memory _symbol, uint256 supply) ERC20(_name, _symbol) {
        _mint(msg.sender, supply);
    }
}
