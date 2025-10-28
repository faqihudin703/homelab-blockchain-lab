const statusEl = document.getElementById('status');
const accountEl = document.getElementById('account');
const networkEl = document.getElementById('network');
const logEl = document.getElementById('log');

// Variabel global
let DAPP_CONFIG; // Variabel untuk menampung konfigurasi dari server
let provider, signer, userAddress, currentChainId;
let powProvider, poaProvider; // Dideklarasikan di sini, diinisialisasi setelah config dimuat
let MyTokenContract, BridgePoWContract, BridgePoAContract, SimpleSwapV2PowContract, SimpleSwapV2PoaContract;
let connectButton, lockButton, burnButton;
let myTokenOwner;
let listenersAdded = false;
window.userAddress = null;
let powPool = { eth: ethers.BigNumber.from(0), token: ethers.BigNumber.from(0) };
let poaPool = { eth: ethers.BigNumber.from(0), token: ethers.BigNumber.from(0) };
let providerInstance = null;

// == FUNGSI UTAMA UNTUK INISIALISASI APLIKASI ==
async function initializeApp() {
    try {
        log('[1/2] Memuat konfigurasi dari server...');
        const response = await fetch('/api/get-config.php'); // Sesuaikan path jika perlu
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        DAPP_CONFIG = await response.json();
        log('✅ [2/2] Konfigurasi berhasil dimuat.');

        // Setelah config didapat, baru kita inisialisasi provider read-only
        powProvider = new ethers.providers.JsonRpcProvider(DAPP_CONFIG.POW_RPC_URL);
        poaProvider = new ethers.providers.JsonRpcProvider(DAPP_CONFIG.POA_RPC_URL);
        
        // Aplikasi sekarang siap dan tombol connect bisa digunakan
        connectButton.disabled = false;
        connectButton.textContent = 'Connect Wallet';
        
    } catch (error) {
        log(`❌ Gagal total memuat aplikasi: ${error.message}`);
        connectButton.disabled = true;
        connectButton.textContent = 'Gagal Memuat';
    }
}

// Event listener utama dipasang saat dokumen dimuat
document.addEventListener('DOMContentLoaded', () => {
    // Tombol yang ada di semua halaman
    connectButton = document.getElementById('connectButton');
    if (connectButton) connectButton.onclick = connectWallet;

    // Tombol-tombol Bridge (hanya ada di halaman bridge)
    lockButton = document.getElementById('lockButton');
    if (lockButton) lockButton.onclick = lockTokens;

    burnButton = document.getElementById('burnButton');
    if (burnButton) burnButton.onclick = burnTokens;

    // Tombol-tombol DEX (hanya ada di halaman dex)
    // ... (tambahkan if check untuk setiap tombol swap dan liquidity)
    const swapEthToTokenButtonPow = document.getElementById('swapEthToTokenButtonPow');
    if (swapEthToTokenButtonPow) swapEthToTokenButtonPow.onclick = swapEthToToken;
    
    const swapTokenToEthButtonPow = document.getElementById('swapTokenToEthButtonPow');
    if (swapTokenToEthButtonPow) swapTokenToEthButtonPow.onclick = swapTokenToEth;
    
    const swapEthToTokenButtonPoa = document.getElementById('swapEthToTokenButtonPoa');
    if (swapEthToTokenButtonPoa) swapEthToTokenButtonPoa.onclick = swapEthToToken;
    
    const swapTokenToEthButtonPoa = document.getElementById('swapTokenToEthButtonPoa');
    if (swapTokenToEthButtonPoa) swapTokenToEthButtonPoa.onclick = swapTokenToEth;
    
    const addLiquidityButtonPow = document.getElementById('addLiquidityButtonPow');
    if (addLiquidityButtonPow) addLiquidityButtonPow.onclick = addLiquidity;
    
    const removeLiquidityButtonPow = document.getElementById('removeLiquidityButtonPow');
    if (removeLiquidityButtonPow) removeLiquidityButtonPow.onclick = removeLiquidity;
    
    const addLiquidityButtonPoa = document.getElementById('addLiquidityButtonPoa');
    if (addLiquidityButtonPoa) addLiquidityButtonPoa.onclick = addLiquidity;
    
    const removeLiquidityButtonPoa = document.getElementById('removeLiquidityButtonPoa');
    if (removeLiquidityButtonPoa) removeLiquidityButtonPoa.onclick = removeLiquidity;
    
    const powSwapTabBtn = document.getElementById('pow-swap-tab-btn');
    if (powSwapTabBtn) powSwapTabBtn.onclick = () => showTab('pow', 'swap');

    const powLiquidityTabBtn = document.getElementById('pow-liquidity-tab-btn');
    if (powLiquidityTabBtn) powLiquidityTabBtn.onclick = () => showTab('pow', 'liquidity');

    const poaSwapTabBtn = document.getElementById('poa-swap-tab-btn');
    if (poaSwapTabBtn) poaSwapTabBtn.onclick = () => showTab('poa', 'swap');

    const poaLiquidityTabBtn = document.getElementById('poa-liquidity-tab-btn');
    if (poaLiquidityTabBtn) poaLiquidityTabBtn.onclick = () => showTab('poa', 'liquidity');
    
    const addLiqEthInputPow = document.getElementById('addLiqEthInputPow');
    if (addLiqEthInputPow) addLiqEthInputPow.oninput = () => calculateLiquidityPair('eth', 'pow');
    
    const addLiqTokenInputPow = document.getElementById('addLiqTokenInputPow');
    if (addLiqTokenInputPow) addLiqTokenInputPow.oninput = () => calculateLiquidityPair('token', 'pow');

    const addLiqEthInputPoa = document.getElementById('addLiqEthInputPoa');
    if (addLiqEthInputPoa) addLiqEthInputPoa.oninput = () => calculateLiquidityPair('eth', 'poa');

    const addLiqTokenInputPoa = document.getElementById('addLiqTokenInputPoa');
    if (addLiqTokenInputPoa) addLiqTokenInputPoa.oninput = () => calculateLiquidityPair('token', 'poa');
    
    const mintButton = document.getElementById('mintButton');
    if (mintButton) mintButton.onclick = mintTokens;
    
    const transferButton = document.getElementById('transferButton');
    if (transferButton) transferButton.onclick = transferTokens;
});

function log(message) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    console.log(`[${timestamp}] ${message}`);
    logEl.textContent = `[${timestamp}] ${message}\n${logEl.textContent}`;
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        return log('❌ Error: MetaMask (atau wallet ekstensi) tidak terinstall.');
    }
    try {
        log('⏳ Menghubungkan ke MetaMask...');
        [userAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        window.userAddress = userAddress

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        currentChainId = network.chainId.toString();

        initializeContracts();
        await checkOwnerStatus();
        await updateUI();
        setupEventListeners();
        log('✅ Berhasil terhubung!');
    } catch (error) {
        log(`❌ Error koneksi: ${error.message}`);
    }
}

function initializeContracts() {
    const { MyTokenAddress, MyTokenAbi, BridgePoWAddress, BridgePoWAbi, BridgePoAAddress, BridgePoAAbi, SimpleSwapV2PoWAddress, SimpleSwapV2PoAAddress, SimpleSwapV2Abi } = DAPP_CONFIG;
    
    MyTokenContract = new ethers.Contract(MyTokenAddress, MyTokenAbi, signer);
    BridgePoWContract = new ethers.Contract(BridgePoWAddress, BridgePoWAbi, signer);
    BridgePoAContract = new ethers.Contract(BridgePoAAddress, BridgePoAAbi, signer);
    SimpleSwapV2PowContract = new ethers.Contract(SimpleSwapV2PoWAddress, SimpleSwapV2Abi, signer);
    SimpleSwapV2PoaContract = new ethers.Contract(SimpleSwapV2PoAAddress, SimpleSwapV2Abi, signer);
}

async function checkOwnerStatus() {
    if (!MyTokenContract) return;
    try {
        myTokenOwner = await MyTokenContract.owner();
        const ownerPanel = document.getElementById('owner-actions-pow');
        if (ownerPanel) {
            // Bandingkan alamat (ubah ke huruf kecil untuk konsistensi)
            if (userAddress.toLowerCase() === myTokenOwner.toLowerCase()) {
                ownerPanel.style.display = 'block'; // Tampilkan panel
                log('ℹ️ Panel owner ditampilkan. Anda terhubung sebagai owner.');
            } else {
                ownerPanel.style.display = 'none'; // Sembunyikan panel
            }
        }
    } catch (e) {
        console.error("Gagal memeriksa status owner:", e);
    }
}

async function updateUI() {
    const { POW_CHAIN_ID, POA_CHAIN_ID } = DAPP_CONFIG;
    if (!userAddress) return;

    // Bagian ini aman, karena elemen status ada di header (selalu dimuat)
    statusEl.textContent = 'Terhubung';
    accountEl.textContent = userAddress;
    const networkName = currentChainId === POW_CHAIN_ID ? 'PoW' : currentChainId === POA_CHAIN_ID ? 'PoA' : 'Unknown';
    networkEl.textContent = `Chain ID: ${currentChainId} (${networkName})`;
    
    const isPow = currentChainId === POW_CHAIN_ID;
    const isPoa = currentChainId === POA_CHAIN_ID;
    
    // --- PERBAIKAN DIMULAI DI SINI ---

    // 1. Cek elemen-elemen Bridge sebelum memanipulasinya
    // Elemen-elemen ini hanya ada di halaman bridge.php
    if (lockButton) {
        lockButton.disabled = !isPow;
    }
    if (burnButton) {
        burnButton.disabled = !isPoa;
    }

    // 2. Cek elemen-elemen DEX sebelum memanipulasinya
    // Elemen-elemen ini hanya ada di halaman dex.php
    const dexPowContent = document.getElementById('dex-pow-content');
    const dexPoaContent = document.getElementById('dex-poa-content');
    const dexDisabledMsg = document.getElementById('dex-disabled-msg');

    if (dexPowContent && dexPoaContent && dexDisabledMsg) {
        dexPowContent.style.display = isPow ? 'block' : 'none';
        dexPoaContent.style.display = isPoa ? 'block' : 'none';
        dexDisabledMsg.style.display = (isPow || isPoa) ? 'none' : 'block';
    }
    
    const transferPanel = document.getElementById('transfer-panel');
    if (transferPanel) {
        transferPanel.style.display = (isPow || isPoa) ? 'block' : 'none';
        if (isPow) document.getElementById('transfer-title').textContent = 'Transfer MRT';
        if (isPoa) document.getElementById('transfer-title').textContent = 'Transfer wMRT';
    }
    
    // 3. Panggil fungsi pembaruan data hanya jika kita berada di halaman yang relevan
    
    // Cek apakah kita di halaman bridge dengan mencari salah satu elemen uniknya
    if (document.getElementById('lockAmountInput')) {
        await updateBalances();
    }

    // Cek apakah kita di halaman DEX dengan mencari salah satu elemen uniknya
    if (dexPowContent) { // Kita bisa gunakan variabel dari atas
        if (isPow) await updatePowPoolStatus();
        if (isPoa) await updatePoaPoolStatus();
    }
}

async function updateBalances() {
    const { MyTokenAddress, MyTokenAbi, BridgePoAAddress, BridgePoAAbi, SimpleSwapV2PoWAddress, SimpleSwapV2PoAAddress, SimpleSwapV2Abi } = DAPP_CONFIG;
    if (!userAddress) return;
    const logEl = document.getElementById('log');
    const statusLog = logEl.textContent; // Simpan log saat ini
    logEl.textContent = `[${new Date().toLocaleTimeString()}] 🔄 Memperbarui semua saldo...\n`;

    try {
        // Saldo di Jaringan PoW
        const powEth = await powProvider.getBalance(userAddress);
        document.getElementById('powEthBalance').textContent = `${parseFloat(ethers.utils.formatEther(powEth)).toFixed(4)} ETH`;
        const mrtContract = new ethers.Contract(MyTokenAddress, MyTokenAbi, powProvider);
        const mrt = await mrtContract.balanceOf(userAddress);
        document.getElementById('mrtBalance').textContent = `${parseFloat(ethers.utils.formatUnits(mrt, 18)).toFixed(2)} MRT`;
        
        // Saldo LP Token PoW
        const lpContractPow = new ethers.Contract(SimpleSwapV2PoWAddress, SimpleSwapV2Abi, powProvider);
        const lpDecimalsPow = await lpContractPow.decimals();
        const lpBalancePow = await lpContractPow.balanceOf(userAddress);
        const lpBalancePowEl = document.getElementById('lpBalancePow');
        if (lpBalancePowEl) { const formattedPow = parseFloat(ethers.utils.formatUnits(lpBalancePow, lpDecimalsPow)).toFixed(4); lpBalancePowEl.textContent = `${formattedPow} SSLP`;}

        // Saldo di Jaringan PoA
        const poaEth = await poaProvider.getBalance(userAddress);
        document.getElementById('poaEthBalance').textContent = `${parseFloat(ethers.utils.formatEther(poaEth)).toFixed(4)} ETH`;
        const wmrtContract = new ethers.Contract(BridgePoAAddress, BridgePoAAbi, poaProvider);
        const wmrt = await wmrtContract.balanceOf(userAddress);
        document.getElementById('wmrtBalance').textContent = `${parseFloat(ethers.utils.formatUnits(wmrt, 18)).toFixed(2)} wMRT`;

        // Saldo LP Token PoA
        const lpContractPoa = new ethers.Contract(SimpleSwapV2PoAAddress, SimpleSwapV2Abi, poaProvider);
        const lpDecimalsPoa = await lpContractPoa.decimals();
        const lpBalancePoa = await lpContractPoa.balanceOf(userAddress);
        const lpBalancePoaEl = document.getElementById('lpBalancePoa');
        if (lpBalancePoaEl) { const formattedPoa = parseFloat(ethers.utils.formatUnits(lpBalancePoa, lpDecimalsPoa)).toFixed(4); lpBalancePoaEl.textContent = `${formattedPoa} SSLP`;}

    } catch (e) {
        log(`❌ Gagal memperbarui saldo: ${e.message}`);
    } finally {
        // Kembalikan log sebelumnya agar pesan "updating" tidak menumpuk
        logEl.textContent += statusLog;
    }
}

async function updatePowPoolStatus() {
    const { SimpleSwapV2PoWAddress, MyTokenAddress, MyTokenAbi, SimpleSwapV2Abi } = DAPP_CONFIG;
    log('🔄 [PoW] Memperbarui status pool DEX...');
    try {
        // === Cek Cadangan Pool ===
        const ethReserve = await powProvider.getBalance(SimpleSwapV2PoWAddress);
        const tokenContract = new ethers.Contract(MyTokenAddress, MyTokenAbi, powProvider);
        const tokenReserve = await tokenContract.balanceOf(SimpleSwapV2PoWAddress);
        
        // === TAMBAHAN BARU: Simpan data mentah ===
        powPool.eth = ethReserve;
        powPool.token = tokenReserve;
        
        document.getElementById('poolEthReservePow').textContent =
            `${parseFloat(ethers.utils.formatEther(ethReserve)).toFixed(4)} ETH`;
        document.getElementById('poolTokenReservePow').textContent =
            `${parseFloat(ethers.utils.formatUnits(tokenReserve, 18)).toFixed(2)} MRT`;

        if (ethReserve > 0) {
            const price = parseFloat(ethers.utils.formatUnits(tokenReserve, 18)) /
                         parseFloat(ethers.utils.formatEther(ethReserve));
            document.getElementById('currentPricePow').textContent = `${price.toFixed(2)}`;
        } else {
            document.getElementById('currentPricePow').textContent = 'N/A';
        }

        // === Cek Saldo LP Token ===
        if (window.userAddress) {
            const lpContractPow = new ethers.Contract(SimpleSwapV2PoWAddress, SimpleSwapV2Abi, powProvider);
            const lpBalancePow = await lpContractPow.balanceOf(window.userAddress);

            document.getElementById('lpBalancePow').textContent =
                `${parseFloat(ethers.utils.formatUnits(lpBalancePow, 18)).toFixed(4)} SSLP`;
        } else {
            document.getElementById('lpBalancePow').textContent = 'N/A';
        }

    } catch (e) {
        log(`❌ [PoW] Gagal update pool: ${e.message}`);
    }
}

async function updatePoaPoolStatus() {
    const { SimpleSwapV2PoAAddress, BridgePoAAddress, BridgePoAAbi, SimpleSwapV2Abi } = DAPP_CONFIG;
    log('🔄 [PoA] Memperbarui status pool DEX...');
    try {
        // === Cek Cadangan Pool ===
        const ethReserve = await poaProvider.getBalance(SimpleSwapV2PoAAddress);
        const tokenContract = new ethers.Contract(BridgePoAAddress, BridgePoAAbi, poaProvider);
        const tokenReserve = await tokenContract.balanceOf(SimpleSwapV2PoAAddress);
        
        // === TAMBAHAN BARU: Simpan data mentah ===
        poaPool.eth = ethReserve;
        poaPool.token = tokenReserve;
        
        document.getElementById('poolEthReservePoa').textContent =
            `${parseFloat(ethers.utils.formatEther(ethReserve)).toFixed(4)} ETH`;
        document.getElementById('poolTokenReservePoa').textContent =
            `${parseFloat(ethers.utils.formatUnits(tokenReserve, 18)).toFixed(2)} wMRT`;

        if (ethReserve > 0) {
            const price = parseFloat(ethers.utils.formatUnits(tokenReserve, 18)) /
                         parseFloat(ethers.utils.formatEther(ethReserve));
            document.getElementById('currentPricePoa').textContent = `${price.toFixed(2)}`;
        } else {
            document.getElementById('currentPricePoa').textContent = 'N/A';
        }

        // === Cek Saldo LP Token ===
        if (window.userAddress) {
            const lpContractPoa = new ethers.Contract(SimpleSwapV2PoAAddress, SimpleSwapV2Abi, poaProvider);
            const lpBalancePoa = await lpContractPoa.balanceOf(window.userAddress);

            document.getElementById('lpBalancePoa').textContent =
                `${parseFloat(ethers.utils.formatUnits(lpBalancePoa, 18)).toFixed(4)} SSLP`;
        } else {
            document.getElementById('lpBalancePoa').textContent = 'N/A';
        }

    } catch (e) {
        log(`❌ [PoA] Gagal update pool: ${e.message}`);
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

function setupEventListeners() {
    // Hapus listener lama untuk menghindari duplikasi, lalu pasang yang baru
    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
    
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        log('🔌 Wallet terputus.');
        // Reset state
    } else {
        log(`🔄 Akun diganti, memuat ulang...`);
    }
    window.location.reload();
}

function handleChainChanged(_chainId) {
    log(`🔄 Jaringan diganti, memuat ulang...`);
    window.location.reload();
}

async function switchNetwork(chainId) {
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

async function lockTokens() {
    const { POW_CHAIN_ID, BridgePoWAddress } = DAPP_CONFIG;
    if (currentChainId !== POW_CHAIN_ID) {
        log('⏳ Meminta untuk pindah ke jaringan PoW...');
        await switchNetwork(POW_CHAIN_ID);
        return;
    }
    
    const amount = document.getElementById('lockAmountInput').value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah tidak valid.');
    
    try {
        lockButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);

        log(`1/2: Meminta persetujuan (approve) untuk ${amount} MRT...`);
        const approveTx = await MyTokenContract.approve(BridgePoWAddress, amountInWei);
        await approveTx.wait();
        log('    -> ✅ Approve berhasil!');

        log(`2/2: Mengunci (lock) ${amount} MRT...`);
        const lockTx = await BridgePoWContract.lock(amountInWei);
        await lockTx.wait();
        log(`[🎉] SUKSES! ${amount} MRT berhasil dikunci.`);

        await updateBalances();
    } catch (error) {
        log(`❌ Error transaksi: ${error.message}`);
    } finally {
        lockButton.disabled = false;
    }
}

async function burnTokens() {
    const { POA_CHAIN_ID } = DAPP_CONFIG;
    if (currentChainId !== POA_CHAIN_ID) {
        log('⏳ Meminta untuk pindah ke jaringan PoA...');
        await switchNetwork(POA_CHAIN_ID);
        return;
    }

    const amount = document.getElementById('burnAmountInput').value;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah tidak valid.');

    try {
        burnButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        log(`Membakar (burn) ${amount} wMRT...`);
        const burnTx = await BridgePoAContract.burn(amountInWei);
        await burnTx.wait();
        log(`[🎉] SUKSES! ${amount} wMRT berhasil dibakar. Relayer akan memproses release.`);

        await updateBalances();
    } catch (error) {
        log(`❌ Error transaksi: ${error.message}`);
    } finally {
        burnButton.disabled = false;
    }
}

// Fungsi untuk menampilkan/menyembunyikan tab Swap dan Liquidity
function showTab(network, tabName) {
    document.getElementById(`dex-${network}-swap`).style.display = 'none';
    document.getElementById(`dex-${network}-liquidity`).style.display = 'none';
    document.getElementById(`dex-${network}-${tabName}`).style.display = 'block';

    const navButtons = document.querySelectorAll(`#dex-${network}-content .nav-btn`);
    navButtons.forEach(btn => btn.classList.remove('active'));
    
    // Gunakan ID untuk mencari tombol yang benar
    const activeButton = document.getElementById(`${network}-${tabName}-tab-btn`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// === FUNGSI LIKUIDITAS PoW ===

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

async function mintTokens() {
    if (currentChainId !== DAPP_CONFIG.POW_CHAIN_ID) {
        return log('❌ Error: Aksi mint hanya bisa dilakukan di jaringan PoW.');
    }
    
    const recipient = document.getElementById('mintRecipientInput').value;
    const amount = document.getElementById('mintAmountInput').value;

    if (!ethers.utils.isAddress(recipient)) return log('❌ Error: Alamat penerima tidak valid.');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah token tidak valid.');

    try {
        const mintButton = document.getElementById('mintButton');
        mintButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);
        
        log(`⏳ Meminta untuk mint ${amount} MRT ke alamat ${recipient}...`);
        const tx = await MyTokenContract.mint(recipient, amountInWei);
        await tx.wait();
        log(`[🎉] SUKSES! Token berhasil di-mint.`);

        await updateBalances(); // Perbarui tampilan saldo
        mintButton.disabled = false;
    } catch (error) {
        log(`❌ Error saat minting: ${error.message}`);
        mintButton.disabled = false;
    }
}

async function transferTokens() {
    const { POW_CHAIN_ID, POA_CHAIN_ID } = DAPP_CONFIG;
    
    const recipient = document.getElementById('transferRecipientInput').value;
    const amount = document.getElementById('transferAmountInput').value;

    if (!ethers.utils.isAddress(recipient)) return log('❌ Error: Alamat penerima tidak valid.');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return log('❌ Error: Jumlah token tidak valid.');

    let tokenContract;
    let tokenName;

    if (currentChainId === POW_CHAIN_ID) {
        tokenContract = MyTokenContract;
        tokenName = 'MRT';
    } else if (currentChainId === POA_CHAIN_ID) {
        tokenContract = BridgePoAContract; // Ingat, BridgePoA adalah token wMRT
        tokenName = 'wMRT';
    } else {
        return log('❌ Error: Transfer hanya bisa dilakukan di jaringan PoW atau PoA.');
    }

    try {
        const transferButton = document.getElementById('transferButton');
        transferButton.disabled = true;
        const amountInWei = ethers.utils.parseUnits(amount, 18);

        log(`⏳ Mengirim ${amount} ${tokenName} ke ${recipient.substring(0,6)}...`);
        const tx = await tokenContract.transfer(recipient, amountInWei);
        await tx.wait();
        log(`[🎉] SUKSES! Transfer berhasil.`);

        await updateBalances(); // Perbarui tampilan saldo Anda dan penerima (jika ditampilkan)
        transferButton.disabled = false;
        document.getElementById('transferRecipientInput').value = "";
        document.getElementById('transferAmountInput').value = "";
    } catch (error) {
        log(`❌ Error saat transfer: ${error.message}`);
        transferButton.disabled = false;
    }
}

// Jalankan fungsi inisialisasi saat halaman selesai dimuat
window.addEventListener('load', initializeApp);