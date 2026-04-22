const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ----- KONEKSI BLOCKCHAIN (ethers v5) -----
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';

// ABI lengkap (copy dari file JSON hasil compile) - PASTIKAN LENGKAP
const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function isGuru(address) view returns (bool)",
  "function tambahGuru(address) external",
  "function simpanHashSiswa(address, bytes32) external",
  "function simpanHashNilai(bytes32, address) external",
  "function verifikasiHashSiswa(address, bytes32) view returns (bool)",
  "function verifikasiHashNilai(bytes32) view returns (bool)",
  "function hashSiswa(address) view returns (bytes32)",
  "event GuruDitambahkan(address indexed)",
  "event SiswaHashDisimpan(address indexed, bytes32)",
  "event NilaiHashDisimpan(bytes32 indexed, address indexed)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

const getSigner = () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error('PRIVATE_KEY tidak di-set di .env');
  return new ethers.Wallet(privateKey, provider);
};

const hashData = (dataString) => {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataString));
};

// ----- MIDDLEWARE: Cek alamat pengirim dari header -----
const getUserAddress = (req) => {
  return req.headers['x-user-address'];
};

// ----- API ENDPOINTS -----

// 1. Tambah Guru (Admin only)
app.post('/api/guru', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!userAddr) return res.status(400).json({ error: 'Header x-user-address diperlukan' });

    const adminAddr = process.env.ADMIN_ADDRESS;
    if (userAddr.toLowerCase() !== adminAddr.toLowerCase()) {
      return res.status(403).json({ error: 'Hanya admin yang bisa menambah guru' });
    }

    const { alamat } = req.body;
    const signer = getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.tambahGuru(alamat);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Tambah Siswa (Admin only)
app.post('/api/siswa', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    const adminAddr = process.env.ADMIN_ADDRESS;
    if (userAddr.toLowerCase() !== adminAddr.toLowerCase()) {
      return res.status(403).json({ error: 'Hanya admin yang bisa menambah siswa' });
    }

    const { alamat, nis, nama } = req.body;
    const siswa = await prisma.siswa.create({ data: { alamat, nis, nama } });

    const dataString = `${alamat}:${nis}:${nama}`;
    const hash = hashData(dataString);
    const signer = getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.simpanHashSiswa(alamat, hash);
    await tx.wait();

    res.json({ success: true, siswa, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Input Nilai (Guru only)
app.post('/api/nilai', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!userAddr) return res.status(400).json({ error: 'Header x-user-address diperlukan' });

    // Cek apakah user adalah guru atau admin
    const isGuru = await contract.isGuru(userAddr);
    const adminAddr = process.env.ADMIN_ADDRESS;
    if (!isGuru && userAddr.toLowerCase() !== adminAddr.toLowerCase()) {
      return res.status(403).json({ error: 'Hanya guru yang bisa input nilai' });
    }

    const { alamatSiswa, mapel, nilaiAngka } = req.body;
    const timestamp = Math.floor(Date.now() / 1000);
    const idNilai = 'nilai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    
    let predikat;
    if (nilaiAngka >= 90) predikat = 'A';
    else if (nilaiAngka >= 80) predikat = 'B';
    else if (nilaiAngka >= 70) predikat = 'C';
    else predikat = 'D';

    const nilai = await prisma.nilai.create({
      data: { idNilai, alamatSiswa, mapel, nilaiAngka, predikat, timestamp }
    });

    const dataString = `${idNilai}:${alamatSiswa}:${mapel}:${nilaiAngka}:${timestamp}`;
    const hash = hashData(dataString);
    const signer = getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.simpanHashNilai(hash, alamatSiswa);
    await tx.wait();

    res.json({ success: true, nilai, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Lihat Data Siswa + Nilai (Publik)
app.get('/api/siswa/:alamat', async (req, res) => {
  try {
    const { alamat } = req.params;
    const siswa = await prisma.siswa.findUnique({
      where: { alamat },
      include: { nilai: true }
    });

    if (!siswa) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    // Verifikasi on-chain (dengan try-catch agar tidak error)
    let isValidSiswa = false;
    try {
      const dataSiswaString = `${siswa.alamat}:${siswa.nis}:${siswa.nama}`;
      const hashSiswaOffchain = hashData(dataSiswaString);
      isValidSiswa = await contract.verifikasiHashSiswa(alamat, hashSiswaOffchain);
    } catch (e) {
      console.warn('Verifikasi siswa on-chain gagal:', e.message);
    }

    const nilaiDenganVerifikasi = await Promise.all(siswa.nilai.map(async (n) => {
      let isValidNilai = false;
      try {
        const dataNilaiString = `${n.idNilai}:${n.alamatSiswa}:${n.mapel}:${n.nilaiAngka}:${n.timestamp}`;
        const hashNilaiOffchain = hashData(dataNilaiString);
        isValidNilai = await contract.verifikasiHashNilai(hashNilaiOffchain);
      } catch (e) {
        console.warn('Verifikasi nilai on-chain gagal:', e.message);
      }
      return {
        idNilai: n.idNilai,
        mapel: n.mapel,
        nilaiAngka: n.nilaiAngka,
        predikat: n.predikat,
        timestamp: n.timestamp,
        isValid: isValidNilai
      };
    }));

    res.json({
      siswa: {
        alamat: siswa.alamat,
        nis: siswa.nis,
        nama: siswa.nama,
        aktif: siswa.aktif,
        isValid: isValidSiswa
      },
      nilai: nilaiDenganVerifikasi
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend API berjalan di http://localhost:${PORT}`);
});