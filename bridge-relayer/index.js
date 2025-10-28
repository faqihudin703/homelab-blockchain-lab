import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAbi(contractName) {
    try {
        const filePath = path.resolve(__dirname, 'abi', `${contractName}.json`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonContent = JSON.parse(fileContent);
        return jsonContent.abi || jsonContent;
    } catch (error) {
        console.error(`[ERROR] Gagal memuat ABI untuk ${contractName}`);
        throw error;
    }
}

async function main() {
    console.log("[*] Memulai Bridge Relayer Service (Polling Dua Arah)...");

    const powProvider = new ethers.JsonRpcProvider(process.env.POW_RPC_URL);
    const poaProvider = new ethers.JsonRpcProvider(process.env.POA_RPC_URL);
    console.log("[*] Berhasil terhubung ke provider RPC PoW dan PoA.");

    let relayerWallet;
    try {
        const encryptedJson = fs.readFileSync(path.resolve(process.env.KEYSTORE_PATH), 'utf8');
        relayerWallet = await ethers.Wallet.fromEncryptedJson(
            encryptedJson,
            process.env.KEYSTORE_PASSWORD
        );
        console.log(`[*] Wallet Relayer berhasil dimuat. Alamat: ${relayerWallet.address}`);
    } catch (error) {
        console.error("[!] Gagal memuat keystore. Pastikan path dan password di .env sudah benar.");
        process.exit(1);
    }
    
    const powSigner = relayerWallet.connect(powProvider);
    const poaSigner = relayerWallet.connect(poaProvider);

    const powBridgeContract = new ethers.Contract(process.env.POW_BRIDGE_ADDRESS, getAbi('BridgePoW'), powProvider);
    const poaBridgeContract = new ethers.Contract(process.env.POA_BRIDGE_ADDRESS, getAbi('BridgePoA'), poaProvider);
    
    const powBridgeWriter = new ethers.Contract(process.env.POW_BRIDGE_ADDRESS, getAbi('BridgePoW'), powSigner);
    const poaBridgeWriter = new ethers.Contract(process.env.POA_BRIDGE_ADDRESS, getAbi('BridgePoA'), poaSigner);
    
    console.log("\n===================================================================");
    console.log("  Bridge Relayer aktif. Melakukan polling event di kedua jaringan...");
    console.log("===================================================================\n");

    // ==================================================================
    // || LOGIKA 1: Melakukan POLLING untuk LOCK di PoW -> MINT di PoA  ||
    // ==================================================================
    let lastScannedBlock_PoW = await powProvider.getBlockNumber() - 1;
    const lockFilter = powBridgeContract.filters.TokensLocked();

    setInterval(async () => {
        try {
            const toBlock = await powProvider.getBlockNumber();
            if (toBlock <= lastScannedBlock_PoW) return;

            console.log(`(Polling PoW) Memindai event lock dari blok ${lastScannedBlock_PoW + 1} ke ${toBlock}...`);
            const events = await powBridgeContract.queryFilter(lockFilter, lastScannedBlock_PoW + 1, toBlock);

            if (events.length > 0) {
                for (const event of events) {
                    const { user, amount } = event.args;
                    console.log("\n--- ✅ Event 'TokensLocked' Ditemukan via Polling! (PoW -> PoA) ---");
                    console.log(`  - Dari Akun: ${user}`);
                    console.log(`  - Sejumlah: ${ethers.formatUnits(amount, 18)} MRT`);
                    console.log(`  - Di Blok PoW: ${event.blockNumber}`);
                    
                    console.log("\n  - ⏳ Memproses... Memanggil fungsi 'mint' di Jaringan PoA...");
                    const tx = await poaBridgeWriter.mint(user, amount);
                    console.log(`    - Transaksi Mint dikirim, hash: ${tx.hash}`);
                    const receipt = await tx.wait();
                    console.log(`    - ✅ Transaksi Mint berhasil dikonfirmasi di Blok PoA: ${receipt.blockNumber}!`);
                }
            }
            lastScannedBlock_PoW = toBlock;
        } catch (error) {
            console.error("\n  - ❌ Gagal saat melakukan polling event lock:", error.message);
        }
    }, 20000); // Lakukan polling di PoW setiap 20 detik (lebih jarang karena PoW lebih lambat)

    // ==================================================================
    // || LOGIKA 2: Melakukan POLLING untuk BURN di PoA -> RELEASE di PoW ||
    // ==================================================================
    let lastScannedBlock_PoA = await poaProvider.getBlockNumber() - 1;
    const burnFilter = poaBridgeContract.filters.Transfer(null, ethers.ZeroAddress);

    setInterval(async () => {
        try {
            const toBlock = await poaProvider.getBlockNumber();
            if (toBlock <= lastScannedBlock_PoA) return;

            console.log(`(Polling PoA) Memindai event burn dari blok ${lastScannedBlock_PoA + 1} ke ${toBlock}...`);
            const events = await poaBridgeContract.queryFilter(burnFilter, lastScannedBlock_PoA + 1, toBlock);

            if (events.length > 0) {
                for (const event of events) {
                    const { from, value } = event.args;
                    console.log("\n--- 🔥 Event 'Burn' Ditemukan via Polling! (PoA -> PoW) ---");
                    console.log(`  - Dari Akun: ${from}`);
                    console.log(`  - Sejumlah: ${ethers.formatUnits(value, 18)} wMRT`);
                    console.log(`  - Di Blok PoA: ${event.blockNumber}`);

                    console.log("\n  - ⏳ Memproses... Memanggil fungsi 'release' di Jaringan PoW...");
                    const tx = await powBridgeWriter.release(from, value);
                    console.log(`    - Transaksi Release dikirim, hash: ${tx.hash}`);
                    const receipt = await tx.wait();
                    console.log(`    - ✅ Transaksi Release berhasil dikonfirmasi di Blok PoW: ${receipt.blockNumber}!`);
                }
            }
            lastScannedBlock_PoA = toBlock;
        } catch (error) {
            console.error("\n  - ❌ Gagal saat melakukan polling event burn:", error.message);
        }
    }, 15000); // Lakukan polling di PoA setiap 15 detik
}

main().catch(error => {
    console.error("\n[!!!] Terjadi error fatal:", error);
    process.exit(1);
});