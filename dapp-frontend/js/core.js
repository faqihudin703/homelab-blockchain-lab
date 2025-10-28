// js/core.js
'use strict';

// Impor fungsi inisialisasi dan update dari modul-modul lain
import { initBridge, updateBridgePageUI } from './bridge.js';
import { initDex, updateDexPageUI } from './dex.js';
import { initStableSwap, updateStableSwapPageUI } from './stableswap.js';

// ==================================================================
// ||               STATE & VARIABEL GLOBAL                      ||
// ==================================================================

// Ekspor variabel agar bisa diakses oleh modul lain
export let DAPP_CONFIG;
export let provider, signer, userAddress, currentChainId;
export let powProvider, poaProvider;

// Instance kontrak akan diisi di sini
export let MyTokenContract, BridgePoWContract, BridgePoAContract, 
           SimpleSwapV2PowContract, SimpleSwapV2PoaContract, 
           UsdtContract, UsdcContract, StableSwapContract;

// Objek untuk menyimpan semua elemen DOM agar rapi
export const allElements = {};


// ==================================================================
// ||               INISIALISASI APLIKASI UTAMA                    ||
// ==================================================================

// Jalankan semua setup setelah halaman HTML selesai dimuat
document.addEventListener('DOMContentLoaded', async () => {
    // Ambil semua elemen DOM dan simpan di objek allElements
    const elementIds = [
        // Tombol umum
        'connectButton', 'status', 'account', 'network', 'log',
        
        // Bridge
        'lockButton', 'burnButton', 'powEthBalance', 'mrtBalance', 'poaEthBalance', 'wmrtBalance',
        'lockAmountInput', 'burnAmountInput', 'ownerActionsPow', 'mintRecipientInput', 'mintAmountInput', 'mintButton',
        
        // DEX container
        'dex-pow-content', 'dex-poa-content', 'dex-disabled-msg',

        // DEX Tab Buttons (gunakan ID yang benar)
        'pow-swap-tab-btn', 'pow-liquidity-tab-btn', 'poa-swap-tab-btn', 'poa-liquidity-tab-btn',

        // DEX PoW Swap & Liquidity
        'swapEthInputPow', 'swapEthToTokenButtonPow', 'swapTokenInputPow', 'swapTokenToEthButtonPow',
        'poolEthReservePow', 'poolTokenReservePow', 'currentPricePow', 'lpBalancePow',
        'addLiqTokenInputPow', 'addLiqEthInputPow', 'addLiquidityButtonPow', 'removeLiqLpInputPow', 'removeLiquidityButtonPow',

        // DEX PoA Swap & Liquidity
        'swapEthInputPoa', 'swapEthToTokenButtonPoa', 'swapTokenInputPoa', 'swapTokenToEthButtonPoa',
        'poolEthReservePoa', 'poolTokenReservePoa', 'currentPricePoa', 'lpBalancePoa',
        'addLiqTokenInputPoa', 'addLiqEthInputPoa', 'addLiquidityButtonPoa', 'removeLiqLpInputPoa', 'removeLiquidityButtonPoa',

        // StableSwap
        'stableswap-content', 'stableswap-disabled-msg', 'poolUsdtReserve', 'poolUsdcReserve',
        'userUsdtBalance', 'userUsdcBalance', 'swapAmountA', 'swapAforBButton', 'swapAmountB',
        'swapBforAButton', 'liqAmountA', 'liqAmountB', 'addStableLiquidityButton', 
        'usdtMintButton', 'usdcMintButton', 'usdtMintRecipient', 'usdcMintRecipient', 'usdtMintAmount', 'usdcMintAmount',
        'removeStableLiquidityButton', 'removeStableLpInput', 'userStableLpBalance',

        // Transfer Panel
        'transfer-panel', 'transferRecipientInput', 'transferAmountInput', 'transferButton',
        'stablecoin-transfer-panel', 'stablecoin-transfer-token', 'stablecoin-transfer-recipient',
        'stablecoin-transfer-amount', 'stablecoinTransferButton', 'stablePrice'
        ];
    elementIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) allElements[id] = el;
    });

    // Pasang event listener utama
    if (allElements.connectButton) allElements.connectButton.onclick = connectWallet;

    // Panggil fungsi inisialisasi dari setiap modul
    initBridge();
    initDex();
    initStableSwap();
    
    // Mulai aplikasi dengan memuat konfigurasi
    await initializeApp();
});


// ==================================================================
// ||              FUNGSI INTI & MANAJEMEN WALLET                ||
// ==================================================================

export function log(message) {
    if (allElements.log) {
        const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
        console.log(`[${timestamp}] ${message}`);
        allElements.log.textContent = `[${timestamp}] ${message}\n${allElements.log.textContent}`;
    }
}

async function initializeApp() {
    try {
        log('[1/2] Memuat konfigurasi dari server...');
        const response = await fetch('/api/get-config.php');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        DAPP_CONFIG = await response.json();
        log('✅ [2/2] Konfigurasi berhasil dimuat.');

        powProvider = new ethers.providers.JsonRpcProvider(DAPP_CONFIG.POW_RPC_URL);
        poaProvider = new ethers.providers.JsonRpcProvider(DAPP_CONFIG.POA_RPC_URL);

        allElements.connectButton.disabled = false;
        allElements.connectButton.textContent = 'Hubungkan Wallet';
    } catch (error) {
        log(`❌ Gagal total memuat aplikasi: ${error.message}`);
        allElements.connectButton.disabled = true;
        allElements.connectButton.textContent = 'Gagal Memuat';
    }
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        return log('❌ Error: MetaMask (atau wallet ekstensi) tidak terinstall.');
    }
    try {
        log('⏳ Menghubungkan ke MetaMask...');
        [userAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        currentChainId = network.chainId.toString();

        initializeContracts();
        await updateUI();
        setupEventListeners();
        log('✅ Berhasil terhubung!');
    } catch (error) {
        log(`❌ Error koneksi: ${error.message}`);
    }
}

function initializeContracts() {
    // Fungsi ini mengisi semua variabel kontrak dengan instance yang terhubung ke signer
    MyTokenContract = new ethers.Contract(DAPP_CONFIG.MyTokenAddress, DAPP_CONFIG.MyTokenAbi, signer);
    BridgePoWContract = new ethers.Contract(DAPP_CONFIG.BridgePoWAddress, DAPP_CONFIG.BridgePoWAbi, signer);
    BridgePoAContract = new ethers.Contract(DAPP_CONFIG.BridgePoAAddress, DAPP_CONFIG.BridgePoAAbi, signer);
    SimpleSwapV2PowContract = new ethers.Contract(DAPP_CONFIG.SimpleSwapV2PoWAddress, DAPP_CONFIG.SimpleSwapV2Abi, signer);
    SimpleSwapV2PoaContract = new ethers.Contract(DAPP_CONFIG.SimpleSwapV2PoAAddress, DAPP_CONFIG.SimpleSwapV2Abi, signer);
    UsdtContract = new ethers.Contract(DAPP_CONFIG.UsdtPoaAddress, DAPP_CONFIG.UsdtPoaAbi, signer);
    UsdcContract = new ethers.Contract(DAPP_CONFIG.UsdcPoaAddress, DAPP_CONFIG.UsdcPoaAbi, signer);
    StableSwapContract = new ethers.Contract(DAPP_CONFIG.StableSwapPoaAddress, DAPP_CONFIG.StableSwapPoaAbi, signer);
}

export async function updateUI() {
    if (!userAddress) return;

    allElements.status.textContent = 'Terhubung';
    allElements.account.textContent = userAddress.substring(0, 6) + '...' + userAddress.substring(userAddress.length - 4);
    const networkName = currentChainId === DAPP_CONFIG.POW_CHAIN_ID ? 'PoW' : currentChainId === DAPP_CONFIG.POA_CHAIN_ID ? 'PoA' : 'Unknown';
    allElements.network.textContent = `Chain ID: ${currentChainId} (${networkName})`;

    // Cek halaman mana yang aktif dan panggil fungsi update yang sesuai dari modulnya
    if (document.getElementById('bridge-page-identifier')) { // Anda perlu menambahkan <div id="bridge-page-identifier" style="display:none"></div> di bridge.php
        await updateBridgePageUI();
    }
    if (document.getElementById('dex-page-identifier')) { // Tambahkan ID unik di dex.php
        await updateDexPageUI();
    }
    if (document.getElementById('stableswap-page-identifier')) { // Tambahkan ID unik di stableswap.php
        await updateStableSwapPageUI();
    }
}

function setupEventListeners() {
    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
}

export async function switchNetwork(chainId) {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x' + parseInt(chainId).toString(16) }],
        });
        window.location.reload();
    } catch (switchError) {
        log(`❌ Gagal switch jaringan: ${switchError.message}`);
        throw switchError;
    }
}