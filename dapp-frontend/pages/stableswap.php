<?php
// pages/stableswap.php
?>
<div id="stableswap-page-identifier" style="display:none;"></div>

<div class="container">
    <h2>StableSwap DEX (USDT/USDC)</h2>
    <p>Pasar efisien untuk menukar aset dengan nilai setara. Hanya tersedia di Jaringan PoA.</p>

    <div id="stableswap-content" style="display:none;">
        <div class="pool-status">
            <h4>Status Pool</h4>
            <p>Cadangan USDT: <span id="poolUsdtReserve" class="balance-info">...</span></p>
            <p>Cadangan USDC: <span id="poolUsdcReserve" class="balance-info">...</span></p>
            <p>Harga 1 USDT ≈ <span id="stablePrice" class="balance-info">...</span> USDC</p>
        </div>
        <div class="grid">
            <div class="card">
                <h3>Swap</h3>
                <p>Saldo USDT Anda: <span id="userUsdtBalance" class="balance-info">...</span></p>
                <input type="text" id="swapAmountA" placeholder="Jumlah USDT">
                <button id="swapAforBButton">Tukar USDT ke USDC</button>
                <hr>
                <p>Saldo USDC Anda: <span id="userUsdcBalance" class="balance-info">...</span></p>
                <input type="text" id="swapAmountB" placeholder="Jumlah USDC">
                <button id="swapBforAButton">Tukar USDC ke USDT</button>
            </div>
            <div class="card">
                <h3>Manage Liquidity</h3>
                <p>Saldo LP Token Anda: <span id="userStableLpBalance" class="balance-info">...</span></p>
                <hr>
                <input type="text" id="liqAmountA" placeholder="Jumlah USDT">
                <input type="text" id="liqAmountB" placeholder="Jumlah USDC">
                <button id="addStableLiquidityButton">Approve & Add Liquidity</button>
                <input type="text" id="removeStableLpInput" placeholder="Jumlah StableLP untuk dibakar" style="margin-top: 1.5em;">
                <button id="removeStableLiquidityButton">Approve & Remove Liquidity</button>
                </div>
            </div>
        </div>
        <p id="stableswap-disabled-msg">Hubungkan ke jaringan PoA untuk menggunakan StableSwap.</p>
    </div>
</div>

<div class="container" id="owner-actions-stableswap" style="display: none;">
    <h2>Aksi Owner (Stablecoin Faucet)</h4>
    <p style="font-size: 12px; color: #6c757d;">Panel ini hanya terlihat oleh owner kontrak stablecoin.</p>
    <div class="grid">
        <div class="card">
            <label for="usdtMintAmount">Mint Tether (USDT):</label>
            <input type="text" id="usdtMintRecipient" placeholder="Alamat Penerima (0x...)">
            <input type="text" id="usdtMintAmount" placeholder="Jumlah USDT untuk di-mint">
            <button id="usdtMintButton">Mint USDT</button>
        </div>
        <div class="card">
            <label for="usdcMintAmount">Mint USD Coin (USDC):</label>
            <input type="text" id="usdcMintRecipient" placeholder="Alamat Penerima (0x...)">
            <input type="text" id="usdcMintAmount" placeholder="Jumlah USDC untuk di-mint">
            <button id="usdcMintButton">Mint USDC</button>
        </div>
    </div>
</div>

<div class="container" id="stablecoin-transfer-panel" style="display:none;">
    <h2>Transfer Stablecoin P2P (di Jaringan PoA)</h2>
    <div class="card">
        <p>
            <label for="stablecoin-transfer-token">Token untuk Dikirim:</label>
            <select id="stablecoin-transfer-token" class="input-like">
                <option value="USDT">Tether (USDT)</option>
                <option value="USDC">USD Coin (USDC)</option>
            </select>
        </p>
        <p>
            <label for="stablecoin-transfer-recipient">Alamat Penerima:</label>
            <input type="text" id="stablecoin-transfer-recipient" placeholder="0x...">
        </p>
        <p>
            <label for="stablecoin-transfer-amount">Jumlah:</label>
            <input type="text" id="stablecoin-transfer-amount" placeholder="Contoh: 100.5">
        </p>
        <button id="stablecoinTransferButton">Transfer Stablecoin</button>
    </div>
</div>