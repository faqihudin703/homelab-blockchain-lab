// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BridgePoW
 * @dev Kontrak untuk mengunci token di jaringan asal (PoW).
 */
contract BridgePoW is Ownable, ReentrancyGuard {
    IERC20 public immutable token;

    event TokensLocked(
        address indexed user,
        uint256 amount
    );
    
    event TokensReleased(
        address indexed user,
        uint256 amount
    );

    /**
     * @param _tokenAddress Alamat kontrak MyToken (MRT) yang akan dikelola.
     * @param initialOwner Alamat yang akan menjadi pemilik (relayer/admin).
     */
    constructor(address _tokenAddress, address initialOwner) Ownable(initialOwner) {
        token = IERC20(_tokenAddress);
    }

    /**
     * @dev Pengguna memanggil fungsi ini untuk mengunci token mereka.
     * Kontrak ini harus diberi izin (approve) terlebih dahulu.
     */
    function lock(uint256 amount) public nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Pindahkan token dari pengguna ke kontrak bridge ini
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");
        
        emit TokensLocked(msg.sender, amount);
    }

    /**
     * @dev Owner (Relayer) memanggil fungsi ini untuk melepaskan token kembali ke pengguna.
     * Ini adalah bagian dari alur kembali dari jaringan PoA.
     */
    function release(address to, uint256 amount) public onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance in bridge");

        bool success = token.transfer(to, amount);
        require(success, "Token transfer failed");

        emit TokensReleased(to, amount);
    }
}