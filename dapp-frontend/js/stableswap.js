// js/stableswap.js
'use strict';

// Impor state & fungsi yang dibutuhkan dari core.js
import { DAPP_CONFIG, signer, userAddress, currentChainId, log, UsdtContract, UsdcContract, StableSwapContract, allElements, poaProvider, switchNetwork, updateUI } from './core.js';

let stablecoinOwner;

// Fungsi inisialisasi modul, dipanggil oleh core.js
export function initStableSwap() {
    if (allElements.swapAforBButton) allElements.swapAforBButton.onclick = swapAforB;
    if (allElements.swapBforAButton) allElements.swapBforAButton.onclick = swapBforA;
    if (allElements.addStableLiquidityButton) allElements.addStableLiquidityButton.onclick = addStableLiquidity;
    if (allElements.removeStableLiquidityButton) allElements.removeStableLiquidityButton.onclick = removeStableLiquidity;
    // Listener untuk tombol mint baru
    if (allElements.usdtMintButton) allElements.usdtMintButton.onclick = mintUsdt;
    if (allElements.usdcMintButton) allElements.usdcMintButton.onclick = mintUsdc;
    if (allElements.stablecoinTransferButton) allElements.stablecoinTransferButton.onclick = transferStablecoin;
    // === LISTENER BARU UNTUK KALKULATOR LIKUIDITAS ===
    if (allElements.liqAmountA) allElements.liqAmountA.oninput = () => calculateStableLiquidityPair('A');
    if (allElements.liqAmountB) allElements.liqAmountB.oninput = () => calculateStableLiquidityPair('B');
}

// Fungsi utama untuk memperbarui UI halaman StableSwap
export async function updateStableSwapPageUI() {
    const isPoa = currentChainId === DAPP_CONFIG.POA_CHAIN_ID;
    
    const content = document.getElementById('stableswap-content');
    const disabledMsg = document.getElementById('stableswap-disabled-msg');

    if (content) content.style.display = isPoa ? 'block' : 'none';
    if (disabledMsg) disabledMsg.style.display = isPoa ? 'none' : 'block';
    
    const transferPanel = document.getElementById('stablecoin-transfer-panel');
    if (transferPanel) {
        transferPanel.style.display = isPoa ? 'block' : 'none';
    }

    if (isPoa) {
        await updateStableBalances();
        await updateStablePoolStatus();
        await checkStablecoinOwnerStatus(); // Panggil fungsi cek owner
    }
}

// === FUNGSI PEMBANTU ===

async function updateStableBalances() {
    if (!userAddress || !DAPP_CONFIG) return;
    try {
        // Buat instance kontrak di dalam fungsi agar selalu up-to-date
        const usdtContract = new ethers.Contract(DAPP_CONFIG.UsdtPoaAddress, DAPP_CONFIG.UsdtPoaAbi, poaProvider);
        const usdcContract = new ethers.Contract(DAPP_CONFIG.UsdcPoaAddress, DAPP_CONFIG.UsdcPoaAbi, poaProvider);
        const stableSwapContract = new ethers.Contract(DAPP_CONFIG.StableSwapPoaAddress, DAPP_CONFIG.StableSwapPoaAbi, poaProvider);

        // Ambil saldo USDT dan USDC
        const usdtBalance = await usdtContract.balanceOf(userAddress);
        const usdcBalance = await usdcContract.balanceOf(userAddress);

        // Ambil saldo StableLP dari kontrak StableSwap itu sendiri
        const lpBalance = await stableSwapContract.balanceOf(userAddress);

        // Update UI (dengan pengecekan elemen)
        if (allElements.userUsdtBalance) allElements.userUsdtBalance.textContent = `${parseFloat(ethers.utils.formatUnits(usdtBalance, 18)).toFixed(2)} USDT`;
        if (allElements.userUsdcBalance) allElements.userUsdcBalance.textContent = `${parseFloat(ethers.utils.formatUnits(usdcBalance, 18)).toFixed(2)} USDC`;
        if (allElements.userStableLpBalance) allElements.userStableLpBalance.textContent = `${parseFloat(ethers.utils.formatUnits(lpBalance, 18)).toFixed(4)} StableLP`;
        
    } catch (e) {
        log(`❌ Gagal memperbarui saldo stablecoin: ${e.message}`);
    }
}

async function updateStablePoolStatus() {
    if(!StableSwapContract) return;
    try {
        const usdtReserve = await UsdtContract.connect(poaProvider).balanceOf(DAPP_CONFIG.StableSwapPoaAddress);
        const usdcReserve = await UsdcContract.connect(poaProvider).balanceOf(DAPP_CONFIG.StableSwapPoaAddress);

        if (allElements.poolUsdtReserve) allElements.poolUsdtReserve.textContent = `${parseFloat(ethers.utils.formatUnits(usdtReserve, 18)).toFixed(2)} USDT`;
        if (allElements.poolUsdcReserve) allElements.poolUsdcReserve.textContent = `${parseFloat(ethers.utils.formatUnits(usdcReserve, 18)).toFixed(2)} USDC`;
        
        // --- TAMBAHKAN LOGIKA PERHITUNGAN HARGA INI ---
        const priceEl = document.getElementById('stablePrice');
        if (priceEl && !usdtReserve.isZero()) {
            // Harga 1 USDT = (Cadangan USDC / Cadangan USDT)
            const price = parseFloat(ethers.utils.formatUnits(usdcReserve, 18)) / parseFloat(ethers.utils.formatUnits(usdtReserve, 18));
            priceEl.textContent = `${price.toFixed(4)}`; // Tampilkan 4 angka desimal untuk presisi
        } else if (priceEl) {
            priceEl.textContent = 'N/A';
        }
        // ---------------------------------------------
        
    } catch (e) {
        log(`❌ Gagal memperbarui status pool StableSwap: ${e.message}`);
    }
}

// Fungsi baru untuk memeriksa status owner stablecoin
async function checkStablecoinOwnerStatus() {
    if (!UsdtContract || !userAddress) return;
    try {
        // Kita cukup cek owner dari salah satu token, asumsinya sama
        stablecoinOwner = await UsdtContract.owner(); 
        const ownerPanel = document.getElementById('owner-actions-stableswap');
        if (ownerPanel) {
            if (userAddress.toLowerCase() === stablecoinOwner.toLowerCase()) {
                ownerPanel.style.display = 'block'; // Tampilkan panel
            } else {
                ownerPanel.style.display = 'none'; // Sembunyikan panel
            }
        }
    } catch (e) {
        console.error("Gagal memeriksa status owner stablecoin:", e);
    }
}

// === FUNGSI BARU: KALKULATOR LIKUIDITAS 1:1 ===
function calculateStableLiquidityPair(inputType) {
    const inputA = allElements.liqAmountA;
    const inputB = allElements.liqAmountB;

    if (!inputA || !inputB) return;

    // Jika pengguna mengetik di kolom A, perbarui kolom B. Begitu pula sebaliknya.
    if (inputType === 'A') {
        inputB.value = inputA.value;
    } else { // inputType === 'B'
        inputA.value = inputB.value;
    }
}

// === FUNGSI AKSI ===

async function addStableLiquidity() {
    const amountA = document.getElementById('liqAmountA').value;
    const amountB = document.getElementById('liqAmountB').value;
    if (!amountA || !amountB || isNaN(amountA) || isNaN(amountB)) return log('❌ Error: Jumlah tidak valid.');

    try {
        allElements.addStableLiquidityButton.disabled = true;
        const amountAInWei = ethers.utils.parseUnits(amountA, 18);
        const amountBInWei = ethers.utils.parseUnits(amountB, 18);

        log(`1/3: Approve ${amountA} USDT...`);
        const approveATx = await UsdtContract.approve(DAPP_CONFIG.StableSwapPoaAddress, amountAInWei);
        await approveATx.wait();
        log('   -> ✅ Approve USDT berhasil!');
        
        log(`2/3: Approve ${amountB} USDC...`);
        const approveBTx = await UsdcContract.approve(DAPP_CONFIG.StableSwapPoaAddress, amountBInWei);
        await approveBTx.wait();
        log('   -> ✅ Approve USDC berhasil!');

        log(`3/3: Menambah likuiditas...`);
        const addLiqTx = await StableSwapContract.addLiquidity(amountAInWei, amountBInWei);
        await addLiqTx.wait();
        log(`[🎉] SUKSES! Likuiditas Stablecoin berhasil ditambahkan.`);
        
        await updateUI();
    } catch(e) {
        log(`❌ Error menambah likuiditas: ${e.message}`);
    } finally {
        allElements.addStableLiquidityButton.disabled = false;
    }
}

// --- FUNGSI BARU UNTUK REMOVE LIQUIDITY ---
async function removeStableLiquidity() {
    const lpAmount = document.getElementById('removeStableLpInput').value;
    if (!lpAmount || isNaN(lpAmount) || parseFloat(lpAmount) <= 0) return log('❌ Error: Jumlah LP token tidak valid.');

    try {
        allElements.removeStableLiquidityButton.disabled = true;
        const lpAmountInWei = ethers.utils.parseUnits(lpAmount, 18);

        log(`1/2: Approve ${lpAmount} StableLP...`);
        // Approve di kontrak StableSwap itu sendiri, karena ia adalah token LP
        const approveTx = await StableSwapContract.approve(DAPP_CONFIG.StableSwapPoaAddress, lpAmountInWei);
        await approveTx.wait();
        log('   -> ✅ Approve berhasil!');

        log(`2/2: Menarik likuiditas dengan membakar ${lpAmount} StableLP...`);
        const removeTx = await StableSwapContract.removeLiquidity(lpAmountInWei);
        await removeTx.wait();
        log(`[🎉] SUKSES! Likuiditas berhasil ditarik.`);

        await updateUI(); // Perbarui seluruh UI
    } catch (error) {
        log(`❌ Error saat menarik likuiditas: ${error.message}`);
    } finally {
        allElements.removeStableLiquidityButton.disabled = false;
    }
}

async function swapAforB() { // Tukar USDT ke USDC
    const amount = document.getElementById('swapAmountA').value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah USDT tidak valid.');
    
    try {
        allElements.swapAforBButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);

        log(`1/2: Approve ${amount} USDT...`);
        const approveTx = await UsdtContract.approve(DAPP_CONFIG.StableSwapPoaAddress, amountInWei);
        await approveTx.wait();
        log('   -> ✅ Approve berhasil!');

        log(`2/2: Menukar ${amount} USDT ke USDC...`);
        const swapTx = await StableSwapContract.swapAforB(amountInWei);
        await swapTx.wait();
        log(`[🎉] SUKSES! Swap USDT ke USDC berhasil.`);
        
        await updateUI();
    } catch(e) {
        log(`❌ Error swap: ${e.message}`);
    } finally {
        allElements.swapAforBButton.disabled = false;
    }
}

async function swapBforA() { // Tukar USDC ke USDT
    const amount = document.getElementById('swapAmountB').value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah USDC tidak valid.');

    try {
        allElements.swapBforAButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);

        log(`1/2: Approve ${amount} USDC...`);
        const approveTx = await UsdcContract.approve(DAPP_CONFIG.StableSwapPoaAddress, amountInWei);
        await approveTx.wait();
        log('   -> ✅ Approve berhasil!');

        log(`2/2: Menukar ${amount} USDC ke USDT...`);
        const swapTx = await StableSwapContract.swapBforA(amountInWei);
        await swapTx.wait();
        log(`[🎉] SUKSES! Swap USDC ke USDT berhasil.`);
        
        await updateUI();
    } catch(e) {
        log(`❌ Error swap: ${e.message}`);
    } finally {
        allElements.swapBforAButton.disabled = false;
    }
}

// Fungsi baru untuk mint USDT
async function mintUsdt() {
    const recipient = allElements.usdtMintRecipient.value || userAddress;
    const amount = allElements.usdtMintAmount.value;
    if (!ethers.utils.isAddress(recipient)) return log('❌ Error: Alamat penerima USDT tidak valid.');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah USDT tidak valid.');

    try {
        allElements.usdtMintButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        
        log(`⏳ Meminta untuk mint ${amount} USDT ke ${recipient.substring(0,6)}...`);
        const tx = await UsdtContract.mint(recipient, amountInWei);
        await tx.wait();
        log(`[🎉] SUKSES! Token USDT berhasil di-mint.`);
        await updateUI(); // Perbarui seluruh UI untuk refresh saldo
    } catch (error) {
        log(`❌ Error saat minting USDT: ${error.message}`);
    } finally {
        allElements.usdtMintButton.disabled = false;
    }
}

// Fungsi baru untuk mint USDC
async function mintUsdc() {
    const recipient = allElements.usdcMintRecipient.value || userAddress;
    const amount = allElements.usdcMintAmount.value;
    if (!ethers.utils.isAddress(recipient)) return log('❌ Error: Alamat penerima USDC tidak valid.');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah USDC tidak valid.');

    try {
        allElements.usdcMintButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        
        log(`⏳ Meminta untuk mint ${amount} USDC ke ${recipient.substring(0,6)}...`);
        const tx = await UsdcContract.mint(recipient, amountInWei);
        await tx.wait();
        log(`[🎉] SUKSES! Token USDC berhasil di-mint.`);
        await updateUI();
    } catch (error) {
        log(`❌ Error saat minting USDC: ${error.message}`);
    } finally {
        allElements.usdcMintButton.disabled = false;
    }
}

// js/stableswap.js
async function transferStablecoin() {
    const tokenSelect = document.getElementById('stablecoin-transfer-token');
    const recipient = document.getElementById('stablecoin-transfer-recipient').value;
    const amount = document.getElementById('stablecoin-transfer-amount').value;

    if (!ethers.utils.isAddress(recipient)) return log('❌ Error: Alamat penerima tidak valid.');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah token tidak valid.');

    const tokenToSend = tokenSelect.value; // "USDT" atau "USDC"
    const tokenContract = (tokenToSend === 'USDT') ? UsdtContract : UsdcContract;

    try {
        allElements.stablecoinTransferButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);

        log(`⏳ Mengirim ${amount} ${tokenToSend} ke ${recipient.substring(0,6)}...`);
        const tx = await tokenContract.transfer(recipient, amountInWei);
        await tx.wait();
        log(`[🎉] SUKSES! Transfer ${tokenToSend} berhasil.`);

        await updateUI();
    } catch (error) {
        log(`❌ Error saat transfer: ${error.message}`);
    } finally {
        allElements.stablecoinTransferButton.disabled = false;
    }
}