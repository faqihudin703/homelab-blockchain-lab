<?php
// pages/dex.php
?>
<div id="dex-page-identifier" style="display:none;"></div>

<div class="container">
    <h2>DEX AMM (SimpleSwapV2)</h2>
    
    <div id="dex-pow-content" style="display:none;">
        <div class="dex-nav">
            <button id="pow-swap-tab-btn" class="nav-btn active">Swap</button>
            <button id="pow-liquidity-tab-btn" class="nav-btn">Liquidity</button>
        </div>
        
        <div id="dex-pow-swap">
            <div class="pool-status">
                <h4>Status Pool (PoW)</h4>
                <p>Cadangan ETH: <span id="poolEthReservePow" class="balance-info">...</span></p>
                <p>Cadangan MRT: <span id="poolTokenReservePow" class="balance-info">...</span></p>
                <p>Harga 1 ETH ≈ <span id="currentPricePow" class="balance-info">...</span> MRT</p>
            </div>
            <div class="grid">
                <div class="card">
                    <h3>Tukar ETH ke MRT</h3>
                    <input type="text" id="swapEthInputPow" placeholder="Jumlah ETH">
                    <button id="swapEthToTokenButtonPow">Swap</button>
                </div>
                <div class="card">
                    <h3>Tukar MRT ke ETH</h3>
                    <input type="text" id="swapTokenInputPow" placeholder="Jumlah MRT">
                    <button id="swapTokenToEthButtonPow">Approve & Swap</button>
                </div>
            </div>
        </div>
        
        <div id="dex-pow-liquidity" style="display: none;">
             <p>Saldo LP Token (SSLP): <span id="lpBalancePow" class="balance-info">...</span></p>
             <hr>
             <div class="grid">
                <div class="card">
                    <h3>Tambah Likuiditas</h3>
                    <input type="text" id="addLiqTokenInputPow" placeholder="Jumlah MRT">
                    <input type="text" id="addLiqEthInputPow" placeholder="Jumlah ETH">
                    <button id="addLiquidityButtonPow">Approve & Add Liquidity</button>
                </div>
                <div class="card">
                    <h3>Tarik Likuiditas</h3>
                    <input type="text" id="removeLiqLpInputPow" placeholder="Jumlah SSLP">
                    <button id="removeLiquidityButtonPow">Approve & Remove Liquidity</button>
                </div>
            </div>
        </div>
    </div>

    <div id="dex-poa-content" style="display:none;">
        <div class="dex-nav">
            <button id="poa-swap-tab-btn" class="nav-btn active">Swap</button>
            <button id="poa-liquidity-tab-btn" class="nav-btn">Liquidity</button>
        </div>
        
        <div id="dex-poa-swap">
            <div class="pool-status">
                <h4>Status Pool (PoA)</h4>
                <p>Cadangan ETH: <span id="poolEthReservePoa" class="balance-info">...</span></p>
                <p>Cadangan wMRT: <span id="poolTokenReservePoa" class="balance-info">...</span></p>
                <p>Harga 1 ETH ≈ <span id="currentPricePoa" class="balance-info">...</span> wMRT</p>
            </div>
            <div class="grid">
                <div class="card">
                    <h3>Tukar ETH ke wMRT</h3>
                    <input type="text" id="swapEthInputPoa" placeholder="Jumlah ETH">
                    <button id="swapEthToTokenButtonPoa">Swap</button>
                </div>
                <div class="card">
                    <h3>Tukar wMRT ke ETH</h3>
                    <input type="text" id="swapTokenInputPoa" placeholder="Jumlah wMRT">
                    <button id="swapTokenToEthButtonPoa">Approve & Swap</button>
                </div>
            </div>
        </div>

        <div id="dex-poa-liquidity" style="display: none;">
            <p>Saldo LP Token (SSLP): <span id="lpBalancePoa" class="balance-info">...</span></p>
            <hr>
            <div class="grid">
                <div class="card">
                    <h3>Tambah Likuiditas</h3>
                    <input type="text" id="addLiqTokenInputPoa" placeholder="Jumlah wMRT">
                    <input type="text" id="addLiqEthInputPoa" placeholder="Jumlah ETH">
                    <button id="addLiquidityButtonPoa">Approve & Add Liquidity</button>
                </div>
                <div class="card">
                    <h3>Tarik Likuiditas</h3>
                    <input type="text" id="removeLiqLpInputPoa" placeholder="Jumlah SSLP">
                    <button id="removeLiquidityButtonPoa">Approve & Remove Liquidity</button>
                </div>
            </div>
        </div>
    </div>

     <p id="dex-disabled-msg">Hubungkan ke jaringan PoW atau PoA untuk menggunakan DEX.</p>
</div>