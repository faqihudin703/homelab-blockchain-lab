<?php
// partials/header.php
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Homelab DeFi Terminal</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <?php require_once 'partials/nav.php'; ?>

    <div class="container">
        <h1>Homelab DeFi Terminal</h1>
        <button id="connectButton" disabled>Memuat Konfigurasi...</button>
        <div class="status-grid">
            <p><strong>Status:</strong></p><p><span id="status">Terputus</span></p>
            <p><strong>Akun:</strong></p><p><span id="account">N/A</span></p>
            <p><strong>Jaringan:</strong></p><p><span id="network">N/A</span></p>
        </div>
    </div>