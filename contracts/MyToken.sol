// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyToken
 * @dev Token ERC20 dasar dengan fungsi mint (khusus owner) dan burn.
 */
contract MyToken is ERC20, ERC20Burnable, Ownable {
    /**
     * @dev Constructor untuk membuat token.
     * @param initialOwner Alamat yang akan menjadi pemilik kontrak.
     */
    constructor(address initialOwner) ERC20("My Real Token", "MRT") Ownable(initialOwner) {
        // Cetak 1 juta token untuk pemilik agar punya saldo awal
        _mint(initialOwner, 1_000_000 * 10**decimals());
    }

    /**
     * @dev Fungsi untuk mencetak token baru. Hanya bisa dipanggil oleh owner.
     * @param to Alamat penerima token baru.
     * @param amount Jumlah token yang akan dicetak.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}