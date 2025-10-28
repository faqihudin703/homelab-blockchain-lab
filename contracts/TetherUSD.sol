// contracts/TetherUSD.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TetherUSD is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Tether USD", "USDT") Ownable(initialOwner) {}

    // Fungsi mint untuk owner agar bisa membuat suplai awal
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}