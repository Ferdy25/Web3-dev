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


const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');

const CONTRACT_ADDRESS = '0x0165878A594ca255338adfa4d48449f69242Eb8F';

const CONTRACT_ABI = [
  "function admin() view returns (address)",
  "function isGuru(address) view returns (bool)",
  "function tambahGuru(address) external",
  "function simpanHashSiswa(address, bytes32) external",
  "function softDeleteSiswa(address _alamatSiswa) external",
  "function aktifkanSiswa(address _alamatSiswa) external",
  "function isSiswaAktif(address _alamatSiswa) external view returns (bool)",
  "function simpanHashNilai(bytes32, address) external",
  "function verifikasiHashSiswa(address, bytes32) view returns (bool)",
  "function verifikasiHashNilai(bytes32) view returns (bool)",
  "function tambahInstitusi(string, string) external returns (uint256)",
  "function simpanHashGuru(address, string, string, uint256, string) external",
  "function verifikasiHashInstitusi(uint256, bytes32) view returns (bool)",
  "function verifikasiHashGuru(address, bytes32) view returns (bool)",
  "event InstitusiDitambahkan(uint256 indexed id, bytes32 hashData)",
  "event GuruHashDisimpan(address indexed guru, bytes32 hashData)",
  "event GuruDitambahkan(address indexed guru)",
  "event SiswaHashDisimpan(address indexed siswa, bytes32 hashData)",
  "event NilaiHashDisimpan(bytes32 indexed idNilai, address indexed siswa)"
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

function normalizeAddress(addr) {
  try {
    return ethers.utils.getAddress(addr);
  } catch {
    throw new Error('Format alamat Ethereum tidak valid');
  }
}


const getUserAddress = (req) => req.headers['x-user-address'];


const isAdmin = (userAddr) => {
  if (!userAddr) return false;
  return userAddr.toLowerCase() === process.env.ADMIN_ADDRESS?.toLowerCase();
};



// INSTITUSI
app.post('/api/institusi', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!isAdmin(userAddr)) return res.status(403).json({ error: 'Hanya admin' });

    const { nama, alamat } = req.body;
    const institusi = await prisma.institusi.create({ data: { nama, alamat } });

    const dataString = `${nama}:${alamat || ''}`;
    const hash = hashData(dataString);
    const signer = getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.tambahInstitusi(nama, alamat || '');
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === 'InstitusiDitambahkan');
    const institusiId = event?.args?.id.toNumber();

    res.json({ success: true, institusi, institusiId, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/institusi', async (req, res) => {
  try {
    const institusi = await prisma.institusi.findMany();
    res.json(institusi);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GURU LENGKAP
app.post('/api/guru-lengkap', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!isAdmin(userAddr)) return res.status(403).json({ error: 'Hanya admin' });

    let { alamatWallet, nip, nama, institusiId, mapel } = req.body;
    alamatWallet = normalizeAddress(alamatWallet);

    const guru = await prisma.guru.create({
      data: { alamat: alamatWallet, nip, nama, institusiId, mataPelajaran: mapel }
    });

    const mapelStr = mapel.join(',');
    const dataString = `${nip}:${nama}:${institusiId}:${mapelStr}`;
    const hash = hashData(dataString);
    const signer = getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.simpanHashGuru(alamatWallet, nip, nama, institusiId, mapelStr);
    await tx.wait();

    res.json({ success: true, guru, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/guru/:alamat', async (req, res) => {
  try {
    const alamat = normalizeAddress(req.params.alamat);
    const guru = await prisma.guru.findUnique({ where: { alamat } });
    if (!guru) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    res.json(guru);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SISWA 
app.post('/api/siswa', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!isAdmin(userAddr)) return res.status(403).json({ error: 'Hanya admin' });

    let { alamat, nis, nama, institusiId } = req.body;
    alamat = normalizeAddress(alamat);

    const siswa = await prisma.siswa.create({
      data: { alamat, nis, nama, institusiId }
    });

    const dataString = `${alamat}:${nis}:${nama}:${institusiId}`;
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

//  NILAI 
app.post('/api/nilai', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!userAddr) return res.status(400).json({ error: 'Header x-user-address diperlukan' });

    const isGuruOnChain = await contract.isGuru(userAddr);
    if (!isGuruOnChain && !isAdmin(userAddr)) {
      return res.status(403).json({ error: 'Hanya guru yang bisa input nilai' });
    }

    let { alamatSiswa, mapel, nilaiAngka } = req.body;
    alamatSiswa = normalizeAddress(alamatSiswa);

    const guru = await prisma.guru.findFirst({
      where: { alamat: { equals: userAddr, mode: 'insensitive' } }
    });
    if (!guru) return res.status(403).json({ error: 'Data guru tidak ditemukan' });

    if (!guru.mataPelajaran.includes(mapel)) {
      return res.status(403).json({ error: `Anda hanya mengajar: ${guru.mataPelajaran.join(', ')}` });
    }

    const siswa = await prisma.siswa.findUnique({ where: { alamat: alamatSiswa } });
    if (!siswa) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    if (siswa.institusiId !== guru.institusiId) {
      return res.status(403).json({ error: 'Siswa tidak berada di institusi Anda' });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const idNilai = 'nilai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    let predikat = nilaiAngka >= 90 ? 'A' : nilaiAngka >= 80 ? 'B' : nilaiAngka >= 70 ? 'C' : 'D';

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

app.patch('/api/siswa/:alamat/soft-delete', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!isAdmin(userAddr)) return res.status(403).json({ error: 'Hanya admin' });

    const alamat = normalizeAddress(req.params.alamat);
    
    // Update off-chain: set aktif = false
    const siswa = await prisma.siswa.update({
      where: { alamat },
      data: { aktif: false }
    });

    // Update on-chain
    const signer = getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.softDeleteSiswa(alamat);
    await tx.wait();

    res.json({ success: true, siswa, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/siswa/:alamat/aktifkan', async (req, res) => {
  try {
    const userAddr = getUserAddress(req);
    if (!isAdmin(userAddr)) return res.status(403).json({ error: 'Hanya admin' });

    const alamat = normalizeAddress(req.params.alamat);
    
    const siswa = await prisma.siswa.update({
      where: { alamat },
      data: { aktif: true }
    });

    const signer = getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.aktifkanSiswa(alamat);
    await tx.wait();

    res.json({ success: true, siswa, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LIHAT DATA SISWA
app.get('/api/siswa/:alamat', async (req, res) => {
  try {
    const alamat = normalizeAddress(req.params.alamat);
    const siswa = await prisma.siswa.findUnique({
      where: { alamat },
      include: { nilai: true, institusi: true }
    });
    if (!siswa) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    const dataSiswaString = `${siswa.alamat}:${siswa.nis}:${siswa.nama}:${siswa.institusiId}`;
    const hashSiswaOffchain = hashData(dataSiswaString);
    let isValidSiswa = false;
    try {
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
      return { ...n, isValid: isValidNilai };
    }));

    res.json({
      siswa: {
        alamat: siswa.alamat,
        nis: siswa.nis,
        nama: siswa.nama,
        institusi: siswa.institusi.nama,
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