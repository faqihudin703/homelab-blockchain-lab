// js/dex.js
'use strict';

// Impor state & fungsi yang dibutuhkan dari core.js
import { DAPP_CONFIG, signer, userAddress, currentChainId, log, MyTokenContract, BridgePoAContract, SimpleSwapV2PowContract, SimpleSwapV2PoaContract, allElements, powProvider, poaProvider, updateUI } from './core.js';

// Variabel state khusus untuk modul DEX
let powPool = { eth: ethers.BigNumber.from(0), token: ethers.BigNumber.from(0) };
let poaPool = { eth: ethers.BigNumber.from(0), token: ethers.BigNumber.from(0) };

/**
 * Inisialisasi untuk halaman DEX.
 * Memasang semua event listener onclick ke elemen-elemen DEX.
 */
export function initDex() {
    // Tombol Navigasi Tab
    if (allElements['pow-swap-tab-btn']) allElements['pow-swap-tab-btn'].onclick = () => showTab('pow', 'swap');
    if (allElements['pow-liquidity-tab-btn']) allElements['pow-liquidity-tab-btn'].onclick = () => showTab('pow', 'liquidity');
    if (allElements['poa-swap-tab-btn']) allElements['poa-swap-tab-btn'].onclick = () => showTab('poa', 'swap');
    if (allElements['poa-liquidity-tab-btn']) allElements['poa-liquidity-tab-btn'].onclick = () => showTab('poa', 'liquidity');


    // Tombol Aksi Swap
    if (allElements.swapEthToTokenButtonPow) allElements.swapEthToTokenButtonPow.onclick = swapEthToToken;
    if (allElements.swapTokenToEthButtonPow) allElements.swapTokenToEthButtonPow.onclick = swapTokenToEth;
    if (allElements.swapEthToTokenButtonPoa) allElements.swapEthToTokenButtonPoa.onclick = swapEthToToken;
    if (allElements.swapTokenToEthButtonPoa) allElements.swapTokenToEthButtonPoa.onclick = swapTokenToEth;

    // Tombol Aksi Likuiditas
    if (allElements.addLiquidityButtonPow) allElements.addLiquidityButtonPow.onclick = addLiquidity;
    if (allElements.removeLiquidityButtonPow) allElements.removeLiquidityButtonPow.onclick = removeLiquidity;
    if (allElements.addLiquidityButtonPoa) allElements.addLiquidityButtonPoa.onclick = addLiquidity;
    if (allElements.removeLiquidityButtonPoa) allElements.removeLiquidityButtonPoa.onclick = removeLiquidity;

    // Listener untuk input likuiditas otomatis
    const addLiqEthInputPow = document.getElementById('addLiqEthInputPow');
    if (addLiqEthInputPow) addLiqEthInputPow.oninput = () => calculateLiquidityPair('eth', 'pow');
    const addLiqTokenInputPow = document.getElementById('addLiqTokenInputPow');
    if (addLiqTokenInputPow) addLiqTokenInputPow.oninput = () => calculateLiquidityPair('token', 'pow');
    const addLiqEthInputPoa = document.getElementById('addLiqEthInputPoa');
    if (addLiqEthInputPoa) addLiqEthInputPoa.oninput = () => calculateLiquidityPair('eth', 'poa');
    const addLiqTokenInputPoa = document.getElementById('addLiqTokenInputPoa');
    if (addLiqTokenInputPoa) addLiqTokenInputPoa.oninput = () => calculateLiquidityPair('token', 'poa');
}

/**
 * Fungsi utama untuk memperbarui UI khusus halaman DEX.
 * Dipanggil oleh core.js
 */
export async function updateDexPageUI() {
    const isPow = currentChainId === DAPP_CONFIG.POW_CHAIN_ID;
    const isPoa = currentChainId === DAPP_CONFIG.POA_CHAIN_ID;

    // Ambil elemen dari allElements
    const dexPow = document.getElementById('dex-pow-content');
    const dexPoa = document.getElementById('dex-poa-content');
    const dexDisabled = document.getElementById('dex-disabled-msg');

    // Atur tampilan
    if (dexPow) dexPow.style.display = isPow ? 'block' : 'none';
    if (dexPoa) dexPoa.style.display = isPoa ? 'block' : 'none';
    if (dexDisabled) dexDisabled.style.display = (isPow || isPoa) ? 'none' : 'block';

    // --- Update data DEX ---
    if (isPow || isPoa) {
        try {
            // Update saldo LP Token
            await updateDexLPBalances();

            // Update pool status hanya untuk jaringan yang aktif
            if (isPow) await updatePowPoolStatus();
            if (isPoa) await updatePoaPoolStatus();
        } catch (err) {
            log(`❌ Gagal update DEX: ${err.message}`);
        }
    }
}


// === FUNGSI INTERNAL MODUL DEX ===

function showTab(network, tabName) {
    const swapTab = document.getElementById(`dex-${network}-swap`);
    const liquidityTab = document.getElementById(`dex-${network}-liquidity`);
    if (!swapTab || !liquidityTab) return;

    swapTab.style.display = 'none';
    liquidityTab.style.display = 'none';
    document.getElementById(`dex-${network}-${tabName}`).style.display = 'block';

    const navButtons = document.querySelectorAll(`#dex-${network}-content .nav-btn`);
    navButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.getElementById(`${network}-${tabName}-tab-btn`);
    if (activeButton) activeButton.classList.add('active');
}

async function updatePowPoolStatus() {
    log('🔄 Memperbarui status pool DEX PoW...');
    try {
        const ethReserve = await powProvider.getBalance(DAPP_CONFIG.SimpleSwapV2PoWAddress);
        const tokenContract = new ethers.Contract(DAPP_CONFIG.MyTokenAddress, DAPP_CONFIG.MyTokenAbi, powProvider);
        const tokenReserve = await tokenContract.balanceOf(DAPP_CONFIG.SimpleSwapV2PoWAddress);

        powPool = { eth: ethReserve, token: tokenReserve }; // Simpan data mentah

        allElements.poolEthReservePow.textContent = `${parseFloat(ethers.utils.formatEther(ethReserve)).toFixed(4)} ETH`;
        allElements.poolTokenReservePow.textContent = `${parseFloat(ethers.utils.formatUnits(tokenReserve, 18)).toFixed(2)} MRT`;
        if (ethReserve > 0) {
            const price = parseFloat(ethers.utils.formatUnits(tokenReserve, 18)) / parseFloat(ethers.utils.formatEther(ethReserve));
            allElements.currentPricePow.textContent = `${price.toFixed(2)}`;
        } else {
            allElements.currentPricePow.textContent = 'N/A';
        }
    } catch (e) {
        log(`❌ Gagal memperbarui status pool DEX PoW: ${e.message}`);
    }
}

async function updatePoaPoolStatus() {
    log('🔄 Memperbarui status pool DEX PoA...');
    try {
        const ethReserve = await poaProvider.getBalance(DAPP_CONFIG.SimpleSwapV2PoAAddress);
        const tokenContract = new ethers.Contract(DAPP_CONFIG.BridgePoAAddress, DAPP_CONFIG.BridgePoAAbi, poaProvider);
        const tokenReserve = await tokenContract.balanceOf(DAPP_CONFIG.SimpleSwapV2PoAAddress);

        poaPool = { eth: ethReserve, token: tokenReserve }; // Simpan data mentah

        allElements.poolEthReservePoa.textContent = `${parseFloat(ethers.utils.formatEther(ethReserve)).toFixed(4)} ETH`;
        allElements.poolTokenReservePoa.textContent = `${parseFloat(ethers.utils.formatUnits(tokenReserve, 18)).toFixed(2)} wMRT`;
        if (ethReserve > 0) {
            const price = parseFloat(ethers.utils.formatUnits(tokenReserve, 18)) / parseFloat(ethers.utils.formatEther(ethReserve));
            allElements.currentPricePoa.textContent = `${price.toFixed(2)}`;
        } else {
            allElements.currentPricePoa.textContent = 'N/A';
        }
    } catch (e) {
        log(`❌ Gagal memperbarui status pool DEX PoA: ${e.message}`);
    }
}

function calculateLiquidityPair(inputType, network) {
    const pool = (network === 'pow') ? powPool : poaPool;
    const ethInput = document.getElementById(`addLiqEthInput${network === 'pow' ? 'Pow' : 'Poa'}`);
    const tokenInput = document.getElementById(`addLiqTokenInput${network === 'pow' ? 'Pow' : 'Poa'}`);

    // Jika pool kosong, pengguna bebas menentukan rasio awal
    if (pool.eth.isZero() || pool.token.isZero()) {
        console.log("Pool is empty, user sets the initial ratio.");
        return;
    }

    try {
        if (inputType === 'eth') {
            const ethValue = ethers.utils.parseEther(ethInput.value || "0");
            // Hitung: tokenAmount = ethAmount * tokenReserve / ethReserve
            const tokenValue = ethValue.mul(pool.token).div(pool.eth);
            tokenInput.value = ethers.utils.formatUnits(tokenValue, 18);
        } else { // inputType === 'token'
            const tokenValue = ethers.utils.parseUnits(tokenInput.value || "0", 18);
            // Hitung: ethAmount = tokenAmount * ethReserve / tokenReserve
            const ethValue = tokenValue.mul(pool.eth).div(pool.token);
            ethInput.value = ethers.utils.formatEther(ethValue);
        }
    } catch (e) {
        // Tangani jika input tidak valid (misal, bukan angka)
        if (inputType === 'eth') {
            tokenInput.value = "";
        } else {
            ethInput.value = "";
        }
    }
}

async function addLiquidity() {
    const isPow = currentChainId === DAPP_CONFIG.POW_CHAIN_ID;
    const tokenInputId = isPow ? 'addLiqTokenInputPow' : 'addLiqTokenInputPoa';
    const ethInputId = isPow ? 'addLiqEthInputPow' : 'addLiqEthInputPoa';
    const button = isPow ? addLiquidityButtonPow : addLiquidityButtonPoa;

    const tokenAmount = document.getElementById(tokenInputId).value;
    const ethAmount = document.getElementById(ethInputId).value;
    if (!tokenAmount || !ethAmount || isNaN(tokenAmount) || isNaN(ethAmount)) return log('❌ Error: Jumlah tidak valid.');
    
    try {
        button.disabled = true;
        const tokenAmountInWei = ethers.utils.parseUnits(tokenAmount, 18);
        const ethAmountInWei = ethers.utils.parseUnits(ethAmount, 18);

        const tokenContract = isPow ? MyTokenContract : BridgePoAContract;
        const dexContract = isPow ? SimpleSwapV2PowContract : SimpleSwapV2PoaContract;
        const tokenName = isPow ? 'MRT' : 'wMRT';

        log(`1/2: Approve ${tokenAmount} ${tokenName}...`);
        const approveTx = await tokenContract.approve(dexContract.address, tokenAmountInWei);
        await approveTx.wait();
        log('   -> ✅ Approve berhasil!');

        log(`2/2: Menambah ${tokenAmount} ${tokenName} dan ${ethAmount} ETH ke pool...`);
        const addLiqTx = await dexContract.addLiquidity(tokenAmountInWei, { value: ethAmountInWei });
        await addLiqTx.wait();
        log(`[🎉] SUKSES! Likuiditas berhasil ditambahkan.`);
        await updateUI();
    } catch(e) {
        log(`❌ Error menambah likuiditas: ${e.message}`);
    } finally {
        button.disabled = false;
    }
}

async function removeLiquidity() {
    const isPow = currentChainId === DAPP_CONFIG.POW_CHAIN_ID;
    const lpInputId = isPow ? 'removeLiqLpInputPow' : 'removeLiqLpInputPoa';
    const button = isPow ? removeLiquidityButtonPow : removeLiquidityButtonPoa;
    const dexContract = isPow ? SimpleSwapV2PowContract : SimpleSwapV2PoaContract;
    
    const lpAmount = document.getElementById(lpInputId).value;
    if (!lpAmount || isNaN(lpAmount)) return log('❌ Error: Jumlah LP token tidak valid.');

    try {
        button.disabled = true;
        const lpAmountInWei = ethers.utils.parseUnits(lpAmount, 18);

        log(`1/2: Approve ${lpAmount} SSLP...`);
        const approveTx = await dexContract.approve(dexContract.address, lpAmountInWei);
        await approveTx.wait();
        log('   -> ✅ Approve berhasil!');

        log(`2/2: Menarik likuiditas dengan ${lpAmount} SSLP...`);
        const removeLiqTx = await dexContract.removeLiquidity(lpAmountInWei);
        await removeLiqTx.wait();
        log(`[🎉] SUKSES! Likuiditas berhasil ditarik.`);
        await updateUI();
    } catch(e) {
        log(`❌ Error menarik likuiditas: ${e.message}`);
    } finally {
        button.disabled = false;
    }
}

async function swapEthToToken() {
    const isPow = currentChainId === DAPP_CONFIG.POW_CHAIN_ID;
    const inputId = isPow ? 'swapEthInputPow' : 'swapEthInputPoa';
    const button = isPow ? swapEthToTokenButtonPow : swapEthToTokenButtonPoa;
    const dexContract = isPow ? SimpleSwapV2PowContract : SimpleSwapV2PoaContract;
    const tokenName = isPow ? 'MRT' : 'wMRT';

    const amount = document.getElementById(inputId).value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah ETH tidak valid.');
    try {
        button.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        log(`Menukar ${amount} ETH dengan ${tokenName}...`);
        const tx = await dexContract.swapEthToToken({ value: amountInWei });
        await tx.wait();
        log(`[🎉] SUKSES! Swap ETH ke ${tokenName} berhasil.`);
        await updateUI();
    } catch(e) {
        log(`❌ Error swap: ${e.message}`);
    } finally {
        button.disabled = false;
    }
}

async function swapTokenToEth() {
    const isPow = currentChainId === DAPP_CONFIG.POW_CHAIN_ID;
    const inputId = isPow ? 'swapTokenInputPow' : 'swapTokenInputPoa';
    const button = isPow ? swapTokenToEthButtonPow : swapTokenToEthButtonPoa;
    const dexContract = isPow ? SimpleSwapV2PowContract : SimpleSwapV2PoaContract;
    const tokenContract = isPow ? MyTokenContract : BridgePoAContract;
    const tokenName = isPow ? 'MRT' : 'wMRT';
    
    const amount = document.getElementById(inputId).value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log(`❌ Error: Jumlah ${tokenName} tidak valid.`);
    try {
        button.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        
        log(`1/2: Approve ${amount} ${tokenName}...`);
        const approveTx = await tokenContract.approve(dexContract.address, amountInWei);
        await approveTx.wait();
        log('   -> ✅ Approve berhasil!');

        log(`2/2: Menukar ${amount} ${tokenName} dengan ETH...`);
        const swapTx = await dexContract.swapTokenToEth(amountInWei);
        await swapTx.wait();
        log(`[🎉] SUKSES! Swap ${tokenName} ke ETH berhasil.`);
        await updateUI();
    } catch(e) {
        log(`❌ Error swap: ${e.message}`);
    } finally {
        button.disabled = false;
    }
}

async function updateDexLPBalances() {
    if (!userAddress) return;
    try {
        // --- LP Token di Jaringan PoW ---
        const lpContractPow = new ethers.Contract(
            DAPP_CONFIG.SimpleSwapV2PoWAddress,
            DAPP_CONFIG.SimpleSwapV2Abi,
            powProvider
        );
        const lpDecimalsPow = await lpContractPow.decimals();
        const lpBalancePow = await lpContractPow.balanceOf(userAddress);
        if (allElements.lpBalancePow) {
            allElements.lpBalancePow.textContent =
                `${parseFloat(ethers.utils.formatUnits(lpBalancePow, lpDecimalsPow)).toFixed(4)} SSLP`;
        }

        // --- LP Token di Jaringan PoA ---
        const lpContractPoa = new ethers.Contract(
            DAPP_CONFIG.SimpleSwapV2PoAAddress,
            DAPP_CONFIG.SimpleSwapV2Abi,
            poaProvider
        );
        const lpDecimalsPoa = await lpContractPoa.decimals();
        const lpBalancePoa = await lpContractPoa.balanceOf(userAddress);
        if (allElements.lpBalancePoa) {
            allElements.lpBalancePoa.textContent =
                `${parseFloat(ethers.utils.formatUnits(lpBalancePoa, lpDecimalsPoa)).toFixed(4)} SSLP`;
        }

    } catch (e) {
        log(`❌ Gagal memperbarui saldo LP Token: ${e.message}`);
    }
}