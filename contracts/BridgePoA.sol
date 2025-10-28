// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BridgePoA
 * @dev Kontrak ini adalah token wrapped (wMRT) dan juga pintu gerbang di jaringan tujuan (PoA).
 */
contract BridgePoA is ERC20, ERC20Burnable, Ownable {
    
    event TokensMinted(address indexed user, uint256 amount);
    // Event TokensBurned sudah ada di ERC20Burnable

    /**
     * @param initialOwner Alamat yang akan menjadi pemilik (relayer).
     */
    constructor(address initialOwner) 
        ERC20("Wrapped My Token", "wMRT") 
        Ownable(initialOwner) 
    {}

    /**
     * @dev Owner (Relayer) memanggil ini untuk mencetak token baru kepada pengguna.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Pengguna memanggil `burn` (dari ERC20Burnable) untuk memulai
     * proses pengembalian token ke jaringan asal.
     * Relayer akan mendengarkan event 'Transfer' dengan 'from' = msg.sender dan 'to' = address(0).
     */
}