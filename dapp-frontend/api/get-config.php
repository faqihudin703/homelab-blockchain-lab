<?php
// Set header agar browser tahu bahwa response ini adalah JSON.
header('Content-Type: application/json');
// Mengizinkan permintaan dari domain manapun (opsional, berguna untuk development)
// header('Access-Control-Allow-Origin: *');

// Fungsi untuk membaca file ABI dengan aman
function get_abi($filename) {
    // Path relatif dari file 'get-config.php' ke folder 'abi'
    $path = __DIR__ . '/../abi/' . $filename;
    if (!file_exists($path)) {
        // Mengembalikan null jika file tidak ditemukan
        return null; 
    }
    return json_decode(file_get_contents($path));
}

// Siapkan semua data konfigurasi dalam sebuah array PHP
$config = [
    "POW_CHAIN_ID" => "CHAIN_ID_POW_DI_SINI",
    "POA_CHAIN_ID" => "CHAIN_ID_POA_DI_SINI",
    // Anda bisa menyimpan URL RPC di sini
    // Untuk keamanan lebih, Anda bisa menyimpannya di environment variable server
    "POA_RPC_URL" => "URL_RPC_POA_DI_SINI",
    "POW_RPC_URL" => "URL_RPC_POW_DI_SINI",

    // Alamat Kontrak PoW
    "MyTokenAddress" => "ALAMAT_KONTRAK_DI_SINI5",
    "BridgePoWAddress" => "ALAMAT_KONTRAK_DI_SINI",
    "SimpleSwapV2PoWAddress" => "ALAMAT_KONTRAK_DI_SINI",
    
    // Alamat Kontrak PoA
    "BridgePoAAddress" => "ALAMAT_KONTRAK_DI_SINI",
    "SimpleSwapV2PoAAddress" => "ALAMAT_KONTRAK_DI_SINI",
    "UsdtPoaAddress" => "ALAMAT_KONTRAK_DI_SINI",
    "UsdcPoaAddress" => "ALAMAT_KONTRAK_DI_SINI",
    "StableSwapPoaAddress" => "ALAMAT_KONTRAK_DI_SINI",
    
    // Membaca dan menyertakan ABI dari file .json
    "MyTokenAbi" => get_abi('MyToken.json'),
    "BridgePoWAbi" => get_abi('BridgePoW.json'),
    "BridgePoAAbi" => get_abi('BridgePoA.json'),
    "SimpleSwapV2Abi" => get_abi('SimpleSwap.json'),
    "UsdtPoaAbi" => get_abi('TetherUSD.json'),
    "UsdcPoaAbi" => get_abi('USDollarCoin.json'),
    "StableSwapPoaAbi" => get_abi('StableSwap.json')
];

// Mengubah array PHP menjadi string JSON dan menampilkannya sebagai output
// JSON_PRETTY_PRINT membuat outputnya mudah dibaca saat diakses via browser
echo json_encode($config, JSON_PRETTY_PRINT);
?>