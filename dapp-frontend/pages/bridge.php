<?php
// pages/bridge.php
?>
<div id="bridge-page-identifier" style="display:none;"></div>

<div class="container">
    <h2>Cross-Chain Bridge</h2>
    <div class="grid">
        <div class="card">
            <h3>Jaringan PoW (Asal)</h3>
            <p>Saldo ETH: <span id="powEthBalance" class="balance-info">...</span></p>
            <p>Saldo MRT: <span id="mrtBalance" class="balance-info">...</span></p>
            <input type="text" id="lockAmountInput" placeholder="Jumlah MRT untuk dikunci">
            <button id="lockButton" disabled>Approve & Lock</button>
        </div>
        <div class="card">
            <h3>Jaringan PoA (Tujuan)</h3>
            <p>Saldo ETH: <span id="poaEthBalance" class="balance-info">...</span></p>
            <p>Saldo wMRT: <span id="wmrtBalance" class="balance-info">...</span></p>
            <input type="text" id="burnAmountInput" placeholder="Jumlah wMRT untuk dibakar">
            <button id="burnButton" disabled>Burn</button>
        </div>
    </div>
</div>

<div class="container" div id="ownerActionsPow" style="display: none;">
    <h2>Aksi Owner (PoW)</h4>
    <div class="card">
        <p style="font-size: 12px; color: #6c757d;">Panel ini hanya terlihat oleh owner kontrak MyToken.</p>
        <input type="text" id="mintRecipientInput" placeholder="Alamat Penerima (0x...)">
        <input type="text" id="mintAmountInput" placeholder="Jumlah MRT untuk di-mint">
        <button id="mintButton">Mint Token</button>
    </div>
</div>

<div class="container" id="transfer-panel" style="display:none;">
    <h2>Transfer Token P2P</h2>
    <div class="card">
        <h3 id="transfer-title">Transfer ...</h3>
        <p>
            <label for="transferRecipientInput">Alamat Penerima:</label>
            <input type="text" id="transferRecipientInput" placeholder="0x...">
        </p>
        <p>
            <label for="transferAmountInput">Jumlah:</label>
            <input type="text" id="transferAmountInput" placeholder="Contoh: 50.5">
        </p>
        <button id="transferButton">Transfer Token</button>
    </div>
</div>