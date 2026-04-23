// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SekolahHybrid {
    address public admin;

    mapping(address => bool) public isGuru;
    mapping(address => bytes32) public hashSiswa;
    mapping(bytes32 => bool) public hashNilaiTersimpan;
    mapping(address => bool) public siswaAktif;

    mapping(uint256 => bytes32) public hashInstitusi; 
    mapping(address => bytes32) public hashGuru;      
    uint256 public institusiCount;

    event GuruDitambahkan(address indexed guru);
    event SiswaHashDisimpan(address indexed siswa, bytes32 hashData);
    event NilaiHashDisimpan(bytes32 indexed idNilai, address indexed siswa);
    event InstitusiDitambahkan(uint256 indexed id, bytes32 hashData);
    event GuruHashDisimpan(address indexed guru, bytes32 hashData);
    event StatusSiswaDiubah(address indexed siswa, bool aktif);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Hanya admin");
        _;
    }

    modifier onlyGuru() {
        require(isGuru[msg.sender] || msg.sender == admin, "Hanya guru/admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        isGuru[admin] = true;
    }

    function tambahGuru(address _guru) external onlyAdmin {
        require(_guru != address(0), "Alamat kosong");
        isGuru[_guru] = true;
        emit GuruDitambahkan(_guru);
    }

    function simpanHashSiswa(address _alamatSiswa, bytes32 _hashData) external onlyAdmin {
        require(_alamatSiswa != address(0), "Alamat kosong");
        hashSiswa[_alamatSiswa] = _hashData;
        siswaAktif[_alamatSiswa] = true; 
        emit SiswaHashDisimpan(_alamatSiswa, _hashData);
    }

    function softDeleteSiswa(address _alamatSiswa) external onlyAdmin {
        require(hashSiswa[_alamatSiswa] != 0, "Siswa tidak terdaftar");
        require(siswaAktif[_alamatSiswa], "Siswa sudah nonaktif");
        siswaAktif[_alamatSiswa] = false;
        emit StatusSiswaDiubah(_alamatSiswa, false);
    }

    function aktifkanSiswa(address _alamatSiswa) external onlyAdmin {
        require(hashSiswa[_alamatSiswa] != 0, "Siswa tidak terdaftar");
        require(!siswaAktif[_alamatSiswa], "Siswa sudah aktif");
        siswaAktif[_alamatSiswa] = true;
        emit StatusSiswaDiubah(_alamatSiswa, true);
    }

    function isSiswaAktif(address _alamatSiswa) external view returns (bool) {
        return siswaAktif[_alamatSiswa];
    }

    function simpanHashNilai(bytes32 _idNilai, address _alamatSiswa) external onlyGuru {
        require(!hashNilaiTersimpan[_idNilai], "Hash nilai sudah ada");
        require(hashSiswa[_alamatSiswa] != 0, "Siswa belum terdaftar");
        hashNilaiTersimpan[_idNilai] = true;
        emit NilaiHashDisimpan(_idNilai, _alamatSiswa);
    }

    function verifikasiHashSiswa(address _alamatSiswa, bytes32 _hashData) external view returns (bool) {
        return hashSiswa[_alamatSiswa] == _hashData;
    }

    function verifikasiHashNilai(bytes32 _idNilai) external view returns (bool) {
        return hashNilaiTersimpan[_idNilai];
    }

    function tambahInstitusi(string memory _nama, string memory _alamat) external onlyAdmin returns (uint256) {
        institusiCount++;
        uint256 id = institusiCount;
        bytes32 hashData = keccak256(abi.encodePacked(_nama, _alamat));
        hashInstitusi[id] = hashData;
        emit InstitusiDitambahkan(id, hashData);
        return id;
    }

    function simpanHashGuru(address _guru, string memory _nip, string memory _nama, uint256 _institusiId, string memory _mapel) external onlyAdmin {
        require(_guru != address(0), "Alamat kosong");
        bytes32 hashData = keccak256(abi.encodePacked(_nip, _nama, _institusiId, _mapel));
        hashGuru[_guru] = hashData;
        isGuru[_guru] = true; // sekaligus set sebagai guru
        emit GuruHashDisimpan(_guru, hashData);
    }

    function verifikasiHashInstitusi(uint256 _id, bytes32 _hashData) external view returns (bool) {
        return hashInstitusi[_id] == _hashData;
    }

    function verifikasiHashGuru(address _guru, bytes32 _hashData) external view returns (bool) {
        return hashGuru[_guru] == _hashData;
    }
}