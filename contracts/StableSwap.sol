// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// === TAMBAHKAN IMPORTS INI ===
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StableSwapV2 is ERC20, Ownable, ReentrancyGuard {
    IERC20 public immutable tokenA; // misal, USDT
    IERC20 public immutable tokenB; // misal, USDC

    event Swap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokensMinted);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 lpTokensBurned);

    constructor(address _tokenA, address _tokenB, address initialOwner) 
        ERC20("StableSwap LP Token", "StableLP") 
        Ownable(initialOwner) 
    {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    // --- FUNGSI LIKUIDITAS ---

    function addLiquidity(uint256 amountA, uint256 amountB) public nonReentrant returns (uint256 lpTokens) {
        require(amountA > 0 && amountB > 0, "Amounts must be > 0");
        
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        // Logika mint LP token sederhana untuk stablecoin 1:1
        // (Di dunia nyata, ini lebih kompleks untuk menangani de-pegging)
        lpTokens = amountA + amountB; // Misal, 100 USDT + 100 USDC = 200 LP Token
        _mint(msg.sender, lpTokens);

        emit LiquidityAdded(msg.sender, amountA, amountB, lpTokens);
    }

    function removeLiquidity(uint256 lpTokensToBurn) public nonReentrant returns (uint256 amountA, uint256 amountB) {
        require(lpTokensToBurn > 0, "Must burn > 0 LP tokens");
        require(balanceOf(msg.sender) >= lpTokensToBurn, "Insufficient LP balance");

        uint256 lpTotalSupply = totalSupply();
        uint256 reserveA = tokenA.balanceOf(address(this));
        uint256 reserveB = tokenB.balanceOf(address(this));

        // Hitung jumlah token yang akan dikembalikan secara proporsional
        amountA = (lpTokensToBurn * reserveA) / lpTotalSupply;
        amountB = (lpTokensToBurn * reserveB) / lpTotalSupply;

        _burn(msg.sender, lpTokensToBurn);
        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, lpTokensToBurn);
    }

    // --- FUNGSI SWAP (tetap sama) ---
    function getSwapAmount(uint256 amountIn) public pure returns (uint256) {
        uint256 fee = amountIn * 4 / 10000;
        return amountIn - fee;
    }

    function swapAforB(uint256 amountA_In) public nonReentrant {
        uint256 amountB_Out = getSwapAmount(amountA_In);
        require(tokenB.balanceOf(address(this)) >= amountB_Out, "Insufficient B liquidity");
        
        tokenA.transferFrom(msg.sender, address(this), amountA_In);
        tokenB.transfer(msg.sender, amountB_Out);
        emit Swap(msg.sender, address(tokenA), address(tokenB), amountA_In, amountB_Out);
    }

    function swapBforA(uint256 amountB_In) public nonReentrant {
        uint256 amountA_Out = getSwapAmount(amountB_In);
        require(tokenA.balanceOf(address(this)) >= amountA_Out, "Insufficient A liquidity");

        tokenB.transferFrom(msg.sender, address(this), amountB_In);
        tokenA.transfer(msg.sender, amountA_Out);
        emit Swap(msg.sender, address(tokenB), address(tokenA), amountB_In, amountA_Out);
    }
}