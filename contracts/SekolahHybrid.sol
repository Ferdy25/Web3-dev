// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SekolahHybrid {
    address public admin;

    mapping(address => bool) public isGuru;
    mapping(address => bytes32) public hashSiswa;
    mapping(bytes32 => bool) public hashNilaiTersimpan;

    event GuruDitambahkan(address indexed guru);
    event SiswaHashDisimpan(address indexed siswa, bytes32 hashData);
    event NilaiHashDisimpan(bytes32 indexed idNilai, address indexed siswa);

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
        emit SiswaHashDisimpan(_alamatSiswa, _hashData);
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
}