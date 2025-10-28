<?php
// index.php
require_once 'partials/header.php';

// Tentukan halaman yang akan ditampilkan, default ke 'home'
$page = $_GET['page'] ?? 'home';

// Daftar halaman yang diizinkan untuk keamanan
$allowed_pages = ['home', 'bridge', 'dex', 'stableswap'];

if (in_array($page, $allowed_pages)) {
    require_once 'pages/' . $page . '.php';
} else {
    // Jika halaman tidak ada di daftar, tampilkan halaman home
    require_once 'pages/home.php';
}

require_once 'partials/footer.php';
?>