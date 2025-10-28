# 🧪 Blockchain Experimental Lab

Selamat datang di **Blockchain Experimental Lab**!  
Proyek ini dirancang sebagai panduan *hands-on* untuk memahami teknologi blockchain — mulai dari membuat node pribadi, menghubungkan dua jaringan (PoW & PoA), hingga membangun dan menjalankan DApp sederhana.

---

## 🚀 Langkah 1: Menjalankan Node Blockchain (PoW & PoA)

Kita akan membuat dua node Ethereum privat menggunakan **Docker Compose**.

### 📂 Struktur Direktori
```
geth-nodes/
├── genesis/
│   ├── pow.json
│   └── poa.json
├── pow-compose.yml
├── poa-compose.yml
├── pow-data/
│   └── password.txt
└── poa-data/
    └── password.txt
```

---

### ⚙️ 1. Edit File Genesis

Masuk ke folder `geth-nodes/genesis/` lalu buka file:

- `pow.json`
- `poa.json`

Ubah semua placeholder `0xALAMAT_WALLET_ANDA` menjadi alamat wallet Ethereum Anda.  
Gunakan MetaMask, Remix, atau perintah `geth account new` untuk membuat alamat baru.

---

### 🔑 2. Buat File Password

Buat file bernama `password.txt` di dalam folder:
- `pow-data/password.txt`
- `poa-data/password.txt`

Isinya cukup satu baris berupa kata sandi akun Anda (contoh: `1234password`).

> File ini digunakan agar node bisa otomatis *unlock* wallet saat dijalankan.

---

### 🧱 3. Inisialisasi Blockchain

Masuk ke folder:
```bash
cd geth-nodes
```

Jalankan perintah berikut (hanya sekali):
```bash
docker run --rm   -v $(pwd)/pow-data:/data   -v $(pwd)/genesis/pow.json:/genesis.json   ethereum/client-go:v1.11.6 --datadir /data init /genesis.json

docker run --rm   -v $(pwd)/poa-data:/data   -v $(pwd)/genesis/poa.json:/genesis.json   ethereum/client-go:v1.12.0 --datadir /data init /genesis.json
```

---

### 🧩 4. Jalankan Node dengan Docker Compose

Setelah inisialisasi selesai, jalankan kedua node dengan:

```bash
docker compose -f pow-compose.yml up -d
docker compose -f poa-compose.yml up -d
```

> **Catatan:**  
> - Node PoW akan aktif di port `8546`.  
> - Node PoA akan aktif di port `8545`.  
> - Anda dapat menyesuaikan port dan alamat wallet di masing-masing file `*-compose.yml` jika perlu.

---

## 📜 Langkah 2: Deploy Smart Contract

Gunakan **Remix IDE** untuk men-*deploy* file `.sol` dari folder `contracts/`.

1. Buka [Remix IDE](https://remix.ethereum.org) atau bisa memakai REMIX Desktop.
2. Hubungkan ke jaringan PoW atau PoA lokal Anda.
3. Deploy setiap kontrak ke jaringan yang sesuai.
4. Catat semua **alamat kontrak** yang berhasil di-deploy (akan digunakan di langkah berikutnya).

---

## 🤖 Langkah 3: Jalankan Bridge Relayer

Bridge berfungsi sebagai jembatan antara jaringan PoW dan PoA.

Masuk ke direktori:
```bash
cd bridge-relayer
```

Buat file `.env` di root proyek dan salin isi dari `.env.example`:
   ```bash
   cp .env.example .env
   ```

Sesuaikan nilai variabel di dalamnya:
   ```bash
   # URL RPC node
   POW_RPC_URL=http://192.168.1.100:8546
   POA_RPC_URL=http://192.168.1.100:8545

   # Wallet relayer
   KEYSTORE_PASSWORD=password_keystore/wallet_anda

   # Alamat kontrak bridge
   BridgePoWAddress=0xALAMAT_KONTRAK_BRIDGE_POW
   BridgePoAAddress=0xALAMAT_KONTRAK_BRIDGE_POA
   ```

Kemudian Instalasi dependensi
```bash
npm install
```

Build image relayer (sekali saja):
```bash
docker build -t bridge-relayer:latest .
```

Lalu jalankan dengan perintah:
```bash
docker run -d   --name bridge-relayer-service   --restart unless-stopped   --env-file .env   bridge-relayer:latest
```

---

## 🖥️ Langkah 4: Jalankan DApp Frontend

Frontend ini menampilkan status, transaksi, dan sinkronisasi antar blockchain.

Masuk ke folder:
```bash
cd dapp-frontend
```

Edit konfigurasi di:
```
api/get-config.php
```

ganti semua placeholdernya dengan variabel yang sesuai

### Menjalankan:
Anda bisa memilih salah satu cara:
- Jalankan langsung:  
  ```bash
  php -S 0.0.0.0:8080 -t public_html
  ```
- Atau **opsional:** gunakan **aaPanel**  
  - Buat website baru  
  - Atur *Document Root* ke folder `public_html/`

---

## ✅ Langkah 5: Verifikasi

Cek semua container aktif:
```bash
docker ps
```

Lihat log node:
```bash
docker logs pow-node --tail 20
docker logs poa-node --tail 20
```

---

## 🧠 Arsitektur Keseluruhan

```
+----------------+           +----------------+
|   Node PoW     | <--->     |   Node PoA     |
| (Geth PoW)     |           | (Geth PoA)     |
+----------------+           +----------------+
         \                         /
          \                       /
           \                     /
            +-------------------+
            |  Bridge Relayer   |
            +-------------------+
                    |
                    ↓
             DApp Frontend (Web)
```

---

## 🧩 Ringkasan Perubahan yang Perlu Dilakukan
| Bagian | File | Yang Perlu Diubah |
|--------|-------|------------------|
| Genesis Config | `genesis/pow.json`, `genesis/poa.json` | Ganti `0xALAMAT_WALLET_ANDA` |
| Password | `pow-data/password.txt`, `poa-data/password.txt` | Isi dengan password wallet |
| Compose Files | `pow-compose.yml`, `poa-compose.yml` | Pastikan alamat wallet & port sesuai |
| Relayer Config | `bridge-relayer/.env` | Isi alamat RPC, kontrak, dan sandi keystore/wallet |
| DApp Config | `api/get-config.php` | Isi alamat kontrak dan RPC publik serta alamat kontrak smart contract |

---

Dengan mengikuti langkah-langkah di atas, Anda akan memiliki dua blockchain privat (PoW dan PoA), *bridge relayer* yang menghubungkannya, serta antarmuka DApp untuk memantau dan melakukan transaksi antar jaringan 🚀
