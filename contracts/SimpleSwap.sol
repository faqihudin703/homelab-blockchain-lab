// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SimpleSwapV2
 * @dev DEX AMM sederhana terinspirasi Uniswap.
 * Contract ini juga merupakan token ERC20 untuk melacak saham likuiditas (LP Token).
 * PENTING: Kode ini untuk tujuan edukasi, rumus harga disederhanakan.
 */
contract SimpleSwapV2 is ERC20, ReentrancyGuard, Ownable {
    IERC20 public immutable token; // Alamat kontrak MyToken (MRT)

    // Fee untuk setiap swap, 0.3%. 3/1000
    uint256 public constant SWAP_FEE_NUMERATOR = 3;
    uint256 public constant SWAP_FEE_DENOMINATOR = 1000;

    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 lpTokensMinted);
    event LiquidityRemoved(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 lpTokensBurned);
    event Swapped(address indexed swapper, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenAddress, address initialOwner)
        ERC20("SimpleSwap LP Token", "SSLP")
        Ownable(initialOwner)
    {
        token = IERC20(_tokenAddress);
    }

    /**
     * @dev Menambahkan likuiditas ke dalam pool.
     * Akan mencetak LP token untuk penyedia.
     */
    function addLiquidity(uint256 _tokenAmountDesired) public payable nonReentrant {
        uint256 ethAmount = msg.value;
        require(ethAmount > 0 && _tokenAmountDesired > 0, "Must provide both ETH and tokens");
        
        uint256 lpTotalSupply = totalSupply();
        uint256 ethReserve = address(this).balance - ethAmount;
        uint256 tokenReserve = token.balanceOf(address(this));
        
        uint256 tokenAmount;
        uint256 lpTokensToMint;

        if (lpTotalSupply == 0) {
            // Ini adalah likuiditas pertama, rasio ditentukan di sini
            tokenAmount = _tokenAmountDesired;
            lpTokensToMint = 100 * 10**decimals(); // Cetak 100 LP token awal
        } else {
            // Rasio harus sesuai dengan pool yang ada
            tokenAmount = (ethAmount * tokenReserve) / ethReserve;
            require(tokenAmount <= _tokenAmountDesired, "Token amount exceeds desired limit");
            lpTokensToMint = (ethAmount * lpTotalSupply) / ethReserve;
        }

        token.transferFrom(msg.sender, address(this), tokenAmount);
        _mint(msg.sender, lpTokensToMint);
        emit LiquidityAdded(msg.sender, ethAmount, tokenAmount, lpTokensToMint);
    }

    /**
     * @dev Menarik likuiditas dari pool dengan membakar LP token.
     */
    function removeLiquidity(uint256 _lpTokensToBurn) public nonReentrant {
        require(_lpTokensToBurn > 0, "Must burn at least some LP tokens");
        
        uint256 lpTotalSupply = totalSupply();
        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));

        uint256 ethToReturn = (_lpTokensToBurn * ethReserve) / lpTotalSupply;
        uint256 tokenToReturn = (_lpTokensToBurn * tokenReserve) / lpTotalSupply;
        
        _burn(msg.sender, _lpTokensToBurn);
        token.transfer(msg.sender, tokenToReturn);
        (bool sent, ) = msg.sender.call{value: ethToReturn}("");
        require(sent, "Failed to send ETH");

        emit LiquidityRemoved(msg.sender, ethToReturn, tokenToReturn, _lpTokensToBurn);
    }

    /**
     * @dev Menghitung jumlah output dengan memperhitungkan fee.
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountOut) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "Invalid amounts");
        uint256 amountInWithFee = amountIn * (SWAP_FEE_DENOMINATOR - SWAP_FEE_NUMERATOR);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * SWAP_FEE_DENOMINATOR) + amountInWithFee;
        return numerator / denominator;
    }

    /**
     * @dev Menukar ETH dengan Token.
     */
    function swapEthToToken() public payable nonReentrant {
        uint256 ethIn = msg.value;
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethReserve = address(this).balance - ethIn;
        
        uint256 tokenOut = getAmountOut(ethIn, ethReserve, tokenReserve);
        token.transfer(msg.sender, tokenOut);
        emit Swapped(msg.sender, address(0), address(token), ethIn, tokenOut);
    }

    /**
     * @dev Menukar Token dengan ETH.
     */
    function swapTokenToEth(uint256 _tokenIn) public nonReentrant {
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethReserve = address(this).balance;
        
        uint256 ethOut = getAmountOut(_tokenIn, tokenReserve, ethReserve);
        token.transferFrom(msg.sender, address(this), _tokenIn);
        (bool sent, ) = msg.sender.call{value: ethOut}("");
        require(sent, "Failed to send ETH");
        emit Swapped(msg.sender, address(token), address(0), _tokenIn, ethOut);
    }
}