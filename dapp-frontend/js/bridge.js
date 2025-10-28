// js/bridge.js
'use strict';

// Impor state & fungsi yang dibutuhkan dari core.js
import { 
    DAPP_CONFIG, 
    signer, 
    userAddress, 
    currentChainId, 
    log, 
    MyTokenContract, 
    BridgePoWContract, 
    BridgePoAContract, 
    allElements, 
    powProvider, 
    poaProvider, 
    switchNetwork,
    updateUI
} from './core.js';

// Variabel state khusus untuk modul ini
let myTokenOwner;

/**
 * Inisialisasi untuk halaman Bridge.
 * Memasang semua event listener onclick ke elemen-elemen Bridge.
 */
export function initBridge() {
    if (allElements.lockButton) allElements.lockButton.onclick = lockTokens;
    if (allElements.burnButton) allElements.burnButton.onclick = burnTokens;
    if (allElements.mintButton) allElements.mintButton.onclick = mintTokens;
    if (allElements.transferButton) allElements.transferButton.onclick = transferTokens;
}

/**
 * Fungsi utama untuk memperbarui UI khusus halaman Bridge.
 * Dipanggil oleh core.js saat pengguna berada di halaman bridge.
 */
export async function updateBridgePageUI() {
    const isPow = currentChainId === DAPP_CONFIG.POW_CHAIN_ID;
    const isPoa = currentChainId === DAPP_CONFIG.POA_CHAIN_ID;

    if (allElements.lockButton) allElements.lockButton.disabled = !isPow;
    if (allElements.burnButton) allElements.burnButton.disabled = !isPoa;
    
    // Tampilkan panel transfer hanya di PoW/PoA
    if (allElements['transfer-panel']) {
        allElements['transfer-panel'].style.display = (isPow || isPoa) ? 'block' : 'none';
        if (allElements.transferTitle) {
            allElements.transferTitle.textContent = isPow ? 'Transfer MRT' : isPoa ? 'Transfer wMRT' : 'Transfer Token';
        }
    }
    
    await updateBridgeBalances();
    await checkOwnerStatus();
}

/**
 * Mengambil dan menampilkan saldo ETH, MRT, dan wMRT.
 */
async function updateBridgeBalances() {
    if (!userAddress) return;
    try {
        // Saldo di Jaringan PoW
        const powEth = await powProvider.getBalance(userAddress);
        if(allElements.powEthBalance) allElements.powEthBalance.textContent = `${parseFloat(ethers.utils.formatEther(powEth)).toFixed(4)} ETH`;
        
        const mrtContract = new ethers.Contract(DAPP_CONFIG.MyTokenAddress, DAPP_CONFIG.MyTokenAbi, powProvider);
        const mrt = await mrtContract.balanceOf(userAddress);
        if(allElements.mrtBalance) allElements.mrtBalance.textContent = `${parseFloat(ethers.utils.formatUnits(mrt, 18)).toFixed(2)} MRT`;
        
        // Saldo di Jaringan PoA
        const poaEth = await poaProvider.getBalance(userAddress);
        if(allElements.poaEthBalance) allElements.poaEthBalance.textContent = `${parseFloat(ethers.utils.formatEther(poaEth)).toFixed(4)} ETH`;
        
        const wmrtContract = new ethers.Contract(DAPP_CONFIG.BridgePoAAddress, DAPP_CONFIG.BridgePoAAbi, poaProvider);
        const wmrt = await wmrtContract.balanceOf(userAddress);
        if(allElements.wmrtBalance) allElements.wmrtBalance.textContent = `${parseFloat(ethers.utils.formatUnits(wmrt, 18)).toFixed(2)} wMRT`;
    } catch (e) {
        log(`❌ Gagal memperbarui saldo bridge: ${e.message}`);
    }
}

/**
 * Memeriksa apakah pengguna yang terhubung adalah owner dari MyToken
 * dan menampilkan/menyembunyikan panel admin.
 */
async function checkOwnerStatus() {
    if (!MyTokenContract || !allElements.ownerActionsPow || !userAddress) return;
    try {
        myTokenOwner = await MyTokenContract.owner();
        if (userAddress.toLowerCase() === myTokenOwner.toLowerCase()) {
            allElements.ownerActionsPow.style.display = 'block';
        } else {
            allElements.ownerActionsPow.style.display = 'none';
        }
    } catch (e) {
        console.error("Gagal memeriksa status owner:", e);
        if(allElements.ownerActionsPow) allElements.ownerActionsPow.style.display = 'none';
    }
}

/**
 * Fungsi untuk owner mencetak token MRT baru.
 */
async function mintTokens() {
    if (currentChainId !== DAPP_CONFIG.POW_CHAIN_ID) {
        return log('❌ Error: Aksi mint hanya bisa dilakukan di jaringan PoW.');
    }
    
    const recipient = allElements.mintRecipientInput.value;
    const amount = allElements.mintAmountInput.value;

    if (!ethers.utils.isAddress(recipient)) return log('❌ Error: Alamat penerima tidak valid.');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah token tidak valid.');

    try {
        allElements.mintButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        
        log(`⏳ Meminta untuk mint ${amount} MRT ke alamat ${recipient.substring(0,6)}...`);
        const tx = await MyTokenContract.mint(recipient, amountInWei);
        await tx.wait();
        log(`[🎉] SUKSES! Token berhasil di-mint.`);

        await updateBridgeBalances();
    } catch (error) {
        log(`❌ Error saat minting: ${error.message}`);
    } finally {
        allElements.mintButton.disabled = false;
    }
}

/**
 * Fungsi untuk menjembatani token dari PoW ke PoA.
 */
async function lockTokens() {
    if (currentChainId !== DAPP_CONFIG.POW_CHAIN_ID) {
        log('⏳ Meminta untuk pindah ke jaringan PoW...');
        await switchNetwork(DAPP_CONFIG.POW_CHAIN_ID);
        return;
    }
    
    const amount = allElements.lockAmountInput.value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah tidak valid.');
    
    try {
        allElements.lockButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);

        log(`1/2: Meminta persetujuan (approve) untuk ${amount} MRT...`);
        const approveTx = await MyTokenContract.approve(DAPP_CONFIG.BridgePoWAddress, amountInWei);
        await approveTx.wait();
        log('   -> ✅ Approve berhasil!');

        log(`2/2: Mengunci (lock) ${amount} MRT...`);
        const lockTx = await BridgePoWContract.lock(amountInWei);
        await lockTx.wait();
        log(`[🎉] SUKSES! ${amount} MRT berhasil dikunci.`);

        await updateBridgeBalances();
    } catch (error) {
        log(`❌ Error transaksi: ${error.message}`);
    } finally {
        allElements.lockButton.disabled = false;
    }
}

/**
 * Fungsi untuk mengembalikan token dari PoA ke PoW.
 */
async function burnTokens() {
    if (currentChainId !== DAPP_CONFIG.POA_CHAIN_ID) {
        log('⏳ Meminta untuk pindah ke jaringan PoA...');
        await switchNetwork(DAPP_CONFIG.POA_CHAIN_ID);
        return;
    }

    const amount = allElements.burnAmountInput.value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah tidak valid.');

    try {
        allElements.burnButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        log(`Membakar (burn) ${amount} wMRT...`);
        const burnTx = await BridgePoAContract.burn(amountInWei);
        await burnTx.wait();
        log(`[🎉] SUKSES! ${amount} wMRT berhasil dibakar. Relayer akan memproses release.`);

        await updateBridgeBalances();
    } catch (error) {
        log(`❌ Error transaksi: ${error.message}`);
    } finally {
        allElements.burnButton.disabled = false;
    }
}

async function transferTokens() {
    const { POW_CHAIN_ID, POA_CHAIN_ID } = DAPP_CONFIG;
    
    const recipient = allElements.transferRecipientInput?.value || "";
    const amount = allElements.transferAmountInput?.value || "";

    if (!ethers.utils.isAddress(recipient)) return log('❌ Error: Alamat penerima tidak valid.');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah token tidak valid.');

    let tokenContract;
    let tokenName;

    if (currentChainId === POW_CHAIN_ID) {
        tokenContract = MyTokenContract;
        tokenName = 'MRT';
    } else if (currentChainId === POA_CHAIN_ID) {
        tokenContract = BridgePoAContract; // token wMRT
        tokenName = 'wMRT';
    } else {
        return log('❌ Error: Transfer hanya di jaringan PoW/PoA.');
    }

    try {
        const btn = allElements.transferButton;
        if (btn) btn.disabled = true;
        
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        log(`⏳ Mengirim ${amount} ${tokenName} ke ${recipient.substring(0,6)}...`);

        const tx = await tokenContract.transfer(recipient, amountInWei);
        await tx.wait();

        log(`🎉 SUKSES! Transfer berhasil.`);
        await updateBalances();

        // Reset form
        if (allElements.transferRecipientInput) allElements.transferRecipientInput.value = "";
        if (allElements.transferAmountInput) allElements.transferAmountInput.value = "";

    } catch (error) {
        log(`❌ Error: ${error.message}`);
    } finally {
        if (allElements.transferButton) allElements.transferButton.disabled = false;
    }
}